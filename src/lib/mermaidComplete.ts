import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
  snippetCompletion,
} from "@codemirror/autocomplete";
import type { Text } from "@codemirror/state";

type DiagramKind =
  | "flowchart"
  | "sequence"
  | "class"
  | "er"
  | "state"
  | "gantt"
  | "git"
  | "pie"
  | "journey"
  | "mindmap"
  | "timeline"
  | "kanban"
  | "c4"
  | "requirement"
  | "sankey"
  | "quadrant"
  | "xychart"
  | "architecture"
  | "block"
  | "packet"
  | "radar"
  | "treemap"
  | "unknown";

type Place =
  | { at: "frontmatter" }
  | { at: "comment" }
  | { at: "label" }
  | { at: "diagramType"; starter: boolean }
  | { at: "direction"; kind: DiagramKind }
  | { at: "body"; kind: DiagramKind };

const WORD = /[A-Za-z_][\w-]*/;
const ARROW = /[-.=<>|~]+/;

function kw(label: string, detail?: string, boost = 0): Completion {
  return { label, type: "keyword", detail, boost };
}

function expandSnippet(template: string) {
  return template.replace(/@(\w*)/g, (_, name: string) =>
    ["$", "{", name, "}"].join(""),
  );
}

function snippet(label: string, template: string, detail: string): Completion {
  return snippetCompletion(expandSnippet(template), {
    label,
    detail,
    type: "function",
  });
}

function arrows(entries: Array<[string, string]>): Completion[] {
  return entries.map(([label, detail]) => ({
    label,
    detail,
    type: "keyword",
    boost: 4,
  }));
}

const DIAGRAM_TYPES: Array<{
  label: string;
  detail: string;
  kind: DiagramKind;
  snippet: string;
  boost: number;
}> = [
  {
    label: "flowchart",
    detail: "Flowchart",
    kind: "flowchart",
    snippet: "flowchart LR\n  @A[@label] --> @B[@label]",
    boost: 10,
  },
  {
    label: "graph",
    detail: "Flowchart (legacy)",
    kind: "flowchart",
    snippet: "graph LR\n  @A[@label] --> @B[@label]",
    boost: 1,
  },
  {
    label: "sequenceDiagram",
    detail: "Sequence",
    kind: "sequence",
    snippet:
      "sequenceDiagram\n  actor @User\n  participant @Sys as @System\n  @User->>@Sys: @message",
    boost: 9,
  },
  {
    label: "classDiagram",
    detail: "Class",
    kind: "class",
    snippet: "classDiagram\n  class @Name {\n    +@type @field\n  }",
    boost: 7,
  },
  {
    label: "erDiagram",
    detail: "Entity relationship",
    kind: "er",
    snippet: "erDiagram\n  @ENTITY {\n    @type @field PK\n  }",
    boost: 7,
  },
  {
    label: "stateDiagram-v2",
    detail: "State",
    kind: "state",
    snippet: "stateDiagram-v2\n  [*] --> @State\n  @State --> [*]",
    boost: 6,
  },
  {
    label: "stateDiagram",
    detail: "State (v1)",
    kind: "state",
    snippet: "stateDiagram\n  [*] --> @State",
    boost: 1,
  },
  {
    label: "gantt",
    detail: "Gantt",
    kind: "gantt",
    snippet:
      "gantt\n  title @title\n  dateFormat YYYY-MM-DD\n  section @section\n  @task :a1, @date, 7d",
    boost: 5,
  },
  {
    label: "gitGraph",
    detail: "Git graph",
    kind: "git",
    snippet:
      'gitGraph\n  commit id: "@main"\n  branch @dev\n  checkout @dev\n  commit',
    boost: 4,
  },
  {
    label: "pie",
    detail: "Pie chart",
    kind: "pie",
    snippet: 'pie title @title\n  "@slice" : @n\n  "@other" : @m',
    boost: 4,
  },
  {
    label: "journey",
    detail: "User journey",
    kind: "journey",
    snippet:
      "journey\n  title @title\n  section @section\n    @step: @score: @Actor",
    boost: 3,
  },
  {
    label: "mindmap",
    detail: "Mind map",
    kind: "mindmap",
    snippet: "mindmap\n  root((@title))\n    @branch\n      @leaf",
    boost: 4,
  },
  {
    label: "timeline",
    detail: "Timeline",
    kind: "timeline",
    snippet:
      "timeline\n  title @title\n  section @section\n    @event : @detail",
    boost: 3,
  },
  {
    label: "kanban",
    detail: "Kanban",
    kind: "kanban",
    snippet: "kanban\n  @Todo\n    @task\n  @Done",
    boost: 3,
  },
  {
    label: "quadrantChart",
    detail: "Quadrant",
    kind: "quadrant",
    snippet:
      "quadrantChart\n  title @title\n  x-axis @low --> @high\n  y-axis @low --> @high\n  @item: [@x, @y]",
    boost: 3,
  },
  {
    label: "xychart-beta",
    detail: "XY chart",
    kind: "xychart",
    snippet:
      'xychart-beta\n  title @title\n  x-axis [@a, @b, @c]\n  y-axis "@label" @min --> @max\n  bar [@n, @m, @p]',
    boost: 3,
  },
  {
    label: "requirementDiagram",
    detail: "Requirements",
    kind: "requirement",
    snippet:
      "requirementDiagram\n  requirement @REQ {\n    id: @id\n    text: @text\n    risk: @medium\n  }",
    boost: 2,
  },
  {
    label: "sankey-beta",
    detail: "Sankey",
    kind: "sankey",
    snippet: "sankey-beta\n  @Source,@Target,@n",
    boost: 2,
  },
  {
    label: "architecture-beta",
    detail: "Architecture",
    kind: "architecture",
    snippet:
      "architecture-beta\n  group @api(cloud)[@API]\n  service @db(database)[@Database] in @api",
    boost: 4,
  },
  {
    label: "block-beta",
    detail: "Block",
    kind: "block",
    snippet: "block-beta\n  columns 1\n  @A[@label]\n  @B[@label]",
    boost: 3,
  },
  {
    label: "packet-beta",
    detail: "Packet",
    kind: "packet",
    snippet: 'packet-beta\n  0-15: "@field"\n  16-31: "@field"',
    boost: 2,
  },
  {
    label: "radar-beta",
    detail: "Radar",
    kind: "radar",
    snippet:
      "radar-beta\n  title @title\n  axis @A, @B, @C\n  curve @series{@n, @m, @p}",
    boost: 2,
  },
  {
    label: "treemap-beta",
    detail: "Treemap",
    kind: "treemap",
    snippet: 'treemap-beta\n  title @title\n  "@leaf" : @n',
    boost: 2,
  },
  {
    label: "C4Context",
    detail: "C4 context",
    kind: "c4",
    snippet:
      'C4Context\n  title @title\n  Person(@user, "User")\n  System(@sys, "System")\n  Rel(@user, @sys, "Uses")',
    boost: 3,
  },
  {
    label: "C4Container",
    detail: "C4 container",
    kind: "c4",
    snippet: 'C4Container\n  title @title\n  Container(@id, "Name", "tech")',
    boost: 2,
  },
  {
    label: "C4Component",
    detail: "C4 component",
    kind: "c4",
    snippet: 'C4Component\n  title @title\n  Component(@id, "Name", "tech")',
    boost: 2,
  },
];

const DIAGRAM_TYPE_SET = new Set(DIAGRAM_TYPES.map((item) => item.label));
DIAGRAM_TYPE_SET.add("classDiagram-v2");
DIAGRAM_TYPE_SET.add("flowchart-v2");
DIAGRAM_TYPE_SET.add("C4Dynamic");
DIAGRAM_TYPE_SET.add("C4Deployment");

const KIND_BY_TYPE = new Map<string, DiagramKind>(
  DIAGRAM_TYPES.map((item) => [item.label, item.kind]),
);
KIND_BY_TYPE.set("classDiagram-v2", "class");
KIND_BY_TYPE.set("flowchart-v2", "flowchart");
KIND_BY_TYPE.set("C4Dynamic", "c4");
KIND_BY_TYPE.set("C4Deployment", "c4");

const DIRECTIONS = [
  kw("TB", "top to bottom", 6),
  kw("TD", "top down", 4),
  kw("BT", "bottom to top", 4),
  kw("LR", "left to right", 6),
  kw("RL", "right to left", 4),
];

const KINDS_WITH_DIRECTION = new Set<DiagramKind>([
  "flowchart",
  "class",
  "state",
  "c4",
]);

const FRONTMATTER = [
  kw("title", "diagram title", 4),
  kw("config", "Mermaid config", 3),
  kw("theme", "theme name"),
  kw("look", "classic or handDrawn"),
];

const COMMON = [
  kw("title", "diagram title"),
  kw("accTitle", "accessible title"),
  kw("accDescr", "accessible description"),
];

const FLOW_ARROWS = arrows([
  ["-->", "arrow"],
  ["---", "link"],
  ["-.->", "dotted arrow"],
  ["-.-", "dotted link"],
  ["==>", "thick arrow"],
  ["===", "thick link"],
  ["--o", "circle end"],
  ["--x", "cross end"],
  ["<-->", "bidirectional"],
]);

const SEQUENCE_ARROWS = arrows([
  ["->>", "solid arrow"],
  ["-->>", "dashed arrow"],
  ["->", "solid line"],
  ["-->", "dashed line"],
  ["-)", "solid open"],
  ["--)", "dashed open"],
  ["-x", "solid cross"],
  ["--x", "dashed cross"],
  ["<<->>", "bidirectional"],
  ["<<-->>", "dashed bidirectional"],
]);

const CLASS_ARROWS = arrows([
  ["<|--", "inheritance"],
  ["*--", "composition"],
  ["o--", "aggregation"],
  ["-->", "association"],
  ["--", "link"],
  ["..>", "dependency"],
  ["<|..", "realization"],
  ["..", "dashed link"],
]);

const ER_ARROWS = arrows([
  ["||--o{", "one to zero-or-more"],
  ["||--|{", "one to one-or-more"],
  ["||--||", "one to one"],
  ["}o--o{", "many to many"],
  ["}o--|", "zero-or-more to one"],
  ["}|--|{", "one-or-more to one-or-more"],
  ["||--o|", "one to zero-or-one"],
  ["}o..o{", "many to many (non-identifying)"],
  ["||..o{", "one to many (non-identifying)"],
]);

const STATE_ARROWS = arrows([["-->", "transition"]]);

const BY_KIND: Record<
  Exclude<DiagramKind, "unknown">,
  { keywords: Completion[]; snippets: Completion[]; arrows: Completion[] }
> = {
  flowchart: {
    keywords: [
      ...COMMON,
      kw("end", "close subgraph"),
      kw("direction", "layout direction"),
      ...DIRECTIONS,
      kw("class", "apply style class"),
      kw("click", "click handler"),
      kw("style", "inline style"),
      kw("linkStyle", "edge style"),
    ],
    snippets: [
      snippet("subgraph", "subgraph @id [@title]\n  @\nend", "group nodes"),
      snippet(
        "classDef",
        "classDef @name fill:@fill,stroke:@stroke",
        "style class",
      ),
      snippet("rectangle", "@id[@label]", "node"),
      snippet("rounded", "@id(@label)", "node"),
      snippet("stadium", "@id([@label])", "node"),
      snippet("circle", "@id((@label))", "node"),
      snippet("rhombus", "@id{@label}", "decision"),
      snippet("hexagon", "@id{{@label}}", "node"),
      snippet("cylinder", "@id[(@label)]", "datastore"),
      snippet("subroutine", "@id[[@label]]", "node"),
    ],
    arrows: FLOW_ARROWS,
  },
  sequence: {
    keywords: [
      ...COMMON,
      kw("as", "alias"),
      kw("autonumber", "number messages"),
      kw("activate", "activate lifeline"),
      kw("deactivate", "deactivate lifeline"),
      kw("left", "note left of"),
      kw("right", "note right of"),
      kw("over", "note over"),
      kw("of", "note of"),
      kw("else", "alternative branch"),
      kw("and", "parallel branch"),
      kw("critical", "critical block"),
      kw("break", "break block"),
      kw("box", "group participants"),
      kw("end", "close block"),
      kw("create", "create participant"),
      kw("destroy", "destroy participant"),
    ],
    snippets: [
      snippet("participant", "participant @id as @name", "lifeline"),
      snippet("actor", "actor @id as @name", "actor"),
      snippet("alt", "alt @condition\n  @\nelse @other\n  @\nend", "branch"),
      snippet("loop", "loop @label\n  @\nend", "repeat"),
      snippet("opt", "opt @condition\n  @\nend", "optional"),
      snippet("par", "par @first\n  @\nand @second\n  @\nend", "parallel"),
      snippet("note", "note right of @id: @text", "annotation"),
      snippet("rect", "rect rgb(40, 44, 52)\n  @\nend", "highlight"),
    ],
    arrows: SEQUENCE_ARROWS,
  },
  class: {
    keywords: [
      ...COMMON,
      kw("classDef", "style class"),
      kw("direction", "layout direction"),
      ...DIRECTIONS,
      kw("link", "external link"),
      kw("click", "click handler"),
      {
        label: "interface",
        apply: "<<interface>>",
        detail: "stereotype",
        type: "keyword",
      },
      {
        label: "abstract",
        apply: "<<abstract>>",
        detail: "stereotype",
        type: "keyword",
      },
      {
        label: "enumeration",
        apply: "<<enumeration>>",
        detail: "stereotype",
        type: "keyword",
      },
      {
        label: "service",
        apply: "<<service>>",
        detail: "stereotype",
        type: "keyword",
      },
    ],
    snippets: [
      snippet(
        "class",
        "class @Name {\n  +@type @field\n  +@method()\n}",
        "class box",
      ),
      snippet("namespace", "namespace @Name {\n  @\n}", "group"),
      snippet("note", 'note for @Name "@text"', "annotation"),
    ],
    arrows: CLASS_ARROWS,
  },
  er: {
    keywords: [
      ...COMMON,
      kw("PK", "primary key"),
      kw("FK", "foreign key"),
      kw("UK", "unique key"),
    ],
    snippets: [
      snippet(
        "entity",
        "@ENTITY {\n  @type @id PK\n  @type @field\n}",
        "entity attributes",
      ),
    ],
    arrows: ER_ARROWS,
  },
  state: {
    keywords: [
      ...COMMON,
      kw("direction", "layout direction"),
      ...DIRECTIONS,
      kw("as", "alias"),
      kw("end", "close note"),
      {
        label: "start",
        apply: "[*]",
        detail: "start / end",
        type: "keyword",
        boost: 5,
      },
      { label: "join", apply: "<<join>>", detail: "join", type: "keyword" },
      {
        label: "choice",
        apply: "<<choice>>",
        detail: "choice",
        type: "keyword",
      },
    ],
    snippets: [
      snippet("state", "state @Name {\n  @\n}", "composite state"),
      snippet("note", "note right of @State\n  @text\nend note", "annotation"),
      snippet("fork", "state @Fork <<fork>>", "split"),
    ],
    arrows: STATE_ARROWS,
  },
  gantt: {
    keywords: [
      ...COMMON,
      kw("axisFormat", "axis tick format"),
      kw("tickInterval", "axis interval"),
      kw("excludes", "skipped dates"),
      kw("todayMarker", "today marker"),
      kw("weekend", "weekend days"),
    ],
    snippets: [
      snippet("section", "section @name\n  @task :@id, @date, 7d", "group"),
      snippet("dateFormat", "dateFormat YYYY-MM-DD", "dates"),
    ],
    arrows: [],
  },
  git: {
    keywords: [
      ...COMMON,
      kw("cherry-pick", "cherry-pick commit"),
      kw("reset", "move branch"),
      kw("id", "commit id"),
      kw("tag", "commit tag"),
      kw("type", "commit type"),
      kw("NORMAL", "commit type"),
      kw("REVERSE", "commit type"),
      kw("HIGHLIGHT", "commit type"),
    ],
    snippets: [
      snippet("commit", 'commit id: "@id"', "commit"),
      snippet("branch", "branch @name", "branch"),
      snippet("checkout", "checkout @name", "switch"),
      snippet("merge", "merge @name", "merge"),
    ],
    arrows: [],
  },
  pie: {
    keywords: [...COMMON, kw("showData", "show values")],
    snippets: [snippet("slice", '"@label" : @n', "slice")],
    arrows: [],
  },
  journey: {
    keywords: [...COMMON],
    snippets: [
      snippet("section", "section @name\n  @step: @score: @Actor", "section"),
    ],
    arrows: [],
  },
  mindmap: {
    keywords: [...COMMON],
    snippets: [
      snippet("root", "root((@title))", "root node"),
      snippet("circle", "(@label)", "shape"),
      snippet("bang", "))@label((", "shape"),
      snippet("cloud", ")@label(", "shape"),
    ],
    arrows: [],
  },
  timeline: {
    keywords: [...COMMON],
    snippets: [snippet("section", "section @name\n  @event : @detail", "era")],
    arrows: [],
  },
  kanban: {
    keywords: [...COMMON],
    snippets: [],
    arrows: [],
  },
  c4: {
    keywords: [
      ...COMMON,
      kw("direction", "layout direction"),
      ...DIRECTIONS,
      kw("Person_Ext", "external person"),
      kw("System_Ext", "external system"),
      kw("SystemDb", "system database"),
      kw("Container_Ext", "external container"),
      kw("ContainerDb", "container database"),
      kw("Component", "component"),
      kw("Boundary", "boundary"),
      kw("Enterprise_Boundary", "enterprise"),
      kw("System_Boundary", "system boundary"),
      kw("BiRel", "bidirectional rel"),
    ],
    snippets: [
      snippet("Person", 'Person(@id, "@name")', "actor"),
      snippet("System", 'System(@id, "@name", "@desc")', "system"),
      snippet("Container", 'Container(@id, "@name", "@tech")', "container"),
      snippet("Rel", 'Rel(@from, @to, "@label")', "relationship"),
    ],
    arrows: [],
  },
  requirement: {
    keywords: [
      ...COMMON,
      kw("functionalRequirement", "functional"),
      kw("interfaceRequirement", "interface"),
      kw("performanceRequirement", "performance"),
      kw("physicalRequirement", "physical"),
      kw("designConstraint", "constraint"),
      kw("element", "element"),
      kw("id", "id field"),
      kw("text", "text field"),
      kw("risk", "risk field"),
      kw("verifyMethod", "verify field"),
    ],
    snippets: [
      snippet(
        "requirement",
        "requirement @Name {\n  id: @id\n  text: @text\n  risk: @medium\n}",
        "requirement",
      ),
    ],
    arrows: arrows([
      ["-", "contains"],
      ["->", "traces / satisfies"],
    ]),
  },
  sankey: {
    keywords: [...COMMON],
    snippets: [snippet("flow", "@Source,@Target,@n", "flow")],
    arrows: [],
  },
  quadrant: {
    keywords: [
      ...COMMON,
      kw("quadrant-1", "top right label"),
      kw("quadrant-2", "top left label"),
      kw("quadrant-3", "bottom left label"),
      kw("quadrant-4", "bottom right label"),
    ],
    snippets: [
      snippet("x-axis", "x-axis @low --> @high", "axis"),
      snippet("y-axis", "y-axis @low --> @high", "axis"),
      snippet("point", "@item: [@x, @y]", "point"),
    ],
    arrows: arrows([["-->", "axis range"]]),
  },
  xychart: {
    keywords: [
      ...COMMON,
      kw("x-axis", "horizontal axis"),
      kw("y-axis", "vertical axis"),
    ],
    snippets: [
      snippet("bar", "bar [@a, @b, @c]", "series"),
      snippet("line", "line [@a, @b, @c]", "series"),
    ],
    arrows: arrows([["-->", "axis range"]]),
  },
  architecture: {
    keywords: [
      ...COMMON,
      kw("group", "group"),
      kw("service", "service"),
      kw("junction", "junction"),
      kw("in", "parent group"),
    ],
    snippets: [
      snippet("group", "group @id(@icon)[@label]", "group"),
      snippet("service", "service @id(@icon)[@label]", "service"),
    ],
    arrows: FLOW_ARROWS,
  },
  block: {
    keywords: [
      ...COMMON,
      kw("columns", "column count"),
      kw("block", "nested block"),
      kw("space", "empty cell"),
      kw("end", "close block"),
    ],
    snippets: [
      snippet("columns", "columns @n", "layout"),
      snippet("block", "block:@id\n  @\nend", "nested"),
    ],
    arrows: FLOW_ARROWS,
  },
  packet: {
    keywords: [...COMMON],
    snippets: [snippet("field", '@start-@end: "@name"', "bits")],
    arrows: [],
  },
  radar: {
    keywords: [
      ...COMMON,
      kw("axis", "radar axes"),
      kw("curve", "data series"),
      kw("graticule", "grid"),
      kw("max", "scale max"),
      kw("min", "scale min"),
    ],
    snippets: [
      snippet("axis", "axis @A, @B, @C", "axes"),
      snippet("curve", "curve @name{@a, @b, @c}", "series"),
    ],
    arrows: [],
  },
  treemap: {
    keywords: [...COMMON],
    snippets: [snippet("leaf", '"@label" : @n', "value")],
    arrows: [],
  },
};

const RESERVED = new Set<string>([
  ...DIAGRAM_TYPE_SET,
  ...DIRECTIONS.map((item) => item.label),
]);

for (const catalog of Object.values(BY_KIND)) {
  for (const item of catalog.keywords) RESERVED.add(item.label);
  for (const item of catalog.snippets) RESERVED.add(item.label);
}

function isBlankOrComment(line: string) {
  const trimmed = line.trim();
  return !trimmed || trimmed.startsWith("%%");
}

function frontmatterEnd(text: string): number | null {
  const open = text.match(/^---[ \t]*\r?\n/);
  if (!open) return /^---[ \t]*$/.test(text) ? text.length : null;
  const rest = text.slice(open[0].length);
  const close = rest.match(/^---[ \t]*(?:\r?\n|$)/m);
  if (!close || close.index === undefined) return text.length;
  return open[0].length + close.index + close[0].length;
}

function firstContentLine(text: string, from: number) {
  let index = from;
  while (index < text.length) {
    const nl = text.indexOf("\n", index);
    const end = nl < 0 ? text.length : nl;
    const line = text.slice(index, end);
    if (!isBlankOrComment(line)) return { from: index, to: end, text: line };
    index = nl < 0 ? text.length : nl + 1;
  }
  return null;
}

function inLabel(before: string) {
  const stripped = before.replace(/\\./g, "");
  if ((stripped.split('"').length - 1) % 2 === 1) return true;
  if ((stripped.split("'").length - 1) % 2 === 1) return true;
  let square = 0;
  let round = 0;
  let curly = 0;
  for (const char of stripped) {
    if (char === "[") square += 1;
    else if (char === "]") square -= 1;
    else if (char === "(") round += 1;
    else if (char === ")") round -= 1;
    else if (char === "{") curly += 1;
    else if (char === "}") curly -= 1;
  }
  return square > 0 || round > 0 || curly > 0;
}

function analyze(doc: Text, pos: number): Place {
  const text = doc.toString();
  const line = doc.lineAt(pos);
  const before = line.text.slice(0, pos - line.from);
  const commentAt = before.indexOf("%%");
  if (commentAt >= 0 && !before.slice(commentAt).startsWith("%%{")) {
    return { at: "comment" };
  }

  const fmEnd = frontmatterEnd(text);
  if (fmEnd !== null && pos < fmEnd) return { at: "frontmatter" };

  if (inLabel(before)) return { at: "label" };

  const bodyFrom = fmEnd ?? 0;
  const content = firstContentLine(text, bodyFrom);
  if (!content) return { at: "diagramType", starter: true };

  const indent = content.text.match(/^[ \t]*/)?.[0].length ?? 0;
  const word = content.text.slice(indent).match(/^[\w-]+/)?.[0] ?? "";
  const typeFrom = content.from + indent;
  const typeTo = typeFrom + word.length;
  const kind = KIND_BY_TYPE.get(word) ?? "unknown";
  const restAfterLine = text.slice(content.to).trim();
  const starter =
    /^\s*[\w-]*\s*$/.test(content.text) && restAfterLine.length === 0;

  if (pos >= typeFrom && pos <= typeTo) {
    return { at: "diagramType", starter };
  }
  if (
    pos > typeTo &&
    pos <= content.to &&
    kind !== "unknown" &&
    KINDS_WITH_DIRECTION.has(kind)
  ) {
    return { at: "direction", kind };
  }
  return { at: "body", kind };
}

function diagramTypeCompletions(starter: boolean): Completion[] {
  return DIAGRAM_TYPES.map((item) =>
    starter
      ? snippetCompletion(expandSnippet(item.snippet), {
          label: item.label,
          detail: item.detail,
          type: "type",
          boost: item.boost,
        })
      : {
          label: item.label,
          detail: item.detail,
          type: "type",
          boost: item.boost,
        },
  );
}

function catalog(kind: DiagramKind) {
  if (kind === "unknown") {
    return {
      keywords: COMMON,
      snippets: [] as Completion[],
      arrows: [] as Completion[],
    };
  }
  return BY_KIND[kind];
}

function identifiers(doc: Text, current: string): Completion[] {
  const text = doc.toString();
  const bodyFrom = frontmatterEnd(text) ?? 0;
  const found = new Set<string>();
  let index = bodyFrom;
  while (index < text.length) {
    const nl = text.indexOf("\n", index);
    const end = nl < 0 ? text.length : nl;
    const code = text.slice(index, end).replace(/%%.*$/, "");
    for (const match of code.matchAll(/[A-Za-z_][\w-]*/g)) {
      const word = match[0];
      if (word === current || RESERVED.has(word) || word.length > 48) continue;
      found.add(word);
    }
    index = nl < 0 ? text.length : nl + 1;
  }
  return [...found].map((label) => ({
    label,
    type: "variable",
    boost: -8,
  }));
}

function result(
  from: number,
  options: Completion[],
  validFor: RegExp,
): CompletionResult | null {
  if (options.length === 0) return null;
  return { from, options, validFor };
}

function mermaidCompletions(
  context: CompletionContext,
): CompletionResult | null {
  const place = analyze(context.state.doc, context.pos);
  if (place.at === "comment" || place.at === "label") return null;

  const word = context.matchBefore(WORD);
  const arrow = context.matchBefore(ARROW);
  const emptyWord = !word;

  if (place.at === "frontmatter") {
    if (emptyWord && !context.explicit) return null;
    return result(word?.from ?? context.pos, FRONTMATTER, /^[\w-]*$/);
  }

  if (place.at === "diagramType") {
    if (emptyWord && !context.explicit) return null;
    return result(
      word?.from ?? context.pos,
      diagramTypeCompletions(place.starter),
      /^[\w-]*$/,
    );
  }

  if (place.at === "direction") {
    if (emptyWord && !context.explicit) return null;
    return result(word?.from ?? context.pos, DIRECTIONS, /^\w*$/);
  }

  const { keywords, snippets, arrows: kindArrows } = catalog(place.kind);

  if (
    arrow &&
    (!word || arrow.from <= word.from) &&
    /[-.=<>|~]/.test(arrow.text)
  ) {
    return result(arrow.from, kindArrows, /[-.=<>|~]*$/);
  }

  if (emptyWord && !context.explicit) return null;

  const options = [
    ...keywords,
    ...snippets,
    ...identifiers(context.state.doc, word?.text ?? ""),
  ];
  if (context.explicit && emptyWord) options.push(...kindArrows);
  return result(word?.from ?? context.pos, options, /^[\w-]*$/);
}

export const mermaidCompleteExtensions = [
  autocompletion({
    override: [mermaidCompletions],
    icons: true,
    closeOnBlur: true,
  }),
];
