import { describe, expect, test } from "bun:test";
import mermaid from "mermaid";
import {
  editFlowNode,
  type FlowGraph,
  NODE_SHAPES,
  readFlowGraph,
  readNodeEdit,
} from "../src/lib/flowchart";
import {
  addFlowNode,
  connectFlowNodes,
  type FlowConnection,
  type FlowDirection,
  readFlowDirection,
  setFlowDirection,
} from "../src/lib/flowEditing";

function graph(...ids: string[]): FlowGraph {
  return { nodes: ids.map((id) => ({ id, label: id })), edges: [] };
}

test("added and edited labels survive Mermaid parsing and inspector readback", async () => {
  const label =
    'Quotes " braces {} & <b> \\ #35;38; #amp; | `\n\tCafé Привет 😀';
  const added = addFlowNode("flowchart LR\n", graph(), {
    label,
    shape: "rect",
  });
  const edited = editFlowNode(added.code, added.id, { label });
  expect(readNodeEdit(edited, added.id).label).toBe(label);
  mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
  for (const code of [
    added.code,
    editFlowNode(edited, added.id, { shape: "diam" }),
  ]) {
    await mermaid.parse(code);
    const diagram = await mermaid.mermaidAPI.getDiagramFromText(code);
    const parsed = readFlowGraph(diagram.type, diagram.db);
    expect(parsed?.nodes).toHaveLength(1);
    expect(parsed?.nodes[0].label).toBe(label);
  }
});

describe("flowchart direction", () => {
  test("reads only the header after frontmatter, comments and directives", () => {
    const prefix =
      '\uFEFF---\ntitle: graph RL\n---\n%% flowchart BT\n%%{init: {\n"theme": "dark"\n}}%%\n';
    const code = `${prefix}graph TD; A-->B\nsubgraph nested\n direction LR\nend`;
    expect(readFlowDirection(code)).toBe("TB");
    expect(setFlowDirection(code, "RL")).toBe(
      `${prefix}graph RL; A-->B\nsubgraph nested\n direction LR\nend`,
    );
  });

  test("adds a missing direction before inline statements or comments", () => {
    expect(readFlowDirection("flowchart\n A-->B")).toBe("TB");
    expect(readFlowDirection("---\n---\ngraph LR")).toBe("LR");
    expect(setFlowDirection("graph; A-->B", "LR")).toBe("graph LR; A-->B");
    expect(setFlowDirection("flowchart %% keep this\n A", "BT")).toBe(
      "flowchart BT %% keep this\n A",
    );
  });

  test("preserves whitespace, CRLF and trailing header comments", () => {
    const code = "\r\n graph  LR %% graph TB\r\n A-->B\r\n";
    expect(setFlowDirection(code, "TB")).toBe(
      "\r\n graph  TB %% graph TB\r\n A-->B\r\n",
    );
    expect(readFlowDirection(code)).toBe("LR");
  });

  test("does not change another diagram or comment-only source", () => {
    for (const code of [
      "sequenceDiagram\n A->>B: flowchart LR",
      "%% graph LR",
      "flowcharts LR",
      "%%{unfinished",
      "",
    ]) {
      expect(readFlowDirection(code)).toBeNull();
      expect(setFlowDirection(code, "LR")).toBe(code);
    }
    expect(() =>
      setFlowDirection("flowchart TB", "bad" as FlowDirection),
    ).toThrow("valid direction");
  });
});

describe("adding flowchart nodes", () => {
  test("avoids parsed nodes, implicit source nodes and subgraph identifiers", () => {
    const code =
      "flowchart LR\n subgraph node_2 [Group]\n A-->node_3\n end\n %% trailing comment";
    const added = addFlowNode(code, graph("node_1", "A"), {
      label: "New node",
      shape: "diam",
    });
    expect(added.id).toBe("node_4");
    expect(added.code.startsWith(`${code}\n`)).toBe(true);
    expect(added.code).toEndWith(
      '  node_4@{ label: "New node", shape: diam }\n',
    );
    expect(
      addFlowNode(added.code, graph("node_1", "A"), {
        label: "Next",
        shape: "rect",
      }).id,
    ).toBe("node_5");
  });

  test("escapes punctuation, markup, entities and multiline labels", () => {
    const added = addFlowNode("flowchart TB\n", graph(), {
      label: 'Quotes " braces {} & <b> \\ #35; | `\n\t',
      shape: "rect",
    });
    expect(added.code).toBe(
      'flowchart TB\n  node_1@{ label: "Quotes #34; braces #123;#125; #38; #60;b#62; #92; #35;35; #124; #96;#10;#9;", shape: rect }\n',
    );
  });

  test("supports every existing node shape and preserves CRLF", () => {
    for (const [shape] of NODE_SHAPES) {
      expect(
        addFlowNode("graph TB\r\n", graph(), { label: "Node", shape }).code,
      ).toBe(`graph TB\r\n  node_1@{ label: "Node", shape: ${shape} }\r\n`);
    }
  });

  test("rejects empty labels, invalid shapes and other diagram types", () => {
    expect(() =>
      addFlowNode("graph TB", graph(), { label: " \n", shape: "rect" }),
    ).toThrow("Enter a label");
    expect(() =>
      addFlowNode("graph TB", graph(), {
        label: "Node",
        shape: "rect }\n A-->B",
      }),
    ).toThrow("valid node shape");
    expect(() =>
      addFlowNode("sequenceDiagram", graph(), { label: "Node", shape: "rect" }),
    ).toThrow("flowchart");
  });
});

describe("connecting flowchart nodes", () => {
  test("adds every connection style without changing the source", () => {
    const styles = {
      arrow: "-->",
      dashed: "-.->",
      thick: "==>",
      both: "<-->",
    } as const;
    const code = "graph LR; A-->B\n%% keep this";
    for (const [style, syntax] of Object.entries(styles)) {
      expect(
        connectFlowNodes(
          code,
          graph("A", "B"),
          "A",
          "B",
          "",
          style as FlowConnection,
        ),
      ).toBe(`${code}\n  A ${syntax} B\n`);
    }
  });

  test("escapes edge labels and omits labels containing only whitespace", () => {
    const code = "flowchart LR\n A-->B\n";
    expect(
      connectFlowNodes(
        code,
        graph("A", "B"),
        "A",
        "B",
        '" | <b> # \\\n',
        "arrow",
      ),
    ).toBe(`${code}  A -->|"#34; #124; #60;b#62; #35; #92;#10;"| B\n`);
    expect(
      connectFlowNodes(code, graph("A", "B"), "A", "B", " \n\t", "arrow"),
    ).toEndWith("  A --> B\n");
  });

  test("allows self loops, Unicode and hyphenated node identifiers", () => {
    expect(
      connectFlowNodes(
        "graph TB",
        graph("узел-1"),
        "узел-1",
        "узел-1",
        "retry",
        "dashed",
      ),
    ).toEndWith('  узел-1 -.->|"retry"| узел-1\n');
  });

  test("accepts Mermaid identifiers containing punctuation", () => {
    for (const id of ["foo/bar", "-A", ".A", "a:b", "a+b"]) {
      expect(
        connectFlowNodes(
          `graph TB\n ${id} --> B`,
          graph(id, "B"),
          id,
          "B",
          "",
          "arrow",
        ),
      ).toEndWith(`  ${id} --> B\n`);
    }
  });

  test("rejects missing endpoints and invalid styles", () => {
    const code = "graph TB\n A-->B";
    expect(() =>
      connectFlowNodes(code, graph("A", "B"), "A", "missing", "", "arrow"),
    ).toThrow("existing nodes");
    expect(() =>
      connectFlowNodes(
        code,
        graph("A", "B"),
        "A",
        "B",
        "",
        "toString" as FlowConnection,
      ),
    ).toThrow("valid connection style");
    expect(() =>
      connectFlowNodes(
        "sequenceDiagram",
        graph("A", "B"),
        "A",
        "B",
        "",
        "arrow",
      ),
    ).toThrow("flowchart");
  });
});
