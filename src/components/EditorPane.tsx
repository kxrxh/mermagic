import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useRef } from "react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Icon } from "@/components/Icon";
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
];

export function EditorPane({
  code,
  error,
  onChange,
  sourceSelection,
}: EditorPaneProps) {
  const viewRef = useRef<EditorView | null>(null);
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
        <span className="file-badge">diagram.mmd</span>
      </div>
      <div className="min-h-0 flex-1">
        <CodeMirror
          value={code}
          height="100%"
          theme={editorTheme}
          extensions={editorExtensions}
          onChange={onChange}
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
