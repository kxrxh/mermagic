import { EditorView } from "@codemirror/view";

export const editorTheme = EditorView.theme(
  {
    "&": {
      color: "#e4e4e7",
      backgroundColor: "#0c0e12",
      height: "100%",
    },
    ".cm-content": {
      caretColor: "#22d3ee",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#22d3ee",
    },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "rgba(34, 211, 238, 0.18)",
      },
    ".cm-panels": {
      backgroundColor: "#0d0f14",
      color: "#e4e4e7",
    },
    ".cm-panels.cm-panels-top": {
      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    },
    ".cm-panels.cm-panels-bottom": {
      borderTop: "1px solid rgba(255, 255, 255, 0.1)",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(255, 255, 255, 0.03)",
    },
    ".cm-selectionMatch": {
      backgroundColor: "rgba(34, 211, 238, 0.12)",
    },
    "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
      backgroundColor: "rgba(129, 140, 248, 0.22)",
    },
    ".cm-gutters": {
      backgroundColor: "#0c0e12",
      color: "#52525b",
      border: "none",
    },
    ".cm-gutterElement": {
      color: "#52525b",
    },
    ".cm-gutter-lint": {
      width: "14px",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(255, 255, 255, 0.03)",
      color: "#a1a1aa",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "transparent",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      color: "#71717a",
    },
    ".cm-scroller": {
      fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
      lineHeight: "1.55",
    },
    ".cm-lintRange-error": {
      backgroundColor: "rgba(251, 113, 133, 0.12)",
    },
    ".cm-tooltip": {
      backgroundColor: "#161922",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      color: "#e4e4e7",
    },
    ".cm-tooltip .cm-tooltip-arrow:before": {
      borderTopColor: "transparent",
      borderBottomColor: "transparent",
    },
    ".cm-tooltip .cm-tooltip-arrow:after": {
      borderTopColor: "#161922",
      borderBottomColor: "#161922",
    },
    ".cm-tooltip.cm-tooltip-lint": {
      backgroundColor: "#1c1216",
      border: "1px solid rgba(251, 113, 133, 0.35)",
      color: "#fecdd3",
      fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
      fontSize: "11px",
      maxWidth: "360px",
      padding: "6px 8px",
    },
  },
  { dark: true },
);
