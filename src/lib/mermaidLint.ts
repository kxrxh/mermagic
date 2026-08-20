import { type Diagnostic, linter, lintGutter } from "@codemirror/lint";
import type { Text } from "@codemirror/state";
import { formatMermaidError, parseMermaid } from "@/lib/mermaid";

type Loc = {
  first_line?: number;
  last_line?: number;
  first_column?: number;
  last_column?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function frontmatterLineOffset(source: string): number {
  const match = source.match(/^---[ \t]*\n[\s\S]*?\n---[ \t]*(?:\n|$)/);
  if (!match) return 0;
  return match[0].split("\n").length - 1;
}

function getHash(err: unknown): Record<string, unknown> | undefined {
  if (!isRecord(err)) return undefined;
  if (isRecord(err.hash)) return err.hash;
  if (isRecord(err.error) && isRecord(err.error.hash)) return err.error.hash;
  return undefined;
}

function locFromHash(
  hash: Record<string, unknown> | undefined,
): Loc | undefined {
  if (!hash) return undefined;
  if (isRecord(hash.loc)) {
    return {
      first_line: asFiniteNumber(hash.loc.first_line),
      last_line: asFiniteNumber(hash.loc.last_line),
      first_column: asFiniteNumber(hash.loc.first_column),
      last_column: asFiniteNumber(hash.loc.last_column),
    };
  }
  const line = asFiniteNumber(hash.line);
  if (line === undefined) return undefined;
  return {
    first_line: line + 1,
    last_line: line + 1,
    first_column: asFiniteNumber(hash.column) ?? 0,
  };
}

function locFromMessage(message: string): Loc | undefined {
  const match = message.match(/\bon line (\d+)(?:, column (\d+))?/i);
  if (!match) return undefined;
  const line = Number(match[1]);
  const column = match[2] ? Number(match[2]) : undefined;
  return {
    first_line: line,
    last_line: line,
    first_column: column === undefined ? 0 : Math.max(0, column - 1),
  };
}

function locFromLangium(err: unknown): Loc | undefined {
  if (!isRecord(err) || !isRecord(err.result)) return undefined;

  const lexerErrors = Array.isArray(err.result.lexerErrors)
    ? err.result.lexerErrors
    : [];
  const firstLexer = lexerErrors.find(isRecord);
  if (firstLexer) {
    const line = asFiniteNumber(firstLexer.line);
    const column = asFiniteNumber(firstLexer.column);
    if (line !== undefined) {
      const col = column === undefined ? 0 : Math.max(0, column - 1);
      const length = asFiniteNumber(firstLexer.length) ?? 1;
      return {
        first_line: line,
        last_line: line,
        first_column: col,
        last_column: col + length,
      };
    }
  }

  const parserErrors = Array.isArray(err.result.parserErrors)
    ? err.result.parserErrors
    : [];
  const firstParser = parserErrors.find(isRecord);
  if (firstParser && isRecord(firstParser.token)) {
    const token = firstParser.token;
    const startLine = asFiniteNumber(token.startLine);
    if (startLine !== undefined) {
      const startCol = asFiniteNumber(token.startColumn);
      const endCol = asFiniteNumber(token.endColumn);
      return {
        first_line: startLine,
        last_line: asFiniteNumber(token.endLine) ?? startLine,
        first_column: startCol === undefined ? 0 : Math.max(0, startCol - 1),
        last_column: endCol === undefined ? undefined : Math.max(0, endCol),
      };
    }
  }

  return undefined;
}

function rangeFromLoc(doc: Text, loc: Loc, lineOffset: number) {
  const firstLine = clamp((loc.first_line ?? 1) + lineOffset, 1, doc.lines);
  const lastLine = clamp(
    (loc.last_line ?? firstLine) + lineOffset,
    firstLine,
    doc.lines,
  );
  const startLine = doc.line(firstLine);
  const endLine = doc.line(lastLine);
  const fromCol = clamp(loc.first_column ?? 0, 0, startLine.length);
  const toCol = clamp(loc.last_column ?? endLine.length, 0, endLine.length);
  let from = startLine.from + fromCol;
  let to = endLine.from + toCol;
  if (to <= from) {
    to = startLine.to;
  }
  if (to <= from && startLine.length > 0) {
    from = startLine.from;
    to = startLine.to;
  }
  return {
    from: clamp(from, 0, doc.length),
    to: clamp(to, 0, doc.length),
  };
}

function diagnosticMessage(err: unknown): string {
  const raw = formatMermaidError(err);
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const useful = lines.filter(
    (line) =>
      !line.startsWith("...") &&
      !/^-*\^$/.test(line) &&
      !/^(?:Parse|Lexer) error on line \d+:?$/i.test(line),
  );
  return useful.join("\n") || lines[0] || "Invalid Mermaid syntax";
}

function diagnosticFromError(doc: Text, err: unknown): Diagnostic {
  const message = diagnosticMessage(err);
  const lineOffset = frontmatterLineOffset(doc.toString());
  const loc =
    locFromLangium(err) ??
    locFromHash(getHash(err)) ??
    locFromMessage(message) ??
    locFromMessage(formatMermaidError(err));
  const range = loc
    ? rangeFromLoc(doc, loc, lineOffset)
    : rangeFromLoc(doc, { first_line: 1, last_line: 1 }, lineOffset);

  return {
    ...range,
    severity: "error",
    source: "mermaid",
    message,
  };
}

export const mermaidLintExtensions = [
  linter(
    async (view) => {
      const source = view.state.doc.toString();
      if (!source.trim()) return [];
      try {
        await parseMermaid(source);
        return [];
      } catch (err) {
        return [diagnosticFromError(view.state.doc, err)];
      }
    },
    { delay: 300 },
  ),
  lintGutter(),
];
