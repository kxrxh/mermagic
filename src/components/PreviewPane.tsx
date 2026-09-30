import {
  type PointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { FlowInteractions } from "@/components/FlowInteractions";
import { Icon } from "@/components/Icon";
import { ThemePicker } from "@/components/ThemePicker";
import type { FlowGraph, NodeEdit } from "@/lib/flowchart";
import { canvasPatternStyle, getTheme } from "@/lib/themes";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

type View = {
  zoom: number;
  x: number;
  y: number;
};

function roundZoom(value: number) {
  return Math.round(value * 1000) / 1000;
}

function clampRelativeZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, roundZoom(value)));
}

function fitScale(
  viewport: HTMLElement | null,
  content: HTMLElement | null,
): number {
  if (!viewport || !content) return 1;
  const width = content.offsetWidth;
  const height = content.offsetHeight;
  if (width <= 0 || height <= 0) return 1;
  return roundZoom(
    Math.min(viewport.clientWidth / width, viewport.clientHeight / height),
  );
}

function relativeZoom(
  viewport: HTMLElement | null,
  content: HTMLElement | null,
  zoom: number,
): number {
  const fit = fitScale(viewport, content);
  return fit > 0 ? zoom / fit : 1;
}

function centeredPan(
  viewport: HTMLElement | null,
  content: HTMLElement | null,
  zoom: number,
): Pick<View, "x" | "y"> {
  if (!viewport || !content) return { x: 0, y: 0 };
  return {
    x: (viewport.clientWidth - content.offsetWidth * zoom) / 2,
    y: (viewport.clientHeight - content.offsetHeight * zoom) / 2,
  };
}

function mountSvg(host: HTMLElement, svg: string) {
  host.replaceChildren();
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const el = doc.documentElement;
  if (el.localName !== "svg" || el.querySelector("parsererror")) return;
  host.appendChild(document.importNode(el, true));
}

type PreviewPaneProps = {
  svg: string | null;
  themeId: string;
  onThemeChange: (id: string) => void;
  background: string;
  rendering: boolean;
  empty: boolean;
  graph: FlowGraph | null;
  code: string;
  interactive: boolean;
  onSelectNode: (id: string) => void;
  onEditNode: (id: string, patch: NodeEdit) => void;
};

export function PreviewPane({
  svg,
  themeId,
  onThemeChange,
  background,
  rendering,
  empty,
  graph,
  code,
  interactive,
  onSelectNode,
  onEditNode,
}: PreviewPaneProps) {
  const theme = getTheme(themeId);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View>({ zoom: 1, x: 0, y: 0 });
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    origX: number;
    origY: number;
  } | null>(null);
  const fitModeRef = useRef(true);

  const [view, setView] = useState<View>(viewRef.current);
  const [dragging, setDragging] = useState(false);

  const canInteract = Boolean(svg) && !empty;

  function commit(next: View) {
    viewRef.current = next;
    setView(next);
  }

  function zoomAt(nextZoom: number, originX: number, originY: number) {
    const current = viewRef.current;
    const zoom = roundZoom(nextZoom);
    if (zoom === current.zoom) return;
    fitModeRef.current = false;
    commit({
      zoom,
      x: originX - ((originX - current.x) / current.zoom) * zoom,
      y: originY - ((originY - current.y) / current.zoom) * zoom,
    });
  }

  function zoomBy(delta: number) {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    const originX = viewport ? viewport.clientWidth / 2 : 0;
    const originY = viewport ? viewport.clientHeight / 2 : 0;
    const fit = fitScale(viewport, content);
    zoomAt(
      clampRelativeZoom(
        relativeZoom(viewport, content, viewRef.current.zoom) + delta,
      ) * fit,
      originX,
      originY,
    );
  }

  function resetView() {
    fitModeRef.current = true;
    const zoom = fitScale(viewportRef.current, contentRef.current);
    commit({
      zoom,
      ...centeredPan(viewportRef.current, contentRef.current, zoom),
    });
  }

  useLayoutEffect(() => {
    const host = contentRef.current;
    if (host) {
      if (svg) mountSvg(host, svg);
      else host.replaceChildren();
    }

    if (!svg || empty) {
      fitModeRef.current = true;
      viewRef.current = { zoom: 1, x: 0, y: 0 };
      setView(viewRef.current);
      return;
    }
    if (!fitModeRef.current) return;
    const zoom = fitScale(viewportRef.current, contentRef.current);
    const next = {
      zoom,
      ...centeredPan(viewportRef.current, contentRef.current, zoom),
    };
    viewRef.current = next;
    setView(next);
  }, [svg, empty]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !canInteract) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const current = viewRef.current;
      const content = contentRef.current;
      const rect = viewport.getBoundingClientRect();
      const originX = event.clientX - rect.left;
      const originY = event.clientY - rect.top;
      const delta =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? event.deltaY * 16
          : event.deltaY;
      const fit = fitScale(viewport, content);
      const zoom = roundZoom(
        clampRelativeZoom(
          relativeZoom(viewport, content, current.zoom) *
            Math.exp(-delta * 0.002),
        ) * fit,
      );
      if (zoom === current.zoom) return;
      fitModeRef.current = false;
      const next = {
        zoom,
        x: originX - ((originX - current.x) / current.zoom) * zoom,
        y: originY - ((originY - current.y) / current.zoom) * zoom,
      };
      viewRef.current = next;
      setView(next);
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [canInteract]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => {
      if (!fitModeRef.current) return;
      const zoom = fitScale(viewport, contentRef.current);
      const next = {
        zoom,
        ...centeredPan(viewport, contentRef.current, zoom),
      };
      viewRef.current = next;
      setView(next);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!canInteract || event.button !== 0) return;
    if (
      event.target instanceof Element &&
      event.target.closest("[data-flow-node]")
    )
      return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      origX: viewRef.current.x,
      origY: viewRef.current.y,
    };
    setDragging(true);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.clientX !== drag.x || event.clientY !== drag.y) {
      fitModeRef.current = false;
    }
    commit({
      zoom: viewRef.current.zoom,
      x: drag.origX + event.clientX - drag.x,
      y: drag.origY + event.clientY - drag.y,
    });
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  }

  const userZoom = relativeZoom(
    viewportRef.current,
    contentRef.current,
    view.zoom,
  );

  return (
    <section className="preview-pane" aria-label="Diagram canvas">
      <div className="pane-header">
        <div className="pane-title">
          <Icon name="canvas" />
          <span>Canvas</span>
          <span className="live-badge">
            <span className="status-dot" />
            {rendering ? "Updating" : "Live"}
          </span>
        </div>
        <ThemePicker value={themeId} onChange={onThemeChange} />
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          ref={viewportRef}
          className={`canvas-viewport h-full overflow-hidden select-none ${!theme.dark ? "canvas-light" : ""}`}
          style={{
            backgroundColor: background,
            ...canvasPatternStyle(theme),
            cursor: canInteract ? (dragging ? "grabbing" : "grab") : "default",
            touchAction: "none",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {empty && !svg ? (
            <div className="canvas-empty">
              <span className="empty-diagram-icon">
                <Icon name="diagram" />
              </span>
              <span className="eyebrow">
                A BLANK CANVAS. A NEW POSSIBILITY.
              </span>
              <h2>Every great idea starts somewhere.</h2>
              <p>
                Write a little Mermaid in the source editor,
                <br />
                or pick a template to get things flowing.
              </p>
              <span className="empty-hint">
                <Icon name="code" />
                Your diagram appears here as you type.
              </span>
            </div>
          ) : svg ? (
            <div
              ref={contentRef}
              className={`preview-svg origin-top-left will-change-transform ${
                rendering ? "opacity-60" : "opacity-100"
              }`}
              style={{
                width: "100%",
                padding: "84px 52px",
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
                transformOrigin: "0 0",
              }}
            />
          ) : null}
        </div>
        <div className="canvas-controls">
          <span className="canvas-hint">Drag to pan · Scroll to zoom</span>
          <div className="zoom-controls">
            <ZoomButton
              label="Zoom out"
              disabled={!canInteract || userZoom <= MIN_ZOOM}
              onClick={() => zoomBy(-ZOOM_STEP)}
            >
              −
            </ZoomButton>
            <button
              type="button"
              className="zoom-value"
              title="Reset zoom to fit"
              disabled={!canInteract}
              onClick={resetView}
            >{`${Math.round(userZoom * 100)}%`}</button>
            <ZoomButton
              label="Zoom in"
              disabled={!canInteract || userZoom >= MAX_ZOOM}
              onClick={() => zoomBy(ZOOM_STEP)}
            >
              +
            </ZoomButton>
            <span className="zoom-divider" />
            <button
              type="button"
              className="icon-button"
              title="Fit to view"
              aria-label="Fit to view"
              disabled={!canInteract}
              onClick={resetView}
            >
              <Icon name="expand" />
            </button>
          </div>
        </div>
        {svg && graph && !empty ? (
          <FlowInteractions
            host={contentRef}
            svg={svg}
            graph={graph}
            code={code}
            enabled={interactive}
            onSelectNode={onSelectNode}
            onEditNode={onEditNode}
          />
        ) : svg && !empty ? (
          <div className="diagram-note">
            Node editing and flow tracing are available for flowcharts.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ZoomButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="zoom-button"
    >
      {children}
    </button>
  );
}
