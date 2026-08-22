import { useEffect, useMemo, useRef, useState } from "react";
import { formatRelativeTime, type HistoryEntry } from "@/lib/history";

type HistoryPanelProps = {
  entries: HistoryEntry[];
  currentId: string | null;
  embedded?: boolean;
  onNew: () => void;
  onRestore: (id: string) => void;
  onPin: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
};

export function HistoryPanel({
  entries,
  currentId,
  embedded = false,
  onNew,
  onRestore,
  onPin,
  onRename,
  onDelete,
}: HistoryPanelProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const current = entries.find((entry) => entry.id === currentId);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setRenamingId(null);
      return;
    }
    searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (renamingId) setRenamingId(null);
        else setOpen(false);
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open, renamingId]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) => {
      return (
        entry.title.toLowerCase().includes(needle) ||
        entry.diagramType.toLowerCase().includes(needle) ||
        entry.code.toLowerCase().includes(needle)
      );
    });
  }, [entries, query]);

  return (
    <div ref={rootRef} className="relative flex h-8 min-w-0">
      <button
        type="button"
        title={current ? `History · ${current.title}` : "Diagram history"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className={`flex h-full max-w-52 items-center gap-1.5 px-2.5 text-xs font-medium transition ${
          embedded
            ? `rounded-r-md border border-l-0 border-white/10 ${
                open
                  ? "bg-cyan-400/10 text-cyan-100"
                  : "bg-white/[0.04] text-zinc-200 hover:bg-white/10"
              }`
            : `rounded-md border ${
                open
                  ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                  : "border-white/10 bg-white/[0.04] text-zinc-200 hover:border-white/20 hover:bg-white/10"
              }`
        }`}
      >
        <HistoryIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
        <span className="min-w-0 flex-1 truncate text-left">
          {current?.title ?? "History"}
        </span>
        {current ? null : entries.length > 0 ? (
          <span className="rounded bg-white/10 px-1 py-px text-[10px] font-medium tabular-nums text-zinc-400">
            {entries.length}
          </span>
        ) : null}
        <ChevronIcon open={open} />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Diagram history"
          className="absolute right-0 z-30 mt-1.5 flex w-[380px] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#14171f] shadow-2xl shadow-black/50 ring-1 ring-white/5"
        >
          <div className="flex items-center justify-between px-3 pt-2.5 pb-2">
            <div className="text-[10px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
              Recent
            </div>
            {entries.length > 0 ? (
              <span className="text-[10px] tabular-nums text-zinc-600">
                {`${entries.length} diagram${entries.length === 1 ? "" : "s"}`}
              </span>
            ) : null}
          </div>
          <div className="px-2 pb-2">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-zinc-600" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search diagrams…"
                className="h-8 w-full rounded-md border border-white/10 bg-[#0c0e12] pr-2 pl-8 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-cyan-400/40"
              />
            </div>
          </div>
          <ul className="max-h-80 overflow-y-auto px-1.5 pb-1.5">
            {filtered.length === 0 ? (
              <li className="flex flex-col items-center px-4 py-8 text-center">
                <HistoryIcon className="mb-2 h-5 w-5 text-zinc-600" />
                <p className="text-xs font-medium text-zinc-400">
                  {entries.length === 0
                    ? "Nothing saved yet"
                    : "No matching diagrams"}
                </p>
                <p className="mt-1 text-[11px] text-zinc-600">
                  {entries.length === 0
                    ? "Edits are saved automatically as you type."
                    : "Try a different title, type, or keyword."}
                </p>
                {entries.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      onNew();
                      setOpen(false);
                    }}
                    className="mt-3 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:bg-white/10"
                  >
                    New diagram
                  </button>
                ) : null}
              </li>
            ) : (
              filtered.map((entry) => (
                <HistoryRow
                  key={entry.id}
                  entry={entry}
                  current={entry.id === currentId}
                  renaming={renamingId === entry.id}
                  onRestore={() => {
                    onRestore(entry.id);
                    setOpen(false);
                  }}
                  onPin={() => onPin(entry.id)}
                  onRenameStart={() => setRenamingId(entry.id)}
                  onRenameSave={(title) => {
                    onRename(entry.id, title);
                    setRenamingId(null);
                  }}
                  onRenameCancel={() => setRenamingId(null)}
                  onDelete={() => onDelete(entry.id)}
                />
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

type HistoryRowProps = {
  entry: HistoryEntry;
  current: boolean;
  renaming: boolean;
  onRestore: () => void;
  onPin: () => void;
  onRenameStart: () => void;
  onRenameSave: (title: string) => void;
  onRenameCancel: () => void;
  onDelete: () => void;
};

function HistoryRow({
  entry,
  current,
  renaming,
  onRestore,
  onPin,
  onRenameStart,
  onRenameSave,
  onRenameCancel,
  onDelete,
}: HistoryRowProps) {
  const [draft, setDraft] = useState(entry.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!renaming) return;
    setDraft(entry.title);
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [renaming, entry.title]);

  return (
    <li>
      <div
        className={`group relative flex items-start gap-0.5 rounded-lg px-1 py-1.5 ${
          current ? "bg-cyan-400/10" : "hover:bg-white/[0.06]"
        }`}
      >
        {current ? (
          <span className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-cyan-400/80" />
        ) : null}
        <button
          type="button"
          title={entry.pinned ? "Unpin" : "Pin"}
          onClick={onPin}
          className={`mt-0.5 shrink-0 rounded p-1 ${
            entry.pinned
              ? "text-cyan-300 hover:text-cyan-100"
              : "text-zinc-600 hover:text-zinc-300"
          }`}
        >
          <PinIcon filled={Boolean(entry.pinned)} />
        </button>
        <div className="min-w-0 flex-1">
          {renaming ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => onRenameSave(draft)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.stopPropagation();
                  onRenameSave(draft);
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  onRenameCancel();
                }
              }}
              className="w-full rounded border border-cyan-400/40 bg-[#0c0e12] px-1.5 py-0.5 text-xs text-zinc-100 outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={onRestore}
              className="block w-full truncate text-left text-xs font-medium text-zinc-100"
            >
              {entry.title}
            </button>
          )}
          <button
            type="button"
            onClick={onRestore}
            className="mt-0.5 flex w-full items-center gap-1.5 text-left text-[10px] text-zinc-500"
          >
            <span className="rounded bg-white/8 px-1 py-px font-medium tracking-wide text-zinc-400 uppercase">
              {entry.diagramType}
            </span>
            <span className="truncate">
              {formatRelativeTime(entry.updatedAt)}
            </span>
          </button>
        </div>
        <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            title="Rename"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onRenameStart}
            className="rounded p-1 text-zinc-500 hover:text-zinc-200"
          >
            <RenameIcon />
          </button>
          <button
            type="button"
            title="Delete"
            onClick={onDelete}
            className="rounded p-1 text-zinc-500 hover:text-red-300"
          >
            <DeleteIcon />
          </button>
        </div>
      </div>
    </li>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className ?? "h-3.5 w-3.5"}
      aria-hidden="true"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        d="M8 3.2a4.8 4.8 0 1 1-3.4 1.4M8 5.4V8l1.8 1.2M4.6 3.2 3.2 4.8 4.8 6.2"
      />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-3 w-3 shrink-0 text-zinc-500 transition ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        d="M4.5 6.2 8 9.8l3.5-3.6"
      />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-3.5 w-3.5 ${className ?? ""}`}
      aria-hidden="true"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        d="M7 11.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zM10.4 10.4 13.2 13.2"
      />
    </svg>
  );
}

function PinIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        d="M8 1.8 9.7 5.3l3.8.5-2.8 2.7.7 3.8L8 10.5l-3.4 1.8.7-3.8-2.8-2.7 3.8-.5z"
      />
    </svg>
  );
}

function RenameIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        d="M10.2 3.2 12.8 5.8M3 13l1.1-4.1L10.8 2.2l2.6 2.6-6.7 6.7z"
      />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 4.5h10M6 4.5V3h4v1.5M4.5 4.5 5.2 13h5.6l.7-8.5"
      />
    </svg>
  );
}
