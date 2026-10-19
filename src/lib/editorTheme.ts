import { EditorView } from "@codemirror/view";

export const editorTheme = EditorView.theme(
  {
    "&": {
      color: "var(--text)",
      backgroundColor: "#151619",
      height: "100%",
    },
    ".cm-content": {
      caretColor: "var(--accent)",
      padding: "20px 0",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--accent)",
    },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "rgba(164, 178, 199, 0.24)",
      },
    ".cm-panels": {
      backgroundColor: "var(--surface-raised)",
      color: "var(--text)",
    },
    ".cm-panels.cm-panels-top": {
      borderBottom: "1px solid var(--border)",
    },
    ".cm-panels.cm-panels-bottom": {
      borderTop: "1px solid var(--border)",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(255, 255, 255, 0.03)",
    },
    ".cm-selectionMatch": {
      backgroundColor: "rgba(164, 178, 199, 0.14)",
    },
    "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
      backgroundColor: "rgba(189, 183, 216, 0.18)",
    },
    ".cm-gutters": {
      backgroundColor: "#151619",
      color: "#7e8490",
      border: "none",
    },
    ".cm-gutterElement": {
      color: "#7e8490",
    },
    ".cm-gutter-lint": {
      width: "14px",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(255, 255, 255, 0.03)",
      color: "#b4bac5",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "transparent",
      border: "1px solid var(--border)",
      color: "#949ba8",
    },
    ".cm-scroller": {
      fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
      lineHeight: "1.9",
    },
    ".cm-lintRange-error": {
      backgroundColor: "rgba(251, 113, 133, 0.12)",
    },
    ".cm-tooltip": {
      backgroundColor: "#1b1d21",
      border: "1px solid var(--border)",
      color: "var(--text)",
    },
    ".cm-tooltip .cm-tooltip-arrow:before": {
      borderTopColor: "transparent",
      borderBottomColor: "transparent",
    },
    ".cm-tooltip .cm-tooltip-arrow:after": {
      borderTopColor: "#1b1d21",
      borderBottomColor: "#1b1d21",
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
    ".cm-tooltip-autocomplete": {
      "& > ul": {
        fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
        fontSize: "12px",
        maxHeight: "16em",
      },
      "& > ul > li": {
        padding: "2px 8px",
        lineHeight: "1.45",
      },
      "& > ul > li[aria-selected]": {
        backgroundColor: "rgba(164, 178, 199, 0.2)",
        color: "var(--text)",
      },
    },
    ".cm-tooltip.cm-completionInfo": {
      backgroundColor: "#1b1d21",
      border: "1px solid var(--border)",
      color: "var(--muted)",
      fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
      fontSize: "11px",
      maxWidth: "280px",
    },
    ".cm-completionMatchedText": {
      color: "var(--accent)",
      textDecoration: "none",
      fontWeight: "600",
    },
    ".cm-completionDetail": {
      color: "#949ba8",
      fontStyle: "normal",
      marginLeft: "0.6em",
    },
    ".cm-completionIcon": {
      color: "#7e8490",
      width: "1.2em",
    },
    ".cm-completionIcon-type": {
      color: "#b6c5dd",
    },
    ".cm-completionIcon-keyword": {
      color: "#bdb7d8",
    },
    ".cm-completionIcon-function": {
      color: "#cbb9d3",
    },
    ".cm-completionIcon-variable": {
      color: "#d4c3ad",
    },
  },
  { dark: true },
);
