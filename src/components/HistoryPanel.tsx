import { useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { formatRelativeTime, type HistoryEntry } from "@/lib/history";

type HistoryPanelProps = {
  entries: HistoryEntry[];
  currentId: string | null;
  onRestore: (id: string) => void;
  onPin: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
};

export function HistoryPanel({
  entries,
  currentId,
  onRestore,
  onPin,
  onRename,
  onDelete,
}: HistoryPanelProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      entries.filter((entry) =>
        `${entry.title} ${entry.diagramType} ${entry.code}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [entries, query],
  );
  const pinned = filtered.filter((entry) => entry.pinned);
  const recent = filtered.filter((entry) => !entry.pinned);
  return (
    <div className="diagram-library">
      <label className="library-search">
        <Icon name="search" />
        <input
          aria-label="Search diagrams"
          placeholder="Search diagrams…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {filtered.length === 0 ? (
        <div className="library-empty">
          <Icon name={entries.length ? "search" : "diagram"} />
          <p>
            {entries.length
              ? "No diagrams found"
              : "Your next idea belongs here."}
          </p>
          <span>
            {entries.length
              ? "Try another title or keyword."
              : "Diagrams are saved as you make them your own."}
          </span>
        </div>
      ) : null}
      {[
        { title: "Pinned", items: pinned },
        { title: "Recent diagrams", items: recent },
      ].map((group) =>
        group.items.length ? (
          <section className="library-group" key={group.title}>
            <div className="section-label">
              {group.title}
              <span>{group.items.length}</span>
            </div>
            <ul>
              {group.items.map((entry) => (
                <HistoryRow
                  key={entry.id}
                  entry={entry}
                  current={entry.id === currentId}
                  onRestore={() => onRestore(entry.id)}
                  onPin={() => onPin(entry.id)}
                  onRename={(title) => onRename(entry.id, title)}
                  onDelete={() => onDelete(entry.id)}
                />
              ))}
            </ul>
          </section>
        ) : null,
      )}
    </div>
  );
}

function HistoryRow({
  entry,
  current,
  onRestore,
  onPin,
  onRename,
  onDelete,
}: {
  entry: HistoryEntry;
  current: boolean;
  onRestore: () => void;
  onPin: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(entry.title);
  const cancelRename = useRef(false);
  const save = () => {
    if (!cancelRename.current && draft.trim()) onRename(draft.trim());
    setRenaming(false);
  };
  return (
    <li className={`history-row ${current ? "is-current" : ""}`}>
      <div className="history-main">
        <span className="history-icon">
          <Icon name="diagram" />
        </span>
        {renaming ? (
          <input
            aria-label="Diagram title"
            className="rename-input"
            value={draft}
            ref={(element) => element?.focus()}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={save}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                cancelRename.current = true;
                setRenaming(false);
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="history-open"
            onClick={onRestore}
            aria-current={current ? "page" : undefined}
          >
            <strong>{entry.title}</strong>
            <span>{formatRelativeTime(entry.updatedAt)}</span>
          </button>
        )}
      </div>
      <div className="history-actions">
        <button
          type="button"
          title={entry.pinned ? "Unpin diagram" : "Pin diagram"}
          aria-label={`${entry.pinned ? "Unpin" : "Pin"} ${entry.title}`}
          aria-pressed={!!entry.pinned}
          onClick={onPin}
        >
          <Icon name="star" />
        </button>
        <button
          type="button"
          title="Rename diagram"
          aria-label={`Rename ${entry.title}`}
          onClick={() => {
            setDraft(entry.title);
            cancelRename.current = false;
            setRenaming(true);
          }}
        >
          <Icon name="edit" />
        </button>
        <button
          type="button"
          title="Delete diagram"
          aria-label={`Delete ${entry.title}`}
          onClick={onDelete}
        >
          <Icon name="trash" />
        </button>
      </div>
    </li>
  );
}
