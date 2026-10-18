import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import {
  AddNodeForm,
  ConnectionForm,
  flowButtonClass,
  flowFieldClass,
  NodeInspector,
} from "@/components/FlowEditingForms";
import { type FlowGraph, type NodeEdit, tracePaths } from "@/lib/flowchart";
import {
  addFlowNode,
  connectFlowNodes,
  type FlowConnection,
  type FlowDirection,
  readFlowDirection,
  setFlowDirection,
} from "@/lib/flowEditing";

type Props = {
  host: RefObject<HTMLDivElement | null>;
  svg: string;
  graph: FlowGraph;
  code: string;
  enabled: boolean;
  onSelectNode: (id: string) => void;
  onEditNode: (id: string, patch: NodeEdit) => void;
  onChange: (code: string) => void;
};

export function FlowInteractions({
  host,
  svg,
  graph,
  code,
  enabled,
  onSelectNode,
  onEditNode,
  onChange,
}: Props) {
  const [mode, setMode] = useState<"edit" | "add" | "connect" | "trace">(
    "edit",
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [endpoints, setEndpoints] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [shape, setShape] = useState("rect");
  const [edgeLabel, setEdgeLabel] = useState("");
  const [connection, setConnection] = useState<FlowConnection>("arrow");
  const [error, setError] = useState<string | null>(null);
  const pendingNode = useRef<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLInputElement>(null);
  const callbacks = useRef({ onSelectNode });
  callbacks.current = { onSelectNode };
  const node = graph.nodes.find((item) => item.id === selected);
  const start = endpoints[0];
  const end = endpoints[1];
  const direction = readFlowDirection(code);
  const trace = useMemo(
    () =>
      mode === "trace" && start && end ? tracePaths(graph, start, end) : null,
    [graph, start, end, mode],
  );

  useEffect(() => {
    if (
      pendingNode.current &&
      graph.nodes.some((item) => item.id === pendingNode.current)
    ) {
      callbacks.current.onSelectNode(pendingNode.current);
      pendingNode.current = null;
    }
    if (
      selected &&
      selected !== pendingNode.current &&
      !graph.nodes.some((item) => item.id === selected)
    )
      setSelected(null);
    if (endpoints.some((id) => !graph.nodes.some((item) => item.id === id)))
      setEndpoints([]);
  }, [graph, selected, endpoints]);

  useEffect(() => {
    if (mode === "add" || (mode === "connect" && end))
      labelRef.current?.focus();
  }, [mode, end]);

  const changeMode = (next: typeof mode) => {
    setMode(next);
    setEndpoints([]);
    setRenaming(false);
    setError(null);
  };

  const cancel = () => {
    changeMode("edit");
    editButtonRef.current?.focus();
  };

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
        `${item.label} (${item.id}). ${mode === "trace" ? "Select flow endpoint" : mode === "connect" ? "Select connection endpoint" : "Select node; press Enter to edit label"}`,
      );
      element.setAttribute("aria-disabled", String(!enabled));
      element.classList.toggle(
        "flow-selected",
        mode === "edit" && item.id === selected,
      );
      element.classList.toggle(
        "flow-start",
        (mode === "trace" || mode === "connect") && item.id === start,
      );
      element.classList.toggle(
        "flow-end",
        (mode === "trace" || mode === "connect") && item.id === end,
      );
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
        pendingNode.current = null;
        if (mode === "connect") {
          if (item.id === start) {
            setError("Choose a different node as the destination.");
            return;
          }
          setError(null);
          setEndpoints(start ? [start, item.id] : [item.id]);
        } else if (mode === "trace") {
          setEndpoints((current) =>
            current.length === 1 && current[0] !== item.id
              ? [current[0], item.id]
              : [item.id],
          );
        } else {
          setMode("edit");
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
      setError(null);
      setMode("edit");
      pendingNode.current = null;
      if (panelRef.current?.contains(document.activeElement))
        editButtonRef.current?.focus();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  return (
    <div className="flow-interactions pointer-events-none absolute inset-0 z-10 flex items-start p-4">
      <div
        ref={panelRef}
        className="flow-mode-panel pointer-events-auto max-h-full w-full max-w-sm overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-[#202123]/95 p-2 shadow-xl"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            ref={editButtonRef}
            type="button"
            className={`${flowButtonClass} ${mode === "edit" ? "bg-lime-400/15 text-lime-200" : ""}`}
            aria-pressed={mode === "edit"}
            onClick={() => changeMode("edit")}
          >
            Edit nodes
          </button>
          <button
            type="button"
            className={`${flowButtonClass} ${mode === "add" ? "bg-lime-400/15 text-lime-200" : ""}`}
            aria-pressed={mode === "add"}
            disabled={!enabled}
            onClick={() => changeMode("add")}
          >
            Add node
          </button>
          <button
            type="button"
            className={`${flowButtonClass} ${mode === "connect" ? "bg-lime-400/15 text-lime-200" : ""}`}
            aria-pressed={mode === "connect"}
            disabled={!enabled || graph.nodes.length < 2}
            onClick={() => changeMode("connect")}
          >
            Connect
          </button>
          <button
            type="button"
            className={`${flowButtonClass} ${mode === "trace" ? "bg-lime-400/15 text-lime-200" : ""}`}
            aria-pressed={mode === "trace"}
            disabled={!enabled}
            onClick={() => changeMode("trace")}
          >
            Follow flow
          </button>
          {(node || endpoints.length > 0) && (
            <button
              type="button"
              className={flowButtonClass}
              onClick={() => {
                setSelected(null);
                setEndpoints([]);
                setRenaming(false);
                setError(null);
                pendingNode.current = null;
              }}
            >
              Clear
            </button>
          )}
        </div>
        <label className="mt-2 flex items-center gap-2 px-1 text-[11px] text-zinc-400">
          Layout
          <select
            aria-label="Flowchart layout direction"
            className={`${flowFieldClass} mt-0 min-w-0 flex-1`}
            value={direction ?? ""}
            disabled={!enabled || direction === null}
            onChange={(event) => {
              try {
                onChange(
                  setFlowDirection(code, event.target.value as FlowDirection),
                );
                setError(null);
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : "Could not change the layout.",
                );
              }
            }}
          >
            {direction === null && <option value="">Current direction</option>}
            <option value="TB">Top to bottom</option>
            <option value="LR">Left to right</option>
            <option value="BT">Bottom to top</option>
            <option value="RL">Right to left</option>
          </select>
        </label>
        <p
          className="mt-2 max-w-80 break-words px-1 text-[11px] leading-relaxed text-zinc-400"
          role="status"
        >
          {!enabled
            ? "Updating diagram…"
            : mode === "edit"
              ? "Click a node to find its source. Double-click to rename."
              : mode === "add"
                ? "Add a node, then connect it to your diagram."
                : mode === "connect"
                  ? !start
                    ? "Choose the source node, then the destination."
                    : !end
                      ? `From ${start} · Now choose a destination.`
                      : `${start} → ${end} · Click another node to change the destination.`
                  : !start
                    ? "Choose a starting node, then a destination."
                    : !end
                      ? `From ${start} · Now choose a destination.`
                      : trace?.count
                        ? `${start} → ${end} · ${trace.count}${trace.limited ? "+" : ""} path${trace.count === 1 ? "" : "s"}${trace.limited ? " (search limit reached)" : ""}`
                        : `No path from ${start} to ${end}. Try swapping direction.`}
        </p>
        {error && (
          <p
            role="alert"
            className="mt-2 break-words px-1 text-xs text-red-300"
          >
            {error}
          </p>
        )}
        {mode === "add" && (
          <AddNodeForm
            enabled={enabled}
            label={newLabel}
            shape={shape}
            labelRef={labelRef}
            onLabelChange={setNewLabel}
            onShapeChange={setShape}
            onCreate={() => {
              if (!enabled || !newLabel.trim()) return;
              try {
                const result = addFlowNode(code, graph, {
                  label: newLabel,
                  shape,
                });
                pendingNode.current = result.id;
                setSelected(result.id);
                onChange(result.code);
                setNewLabel("");
                changeMode("edit");
                editButtonRef.current?.focus();
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : "Could not add the node.",
                );
              }
            }}
            onCancel={cancel}
          />
        )}
        {mode === "connect" && (
          <ConnectionForm
            enabled={enabled}
            nodes={graph.nodes}
            start={start}
            end={end}
            label={edgeLabel}
            connection={connection}
            labelRef={labelRef}
            onSourceChange={(id) => {
              setEndpoints(end ? [id, end] : [id]);
              setError(null);
              onSelectNode(id);
            }}
            onDestinationChange={(id) => {
              if (!start) return;
              setEndpoints([start, id]);
              setError(null);
              onSelectNode(id);
            }}
            onLabelChange={setEdgeLabel}
            onConnectionChange={setConnection}
            onConnect={() => {
              if (!enabled || !start || !end) return;
              try {
                onChange(
                  connectFlowNodes(
                    code,
                    graph,
                    start,
                    end,
                    edgeLabel,
                    connection,
                  ),
                );
                setSelected(end);
                setEdgeLabel("");
                changeMode("edit");
                editButtonRef.current?.focus();
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : "Could not connect the nodes.",
                );
              }
            }}
            onCancel={cancel}
          />
        )}
        {mode === "trace" && end && (
          <button
            type="button"
            className={`${flowButtonClass} mt-2`}
            disabled={!enabled}
            onClick={() => setEndpoints([end, start])}
          >
            Swap direction
          </button>
        )}
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
    </div>
  );
}
