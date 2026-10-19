import { redo, redoDepth, undo, undoDepth } from "@codemirror/commands";
import { EditorView, type ViewUpdate } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Icon } from "@/components/Icon";
import { isolateExternalHistory } from "@/lib/editorHistory";
import { editorTheme } from "@/lib/editorTheme";
import type { SourceRange } from "@/lib/flowchart";
import { mermaidCompleteExtensions } from "@/lib/mermaidComplete";
import { mermaidHighlightExtensions } from "@/lib/mermaidHighlight";
import { mermaidLintExtensions } from "@/lib/mermaidLint";

type EditorPaneProps = {
  code: string;
  error: string | null;
  onChange: (value: string) => void;
  sourceSelection: SourceRange | null;
};

const editorExtensions = [
  ...mermaidHighlightExtensions,
  ...mermaidLintExtensions,
  ...mermaidCompleteExtensions,
  EditorView.lineWrapping,
  isolateExternalHistory,
];

export function EditorPane({
  code,
  error,
  onChange,
  sourceSelection,
}: EditorPaneProps) {
  const viewRef = useRef<EditorView | null>(null);
  const [history, setHistory] = useState({ undo: false, redo: false });
  const updateHistory = useCallback(({ state }: ViewUpdate) => {
    const next = { undo: undoDepth(state) > 0, redo: redoDepth(state) > 0 };
    setHistory((current) =>
      current.undo === next.undo && current.redo === next.redo ? current : next,
    );
  }, []);

  function runHistoryCommand(command: typeof undo) {
    const view = viewRef.current;
    if (!view) return;
    command(view);
    view.focus();
  }

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !sourceSelection) return;
    const { from, to } = sourceSelection;
    if (to > view.state.doc.length) return;
    view.dispatch({
      selection: { anchor: from, head: to },
      effects: EditorView.scrollIntoView(from, { y: "center" }),
    });
  }, [sourceSelection]);
  return (
    <section className="editor-pane" aria-label="Mermaid source editor">
      <div className="pane-header">
        <div className="pane-title">
          <Icon name="code" />
          <span>Source</span>
        </div>
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            title="Undo (⌘/Ctrl+Z)"
            aria-keyshortcuts="Control+Z Meta+Z"
            disabled={!history.undo}
            onClick={() => runHistoryCommand(undo)}
            className="shrink-0 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-white/10 hover:text-zinc-100 focus-visible:outline-zinc-300 disabled:pointer-events-none disabled:opacity-35"
          >
            Undo
          </button>
          <button
            type="button"
            title="Redo (⌘+Shift+Z / Ctrl+Y)"
            aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
            disabled={!history.redo}
            onClick={() => runHistoryCommand(redo)}
            className="shrink-0 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-white/10 hover:text-zinc-100 focus-visible:outline-zinc-300 disabled:pointer-events-none disabled:opacity-35"
          >
            Redo
          </button>
          <span className="file-badge truncate">diagram.mmd</span>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <CodeMirror
          value={code}
          height="100%"
          theme={editorTheme}
          extensions={editorExtensions}
          onChange={onChange}
          onUpdate={updateHistory}
          onCreateEditor={(view) => {
            viewRef.current = view;
          }}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            autocompletion: false,
            syntaxHighlighting: false,
          }}
        />
      </div>
      {error ? <ErrorBanner message={error} /> : null}
      <div className="editor-footer">
        <span>
          <span className={`status-dot ${error ? "error" : ""}`} />
          {error ? "Syntax error" : "Mermaid"}
        </span>
        <span>
          {code.split("\n").length} lines
          <span className="statusbar-separator">·</span>UTF-8
        </span>
      </div>
    </section>
  );
}
