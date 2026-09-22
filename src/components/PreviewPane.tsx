import {
  type PointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { FlowInteractions } from "@/components/FlowInteractions";
import type { FlowGraph, NodeEdit } from "@/lib/flowchart";

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
  background,
  rendering,
  empty,
  graph,
  code,
  interactive,
  onSelectNode,
  onEditNode,
}: PreviewPaneProps) {
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
    <section className="flex min-h-0 min-w-0 flex-col">
      <div className="flex h-8 items-center justify-between border-b border-white/10 px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
        Preview
        <div className="flex items-center gap-2">
          {rendering ? (
            <span className="normal-case tracking-normal text-cyan-300/80">
              Rendering…
            </span>
          ) : null}
          <div className="flex items-center gap-0.5 normal-case tracking-normal">
            <ZoomButton
              label="Zoom out"
              disabled={!canInteract || userZoom <= MIN_ZOOM}
              onClick={() => zoomBy(-ZOOM_STEP)}
            >
              −
            </ZoomButton>
            <button
              type="button"
              title="Fit to view"
              disabled={!canInteract}
              onClick={resetView}
              className="min-w-10 rounded px-1 text-center text-[11px] font-medium tabular-nums text-zinc-400 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-zinc-400"
            >
              {`${Math.round(userZoom * 100)}%`}
            </button>
            <ZoomButton
              label="Zoom in"
              disabled={!canInteract || userZoom >= MAX_ZOOM}
              onClick={() => zoomBy(ZOOM_STEP)}
            >
              +
            </ZoomButton>
          </div>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          ref={viewportRef}
          className="h-full overflow-hidden select-none"
          style={{
            background,
            cursor: canInteract ? (dragging ? "grabbing" : "grab") : "default",
            touchAction: "none",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {empty && !svg ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-500">
              Write Mermaid on the left to see a live diagram.
            </div>
          ) : svg ? (
            <div
              ref={contentRef}
              className={`preview-svg origin-top-left will-change-transform ${
                rendering ? "opacity-60" : "opacity-100"
              }`}
              style={{
                width: "100%",
                padding: 24,
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
                transformOrigin: "0 0",
              }}
            />
          ) : null}
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
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-[#11151e]/90 px-3 py-2 text-[11px] text-zinc-400">
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
      className="flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-white/5 text-sm leading-none text-zinc-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
