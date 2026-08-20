import {
  type PointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

type View = {
  zoom: number;
  x: number;
  y: number;
};

function clampZoom(value: number) {
  return Math.min(
    MAX_ZOOM,
    Math.max(MIN_ZOOM, Math.round(value * 1000) / 1000),
  );
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
};

export function PreviewPane({
  svg,
  background,
  rendering,
  empty,
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
  const centeredRef = useRef(false);

  const [view, setView] = useState<View>(viewRef.current);
  const [dragging, setDragging] = useState(false);

  const canInteract = Boolean(svg) && !empty;

  function commit(next: View) {
    viewRef.current = next;
    setView(next);
  }

  function centeredPan(zoom: number): Pick<View, "x" | "y"> {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return { x: 0, y: 0 };
    return {
      x: (viewport.clientWidth - content.offsetWidth * zoom) / 2,
      y: (viewport.clientHeight - content.offsetHeight * zoom) / 2,
    };
  }

  function zoomAt(nextZoom: number, originX: number, originY: number) {
    const current = viewRef.current;
    const zoom = clampZoom(nextZoom);
    if (zoom === current.zoom) return;
    commit({
      zoom,
      x: originX - ((originX - current.x) / current.zoom) * zoom,
      y: originY - ((originY - current.y) / current.zoom) * zoom,
    });
  }

  function zoomBy(delta: number) {
    const viewport = viewportRef.current;
    const originX = viewport ? viewport.clientWidth / 2 : 0;
    const originY = viewport ? viewport.clientHeight / 2 : 0;
    zoomAt(viewRef.current.zoom + delta, originX, originY);
  }

  function resetView() {
    const zoom = 1;
    commit({ zoom, ...centeredPan(zoom) });
  }

  useLayoutEffect(() => {
    const host = contentRef.current;
    if (host) {
      if (svg) mountSvg(host, svg);
      else host.replaceChildren();
    }

    if (!svg || empty) {
      centeredRef.current = false;
      viewRef.current = { zoom: 1, x: 0, y: 0 };
      setView(viewRef.current);
      return;
    }
    if (centeredRef.current) return;
    centeredRef.current = true;
    const viewport = viewportRef.current;
    const content = contentRef.current;
    const next = {
      zoom: 1,
      x:
        viewport && content
          ? (viewport.clientWidth - content.offsetWidth) / 2
          : 0,
      y:
        viewport && content
          ? (viewport.clientHeight - content.offsetHeight) / 2
          : 0,
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
      const rect = viewport.getBoundingClientRect();
      const originX = event.clientX - rect.left;
      const originY = event.clientY - rect.top;
      const delta =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? event.deltaY * 16
          : event.deltaY;
      const zoom = clampZoom(current.zoom * Math.exp(-delta * 0.002));
      if (zoom === current.zoom) return;
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

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!canInteract || event.button !== 0) return;
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
              disabled={!canInteract || view.zoom <= MIN_ZOOM}
              onClick={() => zoomBy(-ZOOM_STEP)}
            >
              −
            </ZoomButton>
            <button
              type="button"
              title="Reset view"
              disabled={!canInteract}
              onClick={resetView}
              className="min-w-10 rounded px-1 text-center text-[11px] font-medium tabular-nums text-zinc-400 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-zinc-400"
            >
              {Math.round(view.zoom * 100)}%
            </button>
            <ZoomButton
              label="Zoom in"
              disabled={!canInteract || view.zoom >= MAX_ZOOM}
              onClick={() => zoomBy(ZOOM_STEP)}
            >
              +
            </ZoomButton>
          </div>
        </div>
      </div>
      <div
        ref={viewportRef}
        className="min-h-0 flex-1 overflow-hidden select-none"
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
