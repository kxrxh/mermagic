import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { EditorPane } from "@/components/EditorPane";
import { PreviewPane } from "@/components/PreviewPane";
import { Toolbar, type WorkspaceMode } from "@/components/Toolbar";
import {
  copyPngToClipboard,
  downloadPdf,
  downloadPng,
  downloadSvg,
} from "@/lib/export";
import {
  editFlowNode,
  type FlowGraph,
  findNodeSource,
  type SourceRange,
} from "@/lib/flowchart";
import {
  flushCurrent,
  type HistorySnapshot,
  loadHistory,
  openOrCreate,
  persistHistory,
  removeEntry,
  renameEntry,
  startNew,
  titleFromCode,
  togglePin,
  upsertCurrent,
} from "@/lib/history";
import { formatMermaidError, renderInteractiveMermaid } from "@/lib/mermaid";
import { DEFAULT_SAMPLE_ID, getSample } from "@/lib/samples";
import {
  readShareFromLocation,
  shareUrl,
  writeShareToLocation,
} from "@/lib/share";
import { DEFAULT_THEME_ID, getTheme } from "@/lib/themes";

const CODE_KEY = "mermagic:code:v2";
const THEME_KEY = "mermagic:theme";

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore quota / private mode.
  }
}

function initialEditor(): { code: string; themeId: string } {
  const shared = readShareFromLocation();
  if (shared) {
    return { code: shared.code, themeId: getTheme(shared.themeId).id };
  }
  const storedCode = readStored(CODE_KEY);
  const storedTheme = readStored(THEME_KEY);
  return {
    code: storedCode?.trim() ? storedCode : getSample(DEFAULT_SAMPLE_ID).code,
    themeId: storedTheme ? getTheme(storedTheme).id : DEFAULT_THEME_ID,
  };
}

function bootstrapApp(): {
  editor: { code: string; themeId: string };
  history: HistorySnapshot;
} {
  const editor = initialEditor();
  let snapshot = loadHistory();
  const shared = readShareFromLocation();
  const storedCode = readStored(CODE_KEY);
  if (shared && storedCode?.trim()) {
    snapshot = flushCurrent(snapshot, {
      code: storedCode,
      themeId: getTheme(readStored(THEME_KEY) ?? DEFAULT_THEME_ID).id,
    });
  }
  snapshot = persistHistory(openOrCreate(snapshot, editor));
  return { editor, history: snapshot };
}

export default function App() {
  const [boot] = useState(bootstrapApp);
  const [mode, setMode] = useState<WorkspaceMode>("split");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [editorWidth, setEditorWidth] = useState(40);
  const workspaceRef = useRef<HTMLElement>(null);
  const [{ code, themeId }, setState] = useState(boot.editor);
  const setCode = (next: string) =>
    setState((current) => ({ ...current, code: next }));
  const setThemeId = (next: string) =>
    setState((current) => ({ ...current, themeId: next }));
  const [history, setHistory] = useState(boot.history);
  const [svg, setSvg] = useState<string | null>(null);
  const [graph, setGraph] = useState<FlowGraph | null>(null);
  const [renderedCode, setRenderedCode] = useState("");
  const [sourceSelection, setSourceSelection] = useState<SourceRange | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [includeBackground, setIncludeBackground] = useState(true);
  const generation = useRef(0);
  const skipDebounce = useRef(true);
  const debounceRef = useRef(0);
  const historyRef = useRef(history);
  const stateRef = useRef({ code, themeId });
  historyRef.current = history;
  stateRef.current = { code, themeId };

  const theme = useMemo(() => getTheme(themeId), [themeId]);
  const empty = !code.trim();

  const commitHistory = (next: HistorySnapshot) => {
    const persisted = persistHistory(next);
    historyRef.current = persisted;
    setHistory(persisted);
    return persisted;
  };

  const switchTo = (next: { code: string; themeId: string }) => {
    window.clearTimeout(debounceRef.current);
    const flushed = flushCurrent(historyRef.current, stateRef.current);
    const opened = openOrCreate(flushed, next);
    commitHistory(opened);
    const editor = {
      code: next.code,
      themeId: getTheme(next.themeId).id,
    };
    stateRef.current = editor;
    setState(editor);
  };
  const switchToRef = useRef(switchTo);
  switchToRef.current = switchTo;

  useEffect(() => {
    writeStored(CODE_KEY, code);
  }, [code]);

  useEffect(() => {
    writeStored(THEME_KEY, themeId);
  }, [themeId]);

  useEffect(() => {
    writeShareToLocation({ code, themeId });
  }, [code, themeId]);

  useEffect(() => {
    if (skipDebounce.current) {
      skipDebounce.current = false;
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      const persisted = persistHistory(
        upsertCurrent(historyRef.current, { code, themeId }),
      );
      historyRef.current = persisted;
      setHistory(persisted);
    }, 1000);
    return () => window.clearTimeout(debounceRef.current);
  }, [code, themeId]);

  useEffect(() => {
    const applyHash = () => {
      const shared = readShareFromLocation();
      if (!shared) return;
      switchToRef.current({
        code: shared.code,
        themeId: getTheme(shared.themeId).id,
      });
    };
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  useEffect(() => {
    const flush = () => {
      persistHistory(flushCurrent(historyRef.current, stateRef.current));
    };
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, []);

  useEffect(() => {
    const gen = ++generation.current;

    if (!code.trim()) {
      setSvg(null);
      setGraph(null);
      setError(null);
      setRendering(false);
      return;
    }

    setRendering(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const next = await renderInteractiveMermaid(code, theme);
          if (generation.current !== gen) return;
          setSvg(next.svg);
          setGraph(next.graph);
          setRenderedCode(code);
          setError(null);
        } catch (err) {
          if (generation.current !== gen) return;
          setSvg(null);
          setGraph(null);
          setError(formatMermaidError(err));
        } finally {
          if (generation.current === gen) setRendering(false);
        }
      })();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [code, theme]);

  return (
    <div className={`app-shell ${libraryOpen ? "library-open" : ""}`}>
      <Toolbar
        documentTitle={
          history.entries.find((entry) => entry.id === history.currentId)
            ?.title ?? titleFromCode(code)
        }
        mode={mode}
        onModeChange={setMode}
        libraryOpen={libraryOpen}
        onLibraryToggle={() => setLibraryOpen((open) => !open)}
        onSampleSelect={(id) => {
          switchTo({ code: getSample(id).code, themeId });
          setLibraryOpen(false);
        }}
        history={history.entries}
        currentHistoryId={history.currentId}
        onHistoryNew={() => {
          window.clearTimeout(debounceRef.current);
          commitHistory(startNew(historyRef.current, stateRef.current));
          const editor = { ...stateRef.current, code: "" };
          stateRef.current = editor;
          setState(editor);
          setLibraryOpen(false);
          setMode("split");
          setSourceSelection(null);
        }}
        onHistoryRestore={(id) => {
          if (id === historyRef.current.currentId) return;
          const entry = historyRef.current.entries.find(
            (item) => item.id === id,
          );
          if (!entry) return;
          switchTo({ code: entry.code, themeId: entry.themeId });
          setLibraryOpen(false);
        }}
        onHistoryPin={(id) => {
          commitHistory(togglePin(historyRef.current, id));
        }}
        onHistoryRename={(id, title) => {
          commitHistory(renameEntry(historyRef.current, id, title));
        }}
        onHistoryDelete={(id) => {
          commitHistory(removeEntry(historyRef.current, id));
        }}
        canExport={!empty && Boolean(svg) && !rendering}
        includeBackground={includeBackground}
        onIncludeBackgroundChange={setIncludeBackground}
        onExportSvg={() => {
          if (svg) downloadSvg(svg, includeBackground ? theme : null);
        }}
        onExportPng={() => {
          if (svg) void downloadPng(svg, includeBackground ? theme : null);
        }}
        onExportPdf={() => {
          if (svg) void downloadPdf(svg, includeBackground ? theme : null);
        }}
        onCopyPng={async () => {
          if (svg) {
            await copyPngToClipboard(svg, includeBackground ? theme : null);
          }
        }}
        canShare={!empty}
        onShare={async () => {
          const state = { code, themeId };
          writeShareToLocation(state);
          await navigator.clipboard.writeText(shareUrl(state));
        }}
      />
      {libraryOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close diagram library"
          onClick={() => setLibraryOpen(false)}
        />
      ) : null}
      <main
        ref={workspaceRef}
        className={`workspace mode-${mode}`}
        style={{ "--editor-width": `${editorWidth}%` } as CSSProperties}
      >
        <EditorPane
          code={code}
          error={empty ? null : error}
          onChange={setCode}
          sourceSelection={sourceSelection}
        />
        {/* biome-ignore lint/a11y/useSemanticElements: A focusable ARIA separator supports resizing and contains a visual handle. */}
        <div
          className="pane-resizer"
          role="separator"
          aria-label="Resize source panel"
          aria-orientation="vertical"
          aria-valuemin={25}
          aria-valuemax={65}
          aria-valuenow={editorWidth}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              setEditorWidth((width) =>
                Math.min(
                  65,
                  Math.max(25, width + (event.key === "ArrowLeft" ? -2 : 2)),
                ),
              );
            }
          }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
            const bounds = workspaceRef.current?.getBoundingClientRect();
            if (bounds)
              setEditorWidth(
                Math.min(
                  65,
                  Math.max(
                    25,
                    ((event.clientX - bounds.left) / bounds.width) * 100,
                  ),
                ),
              );
          }}
          onPointerUp={(event) =>
            event.currentTarget.releasePointerCapture(event.pointerId)
          }
        >
          <span />
        </div>
        <PreviewPane
          themeId={theme.id}
          onThemeChange={setThemeId}
          key={history.currentId}
          svg={empty ? null : svg}
          background={theme.background}
          rendering={!empty && rendering}
          empty={empty}
          graph={graph}
          code={code}
          interactive={!rendering && code === renderedCode && !error}
          onSelectNode={(id) => setSourceSelection(findNodeSource(code, id))}
          onEditNode={(id, patch) => setCode(editFlowNode(code, id, patch))}
        />
      </main>
      <footer className="app-statusbar">
        <span>
          <span className={`status-dot ${error ? "error" : ""}`} />
          {empty
            ? "Ready when you are"
            : rendering
              ? "Rendering diagram…"
              : error
                ? "Check your syntax"
                : "All changes saved locally"}
        </span>
        <span>
          Made for a clearer picture.
          <span className="statusbar-separator">/</span>Mermaid v11
        </span>
      </footer>
    </div>
  );
}
