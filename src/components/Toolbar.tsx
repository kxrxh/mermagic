import { useEffect, useRef, useState } from "react";
import { HistoryPanel } from "@/components/HistoryPanel";
import { BrandMark, Icon, type IconName } from "@/components/Icon";
import { Popover } from "@/components/Popover";
import type { HistoryEntry } from "@/lib/history";
import { SAMPLES } from "@/lib/samples";

export type WorkspaceMode = "split" | "source" | "canvas";

type ToolbarProps = {
  documentTitle: string;
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
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  libraryOpen: boolean;
  onLibraryToggle: () => void;
};

export function Toolbar(props: ToolbarProps) {
  const [notice, setNotice] = useState("");
  const [libraryTab, setLibraryTab] = useState<"diagrams" | "templates">(
    "diagrams",
  );
  const [templateQuery, setTemplateQuery] = useState("");
  const noticeTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);
  const clipboard = async (action: () => Promise<void>, success: string) => {
    try {
      await action();
      setNotice(success);
    } catch {
      setNotice("Clipboard unavailable. Please check browser permissions.");
    }
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 3500);
  };
  return (
    <>
      <header className="app-header">
        <div className="brand">
          <BrandMark />
          <span>
            mermagic<span className="brand-dot">.</span>
          </span>
          <span className="studio-badge">STUDIO</span>
        </div>
        <div className="document-heading">
          <button
            type="button"
            className="icon-button library-toggle"
            title="Toggle diagram library"
            aria-label="Toggle diagram library"
            aria-expanded={props.libraryOpen}
            onClick={props.onLibraryToggle}
          >
            <Icon name="panel" />
          </button>
          <span className="breadcrumb-label">Workspace</span>
          <Icon name="chevron" />
          <span className="document-title">{props.documentTitle}</span>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="button share-button"
            disabled={!props.canShare}
            onClick={() => void clipboard(props.onShare, "Share link copied")}
          >
            <Icon name="share" />
            <span>Share</span>
          </button>
          <Popover
            className="export-menu"
            buttonClassName="button button-primary"
            disabled={!props.canExport}
            label={
              <>
                <Icon name="download" />
                <span>Export</span>
                <Icon name="down" />
              </>
            }
          >
            <div className="popover-heading">
              <strong>Take your diagram with you</strong>
              <span>Ready for docs, decks, and the web.</span>
            </div>
            {[
              {
                label: "SVG",
                detail: "Scalable vector",
                action: props.onExportSvg,
              },
              {
                label: "PNG",
                detail: "High-resolution image",
                action: props.onExportPng,
              },
              {
                label: "PDF",
                detail: "Print-ready document",
                action: props.onExportPdf,
              },
            ].map((item) => (
              <button
                type="button"
                className="export-option"
                key={item.label}
                onClick={item.action}
              >
                <span className="format-badge">{item.label}</span>
                <span>{item.detail}</span>
                <Icon name="download" />
              </button>
            ))}
            <button
              type="button"
              className="export-option"
              onClick={() =>
                void clipboard(props.onCopyPng, "Image copied to clipboard")
              }
            >
              <Icon name="copy" />
              <span>Copy image to clipboard</span>
            </button>
            <label className="export-background">
              <input
                type="checkbox"
                checked={props.includeBackground}
                onChange={(event) =>
                  props.onIncludeBackgroundChange(event.target.checked)
                }
              />
              Include canvas background
            </label>
          </Popover>
        </div>
      </header>
      <aside className="sidebar" aria-label="Diagram library">
        <div className="workspace-label">
          <span className="workspace-avatar">M</span>
          <div>
            <strong>Personal workspace</strong>
            <span>Your ideas, connected.</span>
          </div>
          <button
            type="button"
            className="icon-button sidebar-close"
            aria-label="Close diagram library"
            onClick={props.onLibraryToggle}
          >
            <Icon name="close" />
          </button>
        </div>
        <button
          type="button"
          className="button new-diagram"
          onClick={props.onHistoryNew}
        >
          <Icon name="plus" />
          <span>New diagram</span>
        </button>
        <nav className="library-tabs" aria-label="Library sections">
          {(
            [
              { id: "diagrams", name: "My diagrams", icon: "diagram" },
              { id: "templates", name: "Templates", icon: "grid" },
            ] as const
          ).map((tab) => (
            <button
              type="button"
              key={tab.id}
              className={libraryTab === tab.id ? "active" : ""}
              aria-pressed={libraryTab === tab.id}
              onClick={() => setLibraryTab(tab.id)}
            >
              <Icon name={tab.icon} />
              {tab.name}
              {tab.id === "diagrams" ? (
                <span>{props.history.length}</span>
              ) : (
                <span>{SAMPLES.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-content">
          {libraryTab === "diagrams" ? (
            <HistoryPanel
              entries={props.history}
              currentId={props.currentHistoryId}
              onRestore={props.onHistoryRestore}
              onPin={props.onHistoryPin}
              onRename={props.onHistoryRename}
              onDelete={props.onHistoryDelete}
            />
          ) : (
            <div className="template-library">
              <label className="library-search">
                <Icon name="search" />
                <input
                  aria-label="Search templates"
                  placeholder="Find a starting point…"
                  value={templateQuery}
                  onChange={(event) => setTemplateQuery(event.target.value)}
                />
              </label>
              <div className="section-label">Start with a template</div>
              {SAMPLES.filter((sample) =>
                sample.name.toLowerCase().includes(templateQuery.toLowerCase()),
              ).map((sample, index) => (
                <button
                  type="button"
                  className="template-row"
                  key={sample.id}
                  onClick={() => props.onSampleSelect(sample.id)}
                >
                  <span className="template-icon">
                    <Icon
                      name={
                        (["diagram", "split", "grid", "canvas"] as IconName[])[
                          index % 4
                        ]
                      }
                    />
                  </span>
                  <span>{sample.name}</span>
                  <Icon name="arrow" />
                </button>
              ))}
              {!SAMPLES.some((sample) =>
                sample.name.toLowerCase().includes(templateQuery.toLowerCase()),
              ) ? (
                <p className="library-empty">No matching templates.</p>
              ) : null}
            </div>
          )}
        </div>
        {libraryTab === "diagrams" ? (
          <div className="starter-card">
            <span className="starter-icon">
              <Icon name="grid" />
            </span>
            <strong>A little head start.</strong>
            <p>From system architecture to your next big idea.</p>
            <button type="button" onClick={() => setLibraryTab("templates")}>
              Explore templates
              <Icon name="arrow" />
            </button>
          </div>
        ) : null}
        <div className="sidebar-footer">
          <span className="status-dot" />
          Saved on this device
          <a
            href="https://mermaid.js.org/intro/"
            target="_blank"
            rel="noreferrer"
            aria-label="Mermaid documentation"
            title="Mermaid documentation"
          >
            <Icon name="book" />
          </a>
        </div>
      </aside>
      <div className="workspace-topbar">
        <div className="workspace-intro">
          <span className="eyebrow">MAKE IDEAS VISIBLE</span>
          <span>A little syntax. A lot of possibility.</span>
        </div>
        <fieldset className="view-switcher" aria-label="Workspace view">
          {(
            [
              { id: "source", label: "Source", icon: "code" },
              { id: "split", label: "Split", icon: "split" },
              { id: "canvas", label: "Canvas", icon: "canvas" },
            ] as const
          ).map((item) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={props.mode === item.id}
              className={props.mode === item.id ? "active" : ""}
              onClick={() => props.onModeChange(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </fieldset>
      </div>
      {notice ? (
        <div className="toast" role="status">
          <Icon name={notice.includes("unavailable") ? "copy" : "check"} />
          {notice}
        </div>
      ) : null}
    </>
  );
}
