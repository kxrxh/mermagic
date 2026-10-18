import { escapeFlowLabel, type FlowGraph, NODE_SHAPES } from "./flowchart";

export type FlowDirection = "TB" | "LR" | "BT" | "RL";
export type FlowConnection = "arrow" | "dashed" | "thick" | "both";

const directions: FlowDirection[] = ["TB", "LR", "BT", "RL"];
const connections: Record<FlowConnection, string> = {
  arrow: "-->",
  dashed: "-.->",
  thick: "==>",
  both: "<-->",
};

function flowHeader(code: string) {
  let offset = code.charCodeAt(0) === 0xfeff ? 1 : 0;
  offset += code.slice(offset).match(/^\s*/)?.[0].length ?? 0;
  offset +=
    code
      .slice(offset)
      .match(/^---[ \t]*\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$)/)?.[0]
      .length ?? 0;
  while (offset < code.length) {
    const whitespace = code.slice(offset).match(/^\s+/);
    if (whitespace) {
      offset += whitespace[0].length;
      continue;
    }
    if (code.startsWith("%%{", offset)) {
      const end = code.indexOf("}%%", offset + 3);
      if (end < 0) return null;
      offset = end + 3;
      continue;
    }
    if (code.startsWith("%%", offset)) {
      const end = code.indexOf("\n", offset);
      if (end < 0) return null;
      offset = end + 1;
      continue;
    }
    break;
  }
  const match = code
    .slice(offset)
    .match(/^(?:flowchart|graph)\b(?:[ \t]+(TB|TD|LR|BT|RL)\b)?/);
  if (!match) return null;
  const to = offset + match[0].length;
  return {
    from: to - (match[1]?.length ?? 0),
    to,
    direction: (match[1] === "TD" ? "TB" : (match[1] ?? "TB")) as FlowDirection,
    explicit: Boolean(match[1]),
  };
}

export function readFlowDirection(code: string): FlowDirection | null {
  return flowHeader(code)?.direction ?? null;
}

export function setFlowDirection(
  code: string,
  direction: FlowDirection,
): string {
  if (!directions.includes(direction))
    throw new Error("Choose a valid direction.");
  const header = flowHeader(code);
  if (!header) return code;
  return (
    code.slice(0, header.from) +
    (header.explicit ? direction : ` ${direction}`) +
    code.slice(header.to)
  );
}

function appendStatement(code: string, statement: string) {
  const newline = code.includes("\r\n") ? "\r\n" : "\n";
  return `${code}${code.endsWith("\n") ? "" : newline}  ${statement}${newline}`;
}

export function addFlowNode(
  code: string,
  graph: FlowGraph,
  { label, shape }: { label: string; shape: string },
): { code: string; id: string } {
  if (!flowHeader(code)) throw new Error("Choose a flowchart to add a node.");
  if (!label.trim()) throw new Error("Enter a label for the new node.");
  if (!NODE_SHAPES.some(([value]) => value === shape))
    throw new Error("Choose a valid node shape.");
  const used = new Set([
    ...graph.nodes.map((node) => node.id),
    ...(code.match(/node_\d+/g) ?? []),
  ]);
  let index = 1;
  while (used.has(`node_${index}`)) index++;
  const id = `node_${index}`;
  return {
    code: appendStatement(
      code,
      `${id}@{ label: "${escapeFlowLabel(label)}", shape: ${shape} }`,
    ),
    id,
  };
}

export function connectFlowNodes(
  code: string,
  graph: FlowGraph,
  from: string,
  to: string,
  label: string,
  style: FlowConnection,
): string {
  if (!flowHeader(code))
    throw new Error("Choose a flowchart to connect nodes.");
  const validEndpoint = (id: string) =>
    graph.nodes.some((node) => node.id === id);
  if (!validEndpoint(from) || !validEndpoint(to))
    throw new Error("Choose two existing nodes to connect.");
  if (!Object.hasOwn(connections, style))
    throw new Error("Choose a valid connection style.");
  const edgeLabel = label.trim() ? `|"${escapeFlowLabel(label)}"|` : "";
  return appendStatement(
    code,
    `${from} ${connections[style]}${edgeLabel} ${to}`,
  );
}
