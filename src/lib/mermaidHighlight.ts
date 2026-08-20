import {
  foldService,
  HighlightStyle,
  StreamLanguage,
  syntaxHighlighting,
} from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

const DIAGRAM_TYPES = new Set([
  "architecture-beta",
  "block-beta",
  "C4Context",
  "C4Container",
  "C4Component",
  "classDiagram",
  "erDiagram",
  "flowchart",
  "gantt",
  "gitGraph",
  "graph",
  "journey",
  "kanban",
  "mindmap",
  "packet-beta",
  "pie",
  "quadrantChart",
  "radar-beta",
  "requirementDiagram",
  "sankey-beta",
  "sequenceDiagram",
  "stateDiagram",
  "stateDiagram-v2",
  "timeline",
  "treemap-beta",
  "xychart-beta",
]);

const KEYWORDS = new Set([
  "TB",
  "BT",
  "LR",
  "RL",
  "TD",
  "accDescr",
  "accTitle",
  "activate",
  "actor",
  "alt",
  "and",
  "as",
  "autonumber",
  "break",
  "class",
  "classDef",
  "click",
  "critical",
  "dateFormat",
  "deactivate",
  "direction",
  "namespace",
  "else",
  "end",
  "left",
  "linkStyle",
  "loop",
  "note",
  "of",
  "opt",
  "option",
  "over",
  "PK",
  "FK",
  "UK",
  "par",
  "participant",
  "rect",
  "right",
  "section",
  "showData",
  "style",
  "subgraph",
  "title",
]);

const ARROW =
  /^(?:\|\|--o\{|\|\|--\|\{|\|\|--\|\||\}o--o\{|\}o--\||o\{--|->>|-->>|-->|---|-\.->|==>|<-->|<--|o--o|\*--|x--x|--x|-x|~~>)/;

type MermaidStreamState = {
  frontmatter: boolean;
};

const mermaidLanguage = StreamLanguage.define<MermaidStreamState>({
  startState() {
    return { frontmatter: false };
  },
  token(stream, state) {
    if (stream.sol() && stream.match(/^---\s*$/)) {
      state.frontmatter = !state.frontmatter;
      return "meta";
    }

    if (stream.eatSpace()) return null;

    if (stream.match("%%")) {
      stream.skipToEnd();
      return "comment";
    }

    if (state.frontmatter) {
      if (stream.match(/^[\w-]+(?=\s*:)/)) return "attributeName";
      if (stream.match(/^:\s*/)) return "punctuation";
      stream.skipToEnd();
      return "string";
    }

    if (
      stream.match(/^"(?:[^"\\]|\\.)*"/) ||
      stream.match(/^'(?:[^'\\]|\\.)*'/)
    ) {
      return "string";
    }

    if (stream.match(/^<<[^>]*>>/)) return "meta";

    if (
      stream.match(/^\[(?:\([^)]*\)|[^\]]*)\]/) ||
      stream.match(/^\(\([^)]*\)\)/) ||
      stream.match(/^\([^)]*\)/) ||
      stream.match(/^\{\{[^}]*\}\}/) ||
      stream.match(/^\{[^}]*\}/)
    ) {
      return "string";
    }

    if (stream.match(ARROW)) return "operator";

    if (stream.match(/^[[\](){}<>|]/)) return "punctuation";

    if (stream.match(/^\d+(?:\.\d+)?/)) return "number";

    if (stream.match(/^[\w.-]+/)) {
      const word = stream.current();
      if (DIAGRAM_TYPES.has(word)) return "typeName";
      if (KEYWORDS.has(word)) return "keyword";
      return "variableName";
    }

    stream.next();
    return null;
  },
});

const mermaidHighlightStyle = HighlightStyle.define([
  { tag: t.typeName, color: "#22d3ee", fontWeight: "600" },
  { tag: t.keyword, color: "#818cf8" },
  { tag: t.variableName, color: "#e4e4e7" },
  { tag: t.string, color: "#67e8f9" },
  { tag: t.operator, color: "#c084fc" },
  { tag: t.number, color: "#a1a1aa" },
  { tag: t.comment, color: "#52525b", fontStyle: "italic" },
  { tag: t.meta, color: "#22d3ee" },
  { tag: t.attributeName, color: "#818cf8" },
  { tag: t.punctuation, color: "#71717a" },
]);

function leadingIndent(text: string) {
  let count = 0;
  for (const char of text) {
    if (char === " ") count += 1;
    else if (char === "\t") count += 4;
    else break;
  }
  return count;
}

function foldByIndent() {
  return foldService.of((state, lineStart, lineEnd) => {
    const line = state.doc.lineAt(lineStart);
    const indent = leadingIndent(line.text);
    let foldEnd = lineEnd;
    let nextNumber = line.number + 1;

    while (nextNumber <= state.doc.lines) {
      const next = state.doc.line(nextNumber);
      if (!/^[ \t]*$/.test(next.text)) {
        if (leadingIndent(next.text) <= indent) break;
        foldEnd = next.to;
      }
      nextNumber += 1;
    }

    if (
      state.doc.lineAt(lineStart).number === state.doc.lineAt(foldEnd).number
    ) {
      return null;
    }
    return { from: lineEnd, to: foldEnd };
  });
}

export const mermaidHighlightExtensions = [
  mermaidLanguage,
  syntaxHighlighting(mermaidHighlightStyle),
  foldByIndent(),
];
