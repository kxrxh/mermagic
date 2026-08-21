import { useEffect, useMemo, useRef, useState } from "react";
import { EditorPane } from "@/components/EditorPane";
import { PreviewPane } from "@/components/PreviewPane";
import { Toolbar } from "@/components/Toolbar";
import {
  copyPngToClipboard,
  downloadPdf,
  downloadPng,
  downloadSvg,
} from "@/lib/export";
import { formatMermaidError, renderMermaid } from "@/lib/mermaid";
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

function initialState(): { code: string; themeId: string } {
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

export default function App() {
  const [{ code, themeId }, setState] = useState(initialState);
  const setCode = (next: string) =>
    setState((current) => ({ ...current, code: next }));
  const setThemeId = (next: string) =>
    setState((current) => ({ ...current, themeId: next }));
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [includeBackground, setIncludeBackground] = useState(true);
  const generation = useRef(0);

  const theme = useMemo(() => getTheme(themeId), [themeId]);
  const empty = !code.trim();

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
    const applyHash = () => {
      const shared = readShareFromLocation();
      if (!shared) return;
      setState({
        code: shared.code,
        themeId: getTheme(shared.themeId).id,
      });
    };
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  useEffect(() => {
    const gen = ++generation.current;

    if (!code.trim()) {
      setSvg(null);
      setError(null);
      setRendering(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setRendering(true);
      void (async () => {
        try {
          const next = await renderMermaid(code, theme);
          if (generation.current !== gen) return;
          setSvg(next);
          setError(null);
        } catch (err) {
          if (generation.current !== gen) return;
          setSvg(null);
          setError(formatMermaidError(err));
        } finally {
          if (generation.current === gen) setRendering(false);
        }
      })();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [code, theme]);

  return (
    <div className="flex h-dvh flex-col bg-[#0c0e12] text-zinc-200">
      <Toolbar
        themeId={theme.id}
        onThemeChange={setThemeId}
        onSampleSelect={(id) => setCode(getSample(id).code)}
        canExport={!empty && Boolean(svg)}
        includeBackground={includeBackground}
        onIncludeBackgroundChange={setIncludeBackground}
        onExportSvg={() => {
          if (svg)
            downloadSvg(svg, includeBackground ? theme.background : null);
        }}
        onExportPng={() => {
          if (svg)
            void downloadPng(svg, includeBackground ? theme.background : null);
        }}
        onExportPdf={() => {
          if (svg)
            void downloadPdf(svg, includeBackground ? theme.background : null);
        }}
        onCopyPng={async () => {
          if (svg) {
            await copyPngToClipboard(
              svg,
              includeBackground ? theme.background : null,
            );
          }
        }}
        canShare={!empty}
        onShare={async () => {
          const state = { code, themeId };
          writeShareToLocation(state);
          await navigator.clipboard.writeText(shareUrl(state));
        }}
      />
      <main className="grid min-h-0 flex-1 grid-cols-2">
        <EditorPane
          code={code}
          error={empty ? null : error}
          onChange={setCode}
        />
        <PreviewPane
          svg={empty ? null : svg}
          background={theme.background}
          rendering={!empty && rendering}
          empty={empty}
        />
      </main>
    </div>
  );
}
