export type FlowNode = {
  id: string;
  label: string;
  shape?: string;
  domId?: string;
};
export type FlowEdge = {
  id: string;
  start: string;
  end: string;
  bidirectional: boolean;
};
export type FlowGraph = { nodes: FlowNode[]; edges: FlowEdge[] };
export type SourceRange = { from: number; to: number };
export type NodeEdit = { label?: string; shape?: string; color?: string };

export const NODE_SHAPES = [
  ["rect", "Rectangle"],
  ["rounded", "Rounded"],
  ["stadium", "Pill"],
  ["diam", "Diamond"],
  ["cyl", "Database"],
  ["circle", "Circle"],
  ["hex", "Hexagon"],
  ["subproc", "Subroutine"],
] as const;

// Mermaid's parsed database is the authority for connections, including chained
// links, explicit edge IDs and links to subgraphs. Keep this adapter isolated.
export function readFlowGraph(
  type: string,
  database: unknown,
): FlowGraph | null {
  if (!type.startsWith("flowchart")) return null;
  const db = database as {
    getVertices?: () => Map<
      string,
      { text?: string; type?: string; domId?: string }
    >;
    getEdges?: () => {
      id?: string;
      start: string;
      end: string;
      type?: string;
      stroke?: string;
    }[];
  };
  if (!db.getVertices || !db.getEdges) return null;
  return {
    nodes: Array.from(db.getVertices(), ([id, node]) => ({
      id,
      label: node.text ?? id,
      shape: node.type,
      domId: node.domId,
    })),
    edges: db
      .getEdges()
      .filter((edge) => edge.id && edge.stroke !== "invisible")
      .map((edge) => ({
        id: edge.id as string,
        start: edge.start,
        end: edge.end,
        bidirectional:
          edge.type === "arrow_open" ||
          Boolean(edge.type?.startsWith("double_")),
      })),
  };
}

// Skip labels, metadata, comments and directives when locating a source node.
// Prefer an explicit definition over a bare reference; the last definition wins.
export function findNodeSource(code: string, id: string): SourceRange | null {
  const token = /[\p{L}\p{N}_](?:[\p{L}\p{N}_.]|-(?![-=>.]))*/uy;
  let reference: SourceRange | null = null;
  let definition: SourceRange | null = null;
  let i = code.match(/^---\s*\n[\s\S]*?\n---[^\n]*(?:\n|$)/)?.[0].length ?? 0;
  while (i < code.length) {
    if (i === 0 || code[i - 1] === "\n" || code[i - 1] === ";") {
      const directive = code
        .slice(i)
        .match(
          /^[ \t]*(?:style|classDef|class|click|linkStyle|direction|accTitle|accDescr|subgraph)\b[^\n;]*/,
        );
      if (directive) {
        i += directive[0].length;
        continue;
      }
    }
    if (code.startsWith("%%", i)) {
      const end = code.indexOf("\n", i);
      i = end < 0 ? code.length : end + 1;
      continue;
    }
    const char = code[i];
    if ('[({"`|'.includes(char)) {
      const close =
        ({ "[": "]", "(": ")", "{": "}" } as Record<string, string>)[char] ??
        char;
      let depth = 1;
      i++;
      while (i < code.length && depth) {
        if (char !== close && code[i] === '"') {
          i++;
          while (i < code.length && code[i] !== '"') i++;
        } else if (code[i] === close) depth--;
        else if (char !== close && code[i] === char) depth++;
        i++;
      }
      continue;
    }
    token.lastIndex = i;
    const match = token.exec(code);
    if (match) {
      // Hyphens belong to IDs, except where they begin an edge operator.
      const value = match[0].replace(/-+$/, "");
      const range = { from: i, to: i + value.length };
      if (value === id) {
        reference ??= range;
        if (/^\s*(?:\[|\(|\{|@\{)/.test(code.slice(range.to)))
          definition = range;
      }
      i += match[0].length;
    } else i++;
  }
  return definition ?? reference;
}

function nodeMarkers(id: string) {
  return {
    start: `%% mermagic:node ${encodeURIComponent(id)}`,
    end: "%% mermagic:end",
  };
}

export function readNodeEdit(code: string, id: string): NodeEdit {
  const { start, end } = nodeMarkers(id);
  const from = code.indexOf(`${start}\n`);
  const to = from < 0 ? -1 : code.indexOf(end, from + start.length);
  if (to < 0) return {};
  const block = code.slice(from, to);
  const label = block.match(/label: "([^"\n]*)"/)?.[1];
  return {
    label: label?.replace(/#(\d+);/g, (entity, n: string) =>
      Number(n) <= 0x10ffff ? String.fromCodePoint(Number(n)) : entity,
    ),
    shape: block.match(/shape: ([a-z]+)/)?.[1],
    color: block.match(/fill:(#[0-9a-f]{6})/i)?.[1],
  };
}

export function editFlowNode(
  code: string,
  id: string,
  patch: NodeEdit,
): string {
  const edit = { ...readNodeEdit(code, id), ...patch };
  const { start, end } = nodeMarkers(id);
  const attributes: string[] = [];
  if (edit.label !== undefined) {
    // Mermaid entities keep quotes, braces, hashes and markup literal in labels.
    const label = edit.label.replace(
      /[#"<>&{}\\\r\n\t]/g,
      (char) => `#${char.charCodeAt(0)};`,
    );
    attributes.push(`label: "${label}"`);
  }
  if (edit.shape && NODE_SHAPES.some(([shape]) => shape === edit.shape))
    attributes.push(`shape: ${edit.shape}`);
  const lines = [start];
  if (attributes.length) lines.push(`  ${id}@{ ${attributes.join(", ")} }`);
  if (edit.color && /^#[0-9a-f]{6}$/i.test(edit.color)) {
    const rgb = edit.color
      .slice(1)
      .match(/../g)
      ?.map((part) => Number.parseInt(part, 16)) ?? [0, 0, 0];
    const light = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 > 155;
    lines.push(
      `  style ${id} fill:${edit.color},color:${light ? "#111827" : "#ffffff"}`,
    );
  }
  lines.push(end);
  const block = lines.join("\n");
  const from = code.indexOf(`${start}\n`);
  const to = from < 0 ? -1 : code.indexOf(end, from + start.length);
  // A separate, replaceable override preserves rich labels, classes, links,
  // multiline declarations and all original syntax without reprinting a graph.
  return to < 0
    ? `${code.trimEnd()}\n\n${block}\n`
    : code.slice(0, from) + block + code.slice(to + end.length);
}

export function tracePaths(graph: FlowGraph, start: string, end: string) {
  const nodes = new Set<string>();
  const edges = new Set<string>();
  const adjacency = new Map<string, { to: string; id: string }[]>();
  const reverse = new Map<string, string[]>();
  const add = (from: string, to: string, id: string) => {
    adjacency.set(from, [...(adjacency.get(from) ?? []), { to, id }]);
    reverse.set(to, [...(reverse.get(to) ?? []), from]);
  };
  for (const edge of graph.edges) {
    add(edge.start, edge.end, edge.id);
    if (edge.bidirectional) add(edge.end, edge.start, edge.id);
  }
  // Prune dead ends and visit routes closest to the target first.
  const distance = new Map([[end, 0]]);
  const queue = [end];
  for (let i = 0; i < queue.length; i++) {
    for (const previous of reverse.get(queue[i]) ?? []) {
      if (distance.has(previous)) continue;
      distance.set(previous, (distance.get(queue[i]) ?? 0) + 1);
      queue.push(previous);
    }
  }
  if (!distance.has(start)) return { nodes, edges, count: 0, limited: false };
  for (const links of adjacency.values())
    links.sort(
      (a, b) =>
        (distance.get(a.to) ?? Infinity) - (distance.get(b.to) ?? Infinity),
    );
  const stack = [{ node: start, edge: "", index: 0 }];
  const visited = new Set([start]);
  let count = 0;
  let steps = 0;
  while (stack.length && count < 1000 && steps++ < 50000) {
    const frame = stack[stack.length - 1];
    if (frame.node === end) {
      count++;
      for (const item of stack) {
        nodes.add(item.node);
        if (item.edge) edges.add(item.edge);
      }
    }
    const next =
      frame.node === end
        ? undefined
        : adjacency.get(frame.node)?.[frame.index++];
    if (!next) {
      stack.pop();
      visited.delete(frame.node);
      continue;
    }
    if (!distance.has(next.to) || visited.has(next.to)) continue;
    visited.add(next.to);
    stack.push({ node: next.to, edge: next.id, index: 0 });
  }
  return { nodes, edges, count, limited: stack.length > 0 };
}
