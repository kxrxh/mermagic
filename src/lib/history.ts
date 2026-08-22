import { SAMPLES } from "@/lib/samples";

export type HistoryEntry = {
  id: string;
  title: string;
  code: string;
  themeId: string;
  diagramType: string;
  updatedAt: number;
  pinned?: boolean;
};

export type HistorySnapshot = {
  entries: HistoryEntry[];
  currentId: string | null;
};

const HISTORY_KEY = "mermagic:history:v1";
const CURRENT_KEY = "mermagic:history:current";
const MAX_UNPINNED = 40;

const TYPE_LABELS: Record<string, string> = {
  flowchart: "flowchart",
  graph: "flowchart",
  sequenceDiagram: "sequence",
  classDiagram: "class",
  erDiagram: "er",
  "stateDiagram-v2": "state",
  stateDiagram: "state",
  gantt: "gantt",
  gitGraph: "git",
  pie: "pie",
  journey: "journey",
  mindmap: "mindmap",
  timeline: "timeline",
  kanban: "kanban",
  C4Context: "c4",
  C4Container: "c4",
  C4Component: "c4",
  C4Dynamic: "c4",
  C4Deployment: "c4",
  quadrantChart: "quadrant",
  "xychart-beta": "chart",
  requirementDiagram: "requirement",
  "sankey-beta": "sankey",
  "architecture-beta": "architecture",
  "block-beta": "block",
  "packet-beta": "packet",
  "radar-beta": "radar",
  "treemap-beta": "treemap",
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeCode(code: string): string {
  return code.replace(/\r\n/g, "\n").trim();
}

function splitFrontmatter(code: string): { frontmatter: string; body: string } {
  const normalized = normalizeCode(code);
  if (!normalized.startsWith("---"))
    return { frontmatter: "", body: normalized };
  const end = normalized.indexOf("\n---", 3);
  if (end === -1) return { frontmatter: "", body: normalized };
  const after = normalized.slice(end + 4);
  const body = after.startsWith("\n") ? after.slice(1) : after;
  return { frontmatter: normalized.slice(4, end), body: body.trim() };
}

function cleanTitle(value: string): string {
  return value
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstLabel(body: string): string | null {
  const skip =
    /^(flowchart|graph|sequenceDiagram|classDiagram|erDiagram|stateDiagram(?:-v2)?|gantt|gitGraph|pie|journey|mindmap|timeline|kanban|C4\w*|quadrantChart|xychart-beta|requirementDiagram|sankey-beta|architecture-beta|block-beta|packet-beta|radar-beta|treemap-beta|subgraph|direction|autonumber|accTitle|accDescr)\b/i;

  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("%%") || skip.test(trimmed)) continue;

    const asLabel = trimmed.match(/^participant\s+\S+\s+as\s+(.+)$/i);
    if (asLabel) return cleanTitle(asLabel[1]);

    const actor = trimmed.match(/^(?:actor|participant)\s+(.+)$/i);
    if (actor) return cleanTitle(actor[1]);

    const node = trimmed.match(
      /^\w+\s*[[({](?:["']([^"']+)["']|([^\])}\n]+))[\])}]/,
    );
    if (node) return cleanTitle(node[1] ?? node[2] ?? "");

    const className = trimmed.match(/^class\s+(\w+)/);
    if (className) return className[1];

    const quoted = trimmed.match(/"([^"]{2,80})"/);
    if (quoted) return cleanTitle(quoted[1]);
  }
  return null;
}

export function diagramTypeFromCode(code: string): string {
  const { body } = splitFrontmatter(code);
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("%%")) continue;
    if (/^(accTitle|accDescr)\b/.test(trimmed)) continue;
    const token = trimmed.split(/\s+/)[0] ?? "";
    return TYPE_LABELS[token] ?? (token ? token.toLowerCase() : "diagram");
  }
  return "diagram";
}

export function titleFromCode(code: string): string {
  const { frontmatter, body } = splitFrontmatter(code);
  const yamlTitle = frontmatter.match(/^title:\s*(.+?)\s*$/m);
  if (yamlTitle) {
    const title = cleanTitle(yamlTitle[1]);
    if (title) return title;
  }

  const accTitle = body.match(/^\s*accTitle:\s*(.+)$/m);
  if (accTitle) {
    const title = cleanTitle(accTitle[1]);
    if (title) return title;
  }

  const titleLine = body.match(/^\s*title(?:\s+|:\s*)(.+)$/m);
  if (titleLine) {
    const title = cleanTitle(titleLine[1]);
    if (title) return title;
  }

  const label = firstLabel(body);
  if (label) return label;

  const type = diagramTypeFromCode(code);
  return type === "diagram" ? "Untitled" : type;
}

function isUnmodifiedSample(code: string): boolean {
  const normalized = normalizeCode(code);
  if (!normalized) return false;
  return SAMPLES.some((sample) => normalizeCode(sample.code) === normalized);
}

export function shouldSkipHistory(code: string): boolean {
  return !normalizeCode(code) || isUnmodifiedSample(code);
}

function sortEntries(entries: HistoryEntry[]): HistoryEntry[] {
  return [...entries].sort((a, b) => {
    const pin = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    if (pin) return pin;
    return b.updatedAt - a.updatedAt;
  });
}

function capEntries(entries: HistoryEntry[]): HistoryEntry[] {
  const sorted = sortEntries(entries);
  const pinned = sorted.filter((entry) => entry.pinned);
  const unpinned = sorted.filter((entry) => !entry.pinned);
  return [...pinned, ...unpinned.slice(0, MAX_UNPINNED)];
}

function dropOldestUnpinned(entries: HistoryEntry[]): HistoryEntry[] | null {
  const unpinned = entries.filter((entry) => !entry.pinned);
  if (unpinned.length === 0) return null;
  const oldest = unpinned.reduce((a, b) =>
    a.updatedAt <= b.updatedAt ? a : b,
  );
  return entries.filter((entry) => entry.id !== oldest.id);
}

function withValidCurrent(snapshot: HistorySnapshot): HistorySnapshot {
  if (
    snapshot.currentId &&
    snapshot.entries.some((entry) => entry.id === snapshot.currentId)
  ) {
    return snapshot;
  }
  return { ...snapshot, currentId: null };
}

function parseEntry(raw: unknown): HistoryEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.id !== "string" || !value.id) return null;
  if (typeof value.code !== "string") return null;
  if (typeof value.themeId !== "string") return null;
  const title =
    typeof value.title === "string" && value.title.trim()
      ? value.title
      : titleFromCode(value.code);
  const diagramType =
    typeof value.diagramType === "string" && value.diagramType
      ? value.diagramType
      : diagramTypeFromCode(value.code);
  const updatedAt =
    typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
      ? value.updatedAt
      : Date.now();
  return {
    id: value.id,
    title,
    code: value.code,
    themeId: value.themeId,
    diagramType,
    updatedAt,
    pinned: value.pinned === true ? true : undefined,
  };
}

function writeStorage(key: string, value: string) {
  localStorage.setItem(key, value);
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function loadHistory(): HistorySnapshot {
  let entries: HistoryEntry[] = [];
  try {
    const raw = readStorage(HISTORY_KEY);
    if (raw) {
      const data: unknown = JSON.parse(raw);
      if (Array.isArray(data)) {
        entries = data
          .map(parseEntry)
          .filter((entry): entry is HistoryEntry => entry !== null);
      }
    }
  } catch {
    entries = [];
  }
  const currentId = readStorage(CURRENT_KEY);
  return withValidCurrent({
    entries: sortEntries(entries),
    currentId: currentId || null,
  });
}

export function persistHistory(snapshot: HistorySnapshot): HistorySnapshot {
  let next = withValidCurrent({
    entries: capEntries(snapshot.entries),
    currentId: snapshot.currentId,
  });

  for (;;) {
    try {
      writeStorage(HISTORY_KEY, JSON.stringify(next.entries));
      if (next.currentId) writeStorage(CURRENT_KEY, next.currentId);
      else {
        try {
          localStorage.removeItem(CURRENT_KEY);
        } catch {
          // Ignore quota / private mode.
        }
      }
      return next;
    } catch {
      const dropped = dropOldestUnpinned(next.entries);
      if (!dropped) return next;
      next = withValidCurrent({ ...next, entries: dropped });
    }
  }
}

function makeEntry(
  code: string,
  themeId: string,
  now = Date.now(),
): HistoryEntry {
  return {
    id: newId(),
    title: titleFromCode(code),
    code,
    themeId,
    diagramType: diagramTypeFromCode(code),
    updatedAt: now,
  };
}

function replaceEntry(
  entries: HistoryEntry[],
  id: string,
  update: HistoryEntry,
): HistoryEntry[] {
  return sortEntries(
    entries.map((entry) => (entry.id === id ? update : entry)),
  );
}

function findByCode(
  entries: HistoryEntry[],
  code: string,
): HistoryEntry | undefined {
  const normalized = normalizeCode(code);
  return entries.find((entry) => normalizeCode(entry.code) === normalized);
}

export function upsertCurrent(
  snapshot: HistorySnapshot,
  payload: { code: string; themeId: string },
): HistorySnapshot {
  if (shouldSkipHistory(payload.code)) return snapshot;

  const now = Date.now();
  const current = snapshot.currentId
    ? snapshot.entries.find((entry) => entry.id === snapshot.currentId)
    : undefined;

  if (current) {
    const autoWas = titleFromCode(current.code);
    const title =
      current.title !== autoWas ? current.title : titleFromCode(payload.code);
    const updated: HistoryEntry = {
      ...current,
      title,
      code: payload.code,
      themeId: payload.themeId,
      diagramType: diagramTypeFromCode(payload.code),
      updatedAt: now,
    };
    return {
      currentId: current.id,
      entries: replaceEntry(snapshot.entries, current.id, updated),
    };
  }

  const match = findByCode(snapshot.entries, payload.code);
  if (match) {
    const updated: HistoryEntry = {
      ...match,
      themeId: payload.themeId,
      updatedAt: now,
    };
    return {
      currentId: match.id,
      entries: replaceEntry(snapshot.entries, match.id, updated),
    };
  }

  const created = makeEntry(payload.code, payload.themeId, now);
  return {
    currentId: created.id,
    entries: sortEntries([created, ...snapshot.entries]),
  };
}

export function flushCurrent(
  snapshot: HistorySnapshot,
  payload: { code: string; themeId: string },
): HistorySnapshot {
  return upsertCurrent(snapshot, payload);
}

export function openOrCreate(
  snapshot: HistorySnapshot,
  payload: { code: string; themeId: string },
): HistorySnapshot {
  if (shouldSkipHistory(payload.code)) {
    return { ...snapshot, currentId: null };
  }

  const match = findByCode(snapshot.entries, payload.code);
  if (match) {
    const updated: HistoryEntry = {
      ...match,
      themeId: payload.themeId,
      updatedAt: Date.now(),
    };
    return {
      currentId: match.id,
      entries: replaceEntry(snapshot.entries, match.id, updated),
    };
  }

  const created = makeEntry(payload.code, payload.themeId);
  return {
    currentId: created.id,
    entries: sortEntries([created, ...snapshot.entries]),
  };
}

export function startNew(
  snapshot: HistorySnapshot,
  previous: { code: string; themeId: string },
): HistorySnapshot {
  const flushed = flushCurrent(snapshot, previous);
  return { ...flushed, currentId: null };
}

export function removeEntry(
  snapshot: HistorySnapshot,
  id: string,
): HistorySnapshot {
  return withValidCurrent({
    entries: snapshot.entries.filter((entry) => entry.id !== id),
    currentId: snapshot.currentId === id ? null : snapshot.currentId,
  });
}

export function renameEntry(
  snapshot: HistorySnapshot,
  id: string,
  title: string,
): HistorySnapshot {
  const entry = snapshot.entries.find((item) => item.id === id);
  if (!entry) return snapshot;
  const nextTitle = title.trim() || titleFromCode(entry.code);
  return {
    ...snapshot,
    entries: replaceEntry(snapshot.entries, id, { ...entry, title: nextTitle }),
  };
}

export function togglePin(
  snapshot: HistorySnapshot,
  id: string,
): HistorySnapshot {
  const entry = snapshot.entries.find((item) => item.id === id);
  if (!entry) return snapshot;
  const pinned = entry.pinned ? undefined : true;
  return {
    ...snapshot,
    entries: replaceEntry(snapshot.entries, id, { ...entry, pinned }),
  };
}

export function formatRelativeTime(
  timestamp: number,
  now = Date.now(),
): string {
  const delta = Math.max(0, Math.round((now - timestamp) / 1000));
  if (delta < 45) return "just now";
  if (delta < 90) return "1 min ago";
  if (delta < 3600) return `${Math.round(delta / 60)} min ago`;
  if (delta < 5400) return "1 hour ago";
  if (delta < 86400) return `${Math.round(delta / 3600)} hours ago`;
  if (delta < 172800) return "yesterday";
  if (delta < 86400 * 30) return `${Math.round(delta / 86400)} days ago`;
  return new Date(timestamp).toLocaleDateString();
}
