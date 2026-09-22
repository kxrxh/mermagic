import mermaid from "mermaid";
import { readFlowGraph } from "@/lib/flowchart";
import type { DiagramTheme } from "@/lib/themes";

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "strict",
  suppressErrorRendering: true,
  logLevel: "fatal",
});

let renderCount = 0;
let mermaidQueue: Promise<unknown> = Promise.resolve();

function enqueueMermaid<T>(task: () => Promise<T>): Promise<T> {
  const run = mermaidQueue.then(task, task);
  mermaidQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function configureMermaid(theme: DiagramTheme) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    suppressErrorRendering: true,
    logLevel: "fatal",
    look: theme.look,
    theme: "base",
    htmlLabels: false,
    themeVariables: theme.variables,
    flowchart: {
      curve: theme.curve,
      padding: theme.look === "classic" ? 16 : 18,
    },
    sequence: {
      actorMargin: 48,
      messageMargin: 36,
    },
  });
}

export async function parseMermaid(code: string): Promise<void> {
  await enqueueMermaid(async () => {
    await mermaid.parse(code);
  });
}

export async function renderMermaid(
  code: string,
  theme: DiagramTheme,
): Promise<string> {
  return enqueueMermaid(async () => {
    configureMermaid(theme);
    renderCount += 1;
    const id = `mermagic-${renderCount}`;
    const { svg } = await mermaid.render(id, code);
    return svg;
  });
}

export async function renderInteractiveMermaid(
  code: string,
  theme: DiagramTheme,
) {
  return enqueueMermaid(async () => {
    configureMermaid(theme);
    const diagram = await mermaid.mermaidAPI.getDiagramFromText(code);
    const graph = readFlowGraph(diagram.type, diagram.db);
    renderCount += 1;
    const { svg } = await mermaid.render(`mermagic-${renderCount}`, code);
    return { svg, graph };
  });
}

export function formatMermaidError(err: unknown): string {
  if (err && typeof err === "object") {
    const value = err as { message?: string; str?: string };
    const raw = value.str ?? value.message;
    if (raw) {
      return raw.replace(/^Error:\s*/i, "").trim();
    }
  }
  if (err instanceof Error) return err.message;
  return "Could not render diagram";
}
