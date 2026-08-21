import { useState } from "react";
import { ThemePicker } from "@/components/ThemePicker";
import { SAMPLES } from "@/lib/samples";

type ToolbarProps = {
  themeId: string;
  onThemeChange: (id: string) => void;
  onSampleSelect: (id: string) => void;
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

      <div className="ml-auto flex items-center gap-1.5">
        <label className="flex cursor-pointer items-center gap-1.5 pr-1 text-xs text-zinc-400 select-none">
          <input
            type="checkbox"
            checked={includeBackground}
            onChange={(event) =>
              onIncludeBackgroundChange(event.target.checked)
            }
            className="h-3.5 w-3.5 accent-cyan-400"
          />
          Background
        </label>
        <button
          type="button"
          disabled={!canExport}
          onClick={onExportSvg}
          className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          SVG
        </button>
        <button
          type="button"
          disabled={!canExport}
          onClick={onExportPng}
          className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          PNG
        </button>
        <button
          type="button"
          disabled={!canExport}
          onClick={onExportPdf}
          className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          PDF
        </button>
        <button
          type="button"
          disabled={!canExport || copied}
          title="Copy PNG to clipboard"
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
          className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          disabled={!canShare || linkCopied}
          title="Copy shareable URL"
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
          className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {linkCopied ? "Copied" : "Share"}
        </button>
      </div>
    </header>
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
