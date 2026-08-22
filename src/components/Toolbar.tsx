import { type ReactNode, useState } from "react";
import { HistoryPanel } from "@/components/HistoryPanel";
import { ThemePicker } from "@/components/ThemePicker";
import type { HistoryEntry } from "@/lib/history";
import { SAMPLES } from "@/lib/samples";

type ToolbarProps = {
  themeId: string;
  onThemeChange: (id: string) => void;
  onSampleSelect: (id: string) => void;
  history: HistoryEntry[];
  currentHistoryId: string | null;
  onHistoryNew: () => void;
  onHistoryRestore: (id: string) => void;
  onHistoryPin: (id: string) => void;
  onHistoryRename: (id: string, title: string) => void;
  onHistoryDelete: (id: string) => void;
  canExport: boolean;
  includeBackground: boolean;
  onIncludeBackgroundChange: (value: boolean) => void;
  onExportSvg: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  onCopyPng: () => Promise<void>;
  canShare: boolean;
  onShare: () => Promise<void>;
};

export function Toolbar({
  themeId,
  onThemeChange,
  onSampleSelect,
  history,
  currentHistoryId,
  onHistoryNew,
  onHistoryRestore,
  onHistoryPin,
  onHistoryRename,
  onHistoryDelete,
  canExport,
  includeBackground,
  onIncludeBackgroundChange,
  onExportSvg,
  onExportPng,
  onExportPdf,
  onCopyPng,
  canShare,
  onShare,
}: ToolbarProps) {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  return (
    <header className="flex flex-nowrap items-center gap-3 border-b border-white/10 bg-[#0d0f14] px-3 py-2">
      <div className="flex items-center gap-2 pr-2">
        <BrandMark />
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-zinc-100">
            Mermagic
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-zinc-400">
        Examples
        <select
          className="max-w-48 rounded-md border border-white/10 bg-[#161922] px-2 py-1.5 text-xs text-zinc-200 outline-none hover:border-white/20 focus:border-cyan-400/40"
          defaultValue=""
          onChange={(event) => {
            const id = event.target.value;
            if (id) onSampleSelect(id);
            event.target.value = "";
          }}
        >
          <option value="" disabled>
            Choose…
          </option>
          {SAMPLES.map((sample) => (
            <option key={sample.id} value={sample.id}>
              {sample.name}
            </option>
          ))}
        </select>
      </label>

      <div className="min-w-0 flex-1">
        <ThemePicker value={themeId} onChange={onThemeChange} />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <div className="flex h-8">
          <button
            type="button"
            title="New diagram"
            onClick={onHistoryNew}
            className="flex items-center gap-1.5 rounded-l-md border border-white/10 bg-white/[0.04] px-2.5 text-xs font-medium text-zinc-200 transition hover:bg-white/10"
          >
            <PlusIcon />
            New
          </button>
          <HistoryPanel
            embedded
            entries={history}
            currentId={currentHistoryId}
            onNew={onHistoryNew}
            onRestore={onHistoryRestore}
            onPin={onHistoryPin}
            onRename={onHistoryRename}
            onDelete={onHistoryDelete}
          />
        </div>

        <Divider />

        <div className="flex h-8 overflow-hidden rounded-md border border-white/10 bg-white/[0.04]">
          <button
            type="button"
            title={
              includeBackground
                ? "Background included in export"
                : "Export without background"
            }
            aria-pressed={includeBackground}
            onClick={() => onIncludeBackgroundChange(!includeBackground)}
            className={`flex w-8 items-center justify-center border-r transition ${
              includeBackground
                ? "border-white/10 bg-cyan-400/15 text-cyan-100"
                : "border-white/10 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"
            }`}
          >
            <BackgroundIcon />
          </button>
          <SegmentButton disabled={!canExport} onClick={onExportSvg}>
            SVG
          </SegmentButton>
          <SegmentButton disabled={!canExport} onClick={onExportPng}>
            PNG
          </SegmentButton>
          <SegmentButton disabled={!canExport} last onClick={onExportPdf}>
            PDF
          </SegmentButton>
        </div>

        <ToolButton
          title="Copy PNG to clipboard"
          disabled={!canExport || copied}
          onClick={() => {
            void onCopyPng()
              .then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              })
              .catch(() => {
                // Clipboard write can fail without HTTPS or permission.
              });
          }}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Copied" : "Copy"}
        </ToolButton>

        <Divider />

        <ToolButton
          title="Copy shareable URL"
          accent
          disabled={!canShare || linkCopied}
          onClick={() => {
            void onShare()
              .then(() => {
                setLinkCopied(true);
                window.setTimeout(() => setLinkCopied(false), 1500);
              })
              .catch(() => {
                // Clipboard write can fail without HTTPS or permission.
              });
          }}
        >
          {linkCopied ? <CheckIcon /> : <ShareIcon />}
          {linkCopied ? "Copied" : "Share"}
        </ToolButton>
      </div>
    </header>
  );
}

function Divider() {
  return <div className="h-5 w-px bg-white/10" aria-hidden="true" />;
}

function ToolButton({
  children,
  title,
  disabled,
  accent,
  onClick,
}: {
  children: ReactNode;
  title?: string;
  disabled?: boolean;
  accent?: boolean;
  onClick: () => void;
}) {
  const tone = accent
    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
    : "border-white/10 bg-white/[0.04] text-zinc-200 hover:border-white/20 hover:bg-white/10";

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${tone}`}
    >
      {children}
    </button>
  );
}

function SegmentButton({
  children,
  disabled,
  last,
  onClick,
}: {
  children: string;
  disabled?: boolean;
  last?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`h-full min-w-11 px-2.5 text-xs font-medium text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 ${
        last ? "" : "border-r border-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        d="M8 3.2v9.6M3.2 8h9.6"
      />
    </svg>
  );
}

function BackgroundIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <rect
        x="2"
        y="2"
        width="12"
        height="12"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path fill="currentColor" d="M2.6 2.6h5.4v5.4H2.6zM8 8h5.4v5.4H8z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        d="M5.5 5.2h7.2v8.3H5.5z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        d="M3.3 10.8V2.5h7.5"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.2 4.2 13 8l-3.8 3.8M13 8H6.4A3.4 3.4 0 0 0 3 11.4V12"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.4 8.3 6.5 11.4 12.6 4.6"
      />
    </svg>
  );
}

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#12141a" />
      <circle cx="10" cy="16" r="4" fill="#22d3ee" />
      <circle cx="22" cy="10" r="3.5" fill="#818cf8" />
      <circle cx="22" cy="22" r="3.5" fill="#c084fc" />
      <path
        d="M13.6 14.4 L19.2 11.4 M13.6 17.6 L19.2 20.6"
        stroke="#94a3b8"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
