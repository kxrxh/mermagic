import { type RefObject, useEffect, useRef, useState } from "react";
import {
  type FlowNode,
  NODE_SHAPES,
  type NodeEdit,
  readNodeEdit,
} from "@/lib/flowchart";
import type { FlowConnection } from "@/lib/flowEditing";

export const flowButtonClass =
  "rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-lime-300 disabled:opacity-40";
export const flowFieldClass =
  "mt-1 block w-full rounded-md border border-white/15 bg-[#252629] px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-lime-400/60 disabled:opacity-40";

export function AddNodeForm({
  enabled,
  label,
  shape,
  labelRef,
  onLabelChange,
  onShapeChange,
  onCreate,
  onCancel,
}: {
  enabled: boolean;
  label: string;
  shape: string;
  labelRef: RefObject<HTMLInputElement | null>;
  onLabelChange: (label: string) => void;
  onShapeChange: (shape: string) => void;
  onCreate: () => void;
  onCancel: () => void;
}) {
  return (
    <form
      aria-label="Add flowchart node"
      className="mt-3 space-y-3 border-t border-white/10 px-1 pt-3"
      onSubmit={(event) => {
        event.preventDefault();
        onCreate();
      }}
    >
      <label className="block text-[11px] text-zinc-400">
        Node label
        <input
          ref={labelRef}
          className={flowFieldClass}
          value={label}
          disabled={!enabled}
          onChange={(event) => onLabelChange(event.target.value)}
        />
      </label>
      <label className="block text-[11px] text-zinc-400">
        Shape
        <select
          className={flowFieldClass}
          value={shape}
          disabled={!enabled}
          onChange={(event) => onShapeChange(event.target.value)}
        >
          {NODE_SHAPES.map(([value, title]) => (
            <option key={value} value={value}>
              {title}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          className={`${flowButtonClass} bg-lime-400/15 text-lime-200`}
          disabled={!enabled || !label.trim()}
        >
          Create node
        </button>
        <button type="button" className={flowButtonClass} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function ConnectionForm({
  enabled,
  nodes,
  start,
  end,
  label,
  connection,
  labelRef,
  onSourceChange,
  onDestinationChange,
  onLabelChange,
  onConnectionChange,
  onConnect,
  onCancel,
}: {
  enabled: boolean;
  nodes: FlowNode[];
  start: string | undefined;
  end: string | undefined;
  label: string;
  connection: FlowConnection;
  labelRef: RefObject<HTMLInputElement | null>;
  onSourceChange: (id: string) => void;
  onDestinationChange: (id: string) => void;
  onLabelChange: (label: string) => void;
  onConnectionChange: (connection: FlowConnection) => void;
  onConnect: () => void;
  onCancel: () => void;
}) {
  return (
    <form
      aria-label="Connect flowchart nodes"
      className="mt-3 space-y-3 border-t border-white/10 px-1 pt-3"
      onSubmit={(event) => {
        event.preventDefault();
        onConnect();
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="min-w-0 text-[11px] text-zinc-400">
          From
          <select
            className={flowFieldClass}
            value={start ?? ""}
            disabled={!enabled}
            onChange={(event) => onSourceChange(event.target.value)}
          >
            <option value="" disabled>
              Choose source
            </option>
            {nodes.map((item) => (
              <option key={item.id} value={item.id} disabled={item.id === end}>
                {item.label} ({item.id})
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 text-[11px] text-zinc-400">
          To
          <select
            className={flowFieldClass}
            value={end ?? ""}
            disabled={!enabled || !start}
            onChange={(event) => onDestinationChange(event.target.value)}
          >
            <option value="" disabled>
              Choose destination
            </option>
            {nodes.map((item) => (
              <option
                key={item.id}
                value={item.id}
                disabled={item.id === start}
              >
                {item.label} ({item.id})
              </option>
            ))}
          </select>
        </label>
      </div>
      {end && (
        <>
          <label className="block text-[11px] text-zinc-400">
            Connection label (optional)
            <input
              ref={labelRef}
              className={flowFieldClass}
              value={label}
              disabled={!enabled}
              onChange={(event) => onLabelChange(event.target.value)}
            />
          </label>
          <label className="block text-[11px] text-zinc-400">
            Line style
            <select
              className={flowFieldClass}
              value={connection}
              disabled={!enabled}
              onChange={(event) =>
                onConnectionChange(event.target.value as FlowConnection)
              }
            >
              <option value="arrow">Arrow</option>
              <option value="dashed">Dashed arrow</option>
              <option value="thick">Thick arrow</option>
              <option value="both">Two-way arrow</option>
            </select>
          </label>
        </>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          className={`${flowButtonClass} bg-lime-400/15 text-lime-200`}
          disabled={!enabled || !start || !end}
        >
          Connect nodes
        </button>
        <button type="button" className={flowButtonClass} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function NodeInspector({
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
      className="mt-3 border-t border-white/10 px-1 pt-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (enabled && label.trim()) onEdit({ label });
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="truncate font-mono text-xs text-lime-200">
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
            disabled={!enabled}
            onFocus={onRename}
            onChange={(event) => setLabel(event.target.value)}
            className="min-w-0 flex-1 rounded-md border border-white/15 bg-black/20 px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-lime-400/60"
          />
          <button
            type="submit"
            className={flowButtonClass}
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
            className="mt-1 block w-full rounded-md border border-white/15 bg-[#252629] px-2 py-1.5 text-xs text-zinc-200"
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
