import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import {
  type FlowGraph,
  type FlowNode,
  NODE_SHAPES,
  type NodeEdit,
  readNodeEdit,
  tracePaths,
} from "@/lib/flowchart";

type Props = {
  host: RefObject<HTMLDivElement | null>;
  svg: string;
  graph: FlowGraph;
  code: string;
  enabled: boolean;
  onSelectNode: (id: string) => void;
  onEditNode: (id: string, patch: NodeEdit) => void;
};

const button =
  "rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:opacity-40";

export function FlowInteractions({
  host,
  svg,
  graph,
  code,
  enabled,
  onSelectNode,
  onEditNode,
}: Props) {
  const [mode, setMode] = useState<"edit" | "trace">("edit");
  const [selected, setSelected] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [endpoints, setEndpoints] = useState<string[]>([]);
  const callbacks = useRef({ onSelectNode });
  callbacks.current = { onSelectNode };
  const node = graph.nodes.find((item) => item.id === selected);
  const start = endpoints[0];
  const end = endpoints[1];
  const trace = useMemo(
    () =>
      mode === "trace" && start && end ? tracePaths(graph, start, end) : null,
    [graph, start, end, mode],
  );

  useEffect(() => {
    if (selected && !graph.nodes.some((item) => item.id === selected))
      setSelected(null);
    if (endpoints.some((id) => !graph.nodes.some((item) => item.id === id)))
      setEndpoints([]);
  }, [graph, selected, endpoints]);

  useEffect(() => {
    const root = host.current;
    if (!root || !svg) return;
    const cleanups: (() => void)[] = [];
    const dim = (element: Element, value: boolean) =>
      element.classList.toggle("flow-dimmed", value);
    for (const element of root.querySelectorAll<SVGGElement>("g.node")) {
      const item = graph.nodes.find(
        (candidate) =>
          element.dataset.id === candidate.id ||
          (candidate.domId &&
            (element.id === candidate.domId ||
              element.id.endsWith(`-${candidate.domId}`))),
      );
      if (!item) continue;
      element.dataset.flowNode = item.id;
      element.setAttribute("role", "button");
      element.setAttribute("tabindex", enabled ? "0" : "-1");
      element.setAttribute(
        "aria-label",
        `${item.label} (${item.id}). ${mode === "trace" ? "Select flow endpoint" : "Select node; press Enter to edit label"}`,
      );
      element.setAttribute("aria-disabled", String(!enabled));
      element.classList.toggle(
        "flow-selected",
        mode === "edit" && item.id === selected,
      );
      element.classList.toggle(
        "flow-start",
        mode === "trace" && item.id === start,
      );
      element.classList.toggle("flow-end", mode === "trace" && item.id === end);
      dim(
        element,
        Boolean(
          trace &&
            !trace.nodes.has(item.id) &&
            item.id !== start &&
            item.id !== end,
        ),
      );
      const select = (rename = false) => {
        if (!enabled) return;
        callbacks.current.onSelectNode(item.id);
        if (mode === "trace") {
          setEndpoints((current) =>
            current.length === 1 && current[0] !== item.id
              ? [current[0], item.id]
              : [item.id],
          );
        } else {
          setSelected(item.id);
          setRenaming(rename);
        }
      };
      const click = (event: MouseEvent) => {
        event.stopPropagation();
        select();
      };
      const doubleClick = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (mode === "edit") select(true);
      };
      const keydown = (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          select(event.key === "Enter");
        }
      };
      element.addEventListener("click", click);
      element.addEventListener("dblclick", doubleClick);
      element.addEventListener("keydown", keydown);
      cleanups.push(() => {
        element.removeEventListener("click", click);
        element.removeEventListener("dblclick", doubleClick);
        element.removeEventListener("keydown", keydown);
      });
    }
    for (const element of root.querySelectorAll<SVGElement>(
      "[data-edge], .edgeLabel",
    )) {
      const id =
        element.dataset.id ??
        element.querySelector<SVGElement>("[data-id]")?.dataset.id;
      dim(element, Boolean(trace && (!id || !trace.edges.has(id))));
      element.classList.toggle(
        "flow-path",
        Boolean(trace && id && trace.edges.has(id)),
      );
    }
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [host, svg, graph, enabled, mode, selected, start, end, trace]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSelected(null);
      setEndpoints([]);
      setRenaming(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-start justify-between gap-3 p-3">
      <div className="pointer-events-auto max-w-full rounded-xl border border-white/15 bg-[#11151e]/95 p-2 shadow-xl backdrop-blur">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className={`${button} ${mode === "edit" ? "bg-cyan-400/15 text-cyan-200" : ""}`}
            aria-pressed={mode === "edit"}
            onClick={() => setMode("edit")}
          >
            Edit nodes
          </button>
          <button
            type="button"
            className={`${button} ${mode === "trace" ? "bg-cyan-400/15 text-cyan-200" : ""}`}
            aria-pressed={mode === "trace"}
            onClick={() => {
              setMode("trace");
              setRenaming(false);
            }}
          >
            Follow flow
          </button>
          {(node || endpoints.length > 0) && (
            <button
              type="button"
              className={button}
              onClick={() => {
                setSelected(null);
                setEndpoints([]);
                setRenaming(false);
              }}
            >
              Clear
            </button>
          )}
        </div>
        <p
          className="mt-2 max-w-80 px-1 text-[11px] leading-relaxed text-zinc-400"
          role="status"
        >
          {!enabled
            ? "Updating diagram…"
            : mode === "edit"
              ? "Click a node to find its source. Double-click to rename."
              : !start
                ? "Choose a starting node, then a destination."
                : !end
                  ? `From ${start} · Now choose a destination.`
                  : trace?.count
                    ? `${start} → ${end} · ${trace.count}${trace.limited ? "+" : ""} path${trace.count === 1 ? "" : "s"}${trace.limited ? " (search limit reached)" : ""}`
                    : `No path from ${start} to ${end}. Try swapping direction.`}
        </p>
        {mode === "trace" && end && (
          <button
            type="button"
            className={`${button} mt-2`}
            onClick={() => setEndpoints([end, start])}
          >
            Swap direction
          </button>
        )}
      </div>
      {mode === "edit" && node && (
        <NodeInspector
          key={node.id}
          node={node}
          code={code}
          enabled={enabled}
          renaming={renaming}
          onRename={() => setRenaming(true)}
          onEdit={(patch) => onEditNode(node.id, patch)}
          onClose={() => {
            setSelected(null);
            setRenaming(false);
          }}
        />
      )}
    </div>
  );
}

function NodeInspector({
  node,
  code,
  enabled,
  renaming,
  onRename,
  onEdit,
  onClose,
}: {
  node: FlowNode;
  code: string;
  enabled: boolean;
  renaming: boolean;
  onRename: () => void;
  onEdit: (patch: NodeEdit) => void;
  onClose: () => void;
}) {
  const overrides = readNodeEdit(code, node.id);
  const currentLabel = overrides.label ?? node.label;
  const [label, setLabel] = useState(currentLabel);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setLabel(currentLabel);
  }, [currentLabel]);
  useEffect(() => {
    if (renaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [renaming]);
  return (
    <form
      aria-label={`Edit node ${node.id}`}
      className="pointer-events-auto w-full max-w-sm rounded-xl border border-white/15 bg-[#11151e]/95 p-3 shadow-xl backdrop-blur"
      onSubmit={(event) => {
        event.preventDefault();
        if (enabled && label.trim()) onEdit({ label });
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="truncate font-mono text-xs text-cyan-200">
          {node.id}
        </span>
        <button
          type="button"
          aria-label="Close node editor"
          className="text-zinc-400 hover:text-white"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <label className="block text-[11px] text-zinc-400">
        Label
        <div className="mt-1 flex gap-2">
          <input
            ref={inputRef}
            value={label}
            onFocus={onRename}
            onChange={(event) => setLabel(event.target.value)}
            className="min-w-0 flex-1 rounded-md border border-white/15 bg-black/20 px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-cyan-400/60"
          />
          <button
            type="submit"
            className={button}
            disabled={!enabled || !label.trim() || label === currentLabel}
          >
            Apply
          </button>
        </div>
      </label>
      <div className="mt-3 flex items-end gap-3">
        <label className="flex-1 text-[11px] text-zinc-400">
          Shape
          <select
            aria-label="Node shape"
            className="mt-1 block w-full rounded-md border border-white/15 bg-[#191e29] px-2 py-1.5 text-xs text-zinc-200"
            value={overrides.shape ?? ""}
            disabled={!enabled}
            onChange={(event) => onEdit({ shape: event.target.value })}
          >
            <option value="" disabled>
              Current ({node.shape ?? "rectangle"})
            </option>
            {NODE_SHAPES.map(([value, title]) => (
              <option key={value} value={value}>
                {title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-zinc-400">
          Fill
          <input
            aria-label="Node fill color"
            type="color"
            value={overrides.color ?? "#22d3ee"}
            disabled={!enabled}
            onChange={(event) => onEdit({ color: event.target.value })}
            className="mt-1 block h-8 w-10 cursor-pointer rounded border border-white/15 bg-transparent p-0.5"
          />
        </label>
      </div>
    </form>
  );
}
