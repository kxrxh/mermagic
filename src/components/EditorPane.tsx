import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { ErrorBanner } from "@/components/ErrorBanner";
import { editorTheme } from "@/lib/editorTheme";
import { mermaidHighlightExtensions } from "@/lib/mermaidHighlight";
import { mermaidLintExtensions } from "@/lib/mermaidLint";

type EditorPaneProps = {
  code: string;
  error: string | null;
  onChange: (value: string) => void;
};

const editorExtensions = [
  ...mermaidHighlightExtensions,
  ...mermaidLintExtensions,
  EditorView.lineWrapping,
];

export function EditorPane({ code, error, onChange }: EditorPaneProps) {
  return (
    <section className="flex min-h-0 min-w-0 flex-col border-r border-white/10">
      <div className="flex h-8 items-center border-b border-white/10 px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
        Source
      </div>
      <div className="min-h-0 flex-1">
        <CodeMirror
          value={code}
          height="100%"
          theme={editorTheme}
          extensions={editorExtensions}
          onChange={onChange}
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
    </section>
  );
}
