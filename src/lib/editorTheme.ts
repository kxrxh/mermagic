import { EditorView } from "@codemirror/view";

export const editorTheme = EditorView.theme(
  {
    "&": {
      color: "#e4e4e7",
      backgroundColor: "#18191b",
      height: "100%",
    },
    ".cm-content": {
      caretColor: "#d4ee9f",
      padding: "20px 0",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#d4ee9f",
    },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "rgba(212, 238, 159, 0.18)",
      },
    ".cm-panels": {
      backgroundColor: "#1d1e20",
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
      backgroundColor: "rgba(212, 238, 159, 0.12)",
    },
    "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
      backgroundColor: "rgba(129, 140, 248, 0.22)",
    },
    ".cm-gutters": {
      backgroundColor: "#18191b",
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
      lineHeight: "1.9",
    },
    ".cm-lintRange-error": {
      backgroundColor: "rgba(251, 113, 133, 0.12)",
    },
    ".cm-tooltip": {
      backgroundColor: "#222325",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      color: "#e4e4e7",
    },
    ".cm-tooltip .cm-tooltip-arrow:before": {
      borderTopColor: "transparent",
      borderBottomColor: "transparent",
    },
    ".cm-tooltip .cm-tooltip-arrow:after": {
      borderTopColor: "#222325",
      borderBottomColor: "#222325",
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
        backgroundColor: "rgba(212, 238, 159, 0.16)",
        color: "#e4e4e7",
      },
    },
    ".cm-tooltip.cm-completionInfo": {
      backgroundColor: "#222325",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      color: "#a1a1aa",
      fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
      fontSize: "11px",
      maxWidth: "280px",
    },
    ".cm-completionMatchedText": {
      color: "#d4ee9f",
      textDecoration: "none",
      fontWeight: "600",
    },
    ".cm-completionDetail": {
      color: "#71717a",
      fontStyle: "normal",
      marginLeft: "0.6em",
    },
    ".cm-completionIcon": {
      color: "#52525b",
      width: "1.2em",
    },
    ".cm-completionIcon-type": {
      color: "#d4ee9f",
    },
    ".cm-completionIcon-keyword": {
      color: "#818cf8",
    },
    ".cm-completionIcon-function": {
      color: "#c084fc",
    },
    ".cm-completionIcon-variable": {
      color: "#67e8f9",
    },
  },
  { dark: true },
);
