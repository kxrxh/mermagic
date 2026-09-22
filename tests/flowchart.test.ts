import { describe, expect, test } from "bun:test";
import {
  editFlowNode,
  type FlowGraph,
  findNodeSource,
  readFlowGraph,
  readNodeEdit,
  tracePaths,
} from "../src/lib/flowchart";

function graph(links: [string, string, boolean?][]): FlowGraph {
  return {
    nodes: [...new Set(links.flatMap(([a, b]) => [a, b]))].map((id) => ({
      id,
      label: id,
    })),
    edges: links.map(([start, end, bidirectional = false], i) => ({
      id: `e${i}`,
      start,
      end,
      bidirectional,
    })),
  };
}

describe("flow tracing", () => {
  test("highlights alternate routes, excluding dead branches and cycle detours", () => {
    const result = tracePaths(
      graph([
        ["A", "B"],
        ["A", "C"],
        ["B", "D"],
        ["C", "D"],
        ["B", "X"],
        ["X", "B"],
        ["D", "Z"],
      ]),
      "A",
      "D",
    );
    expect(result.count).toBe(2);
    expect([...result.nodes].sort()).toEqual(["A", "B", "C", "D"]);
    expect([...result.edges].sort()).toEqual(["e0", "e1", "e2", "e3"]);
    expect(result.limited).toBe(false);
  });

  test("respects direction and supports two-way links", () => {
    expect(tracePaths(graph([["A", "B"]]), "B", "A").count).toBe(0);
    expect(tracePaths(graph([["A", "B", true]]), "B", "A").count).toBe(1);
  });

  test("retains parallel edge identities and handles self loops", () => {
    const result = tracePaths(
      graph([
        ["A", "A"],
        ["A", "B"],
        ["A", "B"],
      ]),
      "A",
      "B",
    );
    expect(result.count).toBe(2);
    expect([...result.edges].sort()).toEqual(["e1", "e2"]);
  });

  test("bounds work on exponentially many routes", () => {
    const links: [string, string][] = [];
    for (let i = 0; i < 20; i++) {
      links.push(
        [`n${i}`, `a${i}`],
        [`n${i}`, `b${i}`],
        [`a${i}`, `n${i + 1}`],
        [`b${i}`, `n${i + 1}`],
      );
    }
    const result = tracePaths(graph(links), "n0", "n20");
    expect(result.count).toBe(1000);
    expect(result.limited).toBe(true);
  });
});

describe("source navigation and safe edits", () => {
  test("ignores comments, frontmatter, directives and labels containing the ID", () => {
    const code =
      '---\ntitle: api\n---\nflowchart LR\n%% api\nother["api"]\nstyle api fill:red\napi[API] --> db';
    expect(findNodeSource(code, "api")).toEqual({
      from: code.indexOf("api[API]"),
      to: code.indexOf("api[API]") + 3,
    });
  });

  test("finds implicit nodes in compact syntax and distinguishes ID prefixes", () => {
    const code = "graph LR; AA-->A---B; my-api-->C";
    for (const id of ["AA", "A", "B", "my-api", "C"]) {
      const range = findNodeSource(code, id);
      expect(range).not.toBeNull();
      expect(code.slice(range?.from, range?.to)).toBe(id);
    }
    expect(findNodeSource(code, "missing")).toBeNull();
  });

  test("preserves original syntax and updates a single override block", () => {
    const original =
      'flowchart LR\n A["Original"]:::important -->|payload| B\n classDef important stroke:red';
    const first = editFlowNode(original, "A", {
      label: 'Quotes " braces {} & <tags> \\ #35;',
    });
    const next = editFlowNode(first, "A", { shape: "diam", color: "#ffffff" });
    expect(next.startsWith(original)).toBe(true);
    expect(next.match(/%% mermagic:node A/g)?.length).toBe(1);
    expect(readNodeEdit(next, "A")).toEqual({
      label: 'Quotes " braces {} & <tags> \\ #35;',
      shape: "diam",
      color: "#ffffff",
    });
    expect(next).toContain("color:#111827");
    expect(findNodeSource(next, "A")?.from).toBe(next.indexOf("A@{"));
  });

  test("edits remain independent across nodes", () => {
    const code = editFlowNode(
      editFlowNode("graph LR; A-->B", "A", { label: "First" }),
      "B",
      { label: "Second" },
    );
    const next = editFlowNode(code, "A", { label: "Changed" });
    expect(readNodeEdit(next, "A").label).toBe("Changed");
    expect(readNodeEdit(next, "B").label).toBe("Second");
  });

  test("invalid numeric entities in source do not crash the inspector", () => {
    const code =
      'graph LR\n%% mermagic:node A\n A@{ label: "#999999999;" }\n%% mermagic:end';
    expect(readNodeEdit(code, "A").label).toBe("#999999999;");
  });
});

test("Mermaid graph adapter ignores layout-only links and keeps edge IDs", () => {
  const result = readFlowGraph("flowchart-v2", {
    getVertices: () =>
      new Map([
        ["A", { text: "Alpha", domId: "flowchart-A-0" }],
        ["B", {}],
      ]),
    getEdges: () => [
      { id: "custom-edge", start: "A", end: "B", type: "double_arrow_point" },
      { id: "hidden", start: "B", end: "A", stroke: "invisible" },
    ],
  });
  expect(result?.edges).toEqual([
    { id: "custom-edge", start: "A", end: "B", bidirectional: true },
  ]);
  expect(result?.nodes[1].label).toBe("B");
  expect(readFlowGraph("sequence", {})).toBeNull();
});
