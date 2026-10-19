import {
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Icon } from "@/components/Icon";
import { clampPanelPosition, type PanelPosition } from "@/lib/panelPosition";

export function FlowToolsPanel({
  panelRef,
  collapsed,
  onCollapsedChange,
  children,
}: {
  panelRef: RefObject<HTMLDivElement | null>;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  children: ReactNode;
}) {
  const boundsRef = useRef<HTMLDivElement>(null);
  const contentId = useId();
  const [position, setPosition] = useState<PanelPosition>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    origin: PanelPosition;
  } | null>(null);

  function move(next: PanelPosition) {
    const bounds = boundsRef.current;
    const panel = panelRef.current;
    if (!bounds || !panel) return;
    setPosition(
      clampPanelPosition(
        next,
        { width: bounds.clientWidth, height: bounds.clientHeight },
        { width: panel.offsetWidth, height: panel.offsetHeight },
      ),
    );
  }

  useEffect(() => {
    const bounds = boundsRef.current;
    const panel = panelRef.current;
    if (!bounds || !panel) return;
    const observer = new ResizeObserver(() => {
      if (!bounds.clientWidth || !bounds.clientHeight) return;
      setPosition((current) => {
        const next = clampPanelPosition(
          current,
          { width: bounds.clientWidth, height: bounds.clientHeight },
          { width: panel.offsetWidth, height: panel.offsetHeight },
        );
        return next.x === current.x && next.y === current.y ? current : next;
      });
    });
    observer.observe(bounds);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [panelRef]);

  function stopDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerId !== dragRef.current?.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <div ref={boundsRef} className="flow-interactions">
      <div
        ref={panelRef}
        className={`flow-mode-panel ${collapsed ? "is-collapsed" : ""}`}
        style={{ left: position.x, top: position.y }}
      >
        <div className="flow-panel-header">
          <button
            type="button"
            className={`flow-panel-grip ${dragging ? "is-dragging" : ""}`}
            aria-label="Move diagram tools"
            title="Drag to move. Arrow keys move; Shift moves farther. Home resets."
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.focus();
              event.currentTarget.setPointerCapture(event.pointerId);
              dragRef.current = {
                pointerId: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                origin: position,
              };
              setDragging(true);
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current;
              if (!drag || drag.pointerId !== event.pointerId) return;
              move({
                x: drag.origin.x + event.clientX - drag.x,
                y: drag.origin.y + event.clientY - drag.y,
              });
            }}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
            onLostPointerCapture={stopDrag}
            onKeyDown={(event) => {
              if (event.key === "Home") {
                event.preventDefault();
                event.stopPropagation();
                move({ x: 0, y: 0 });
              } else if (event.key.startsWith("Arrow")) {
                event.preventDefault();
                event.stopPropagation();
                const step = event.shiftKey ? 32 : 8;
                move({
                  x:
                    position.x +
                    (event.key === "ArrowLeft"
                      ? -step
                      : event.key === "ArrowRight"
                        ? step
                        : 0),
                  y:
                    position.y +
                    (event.key === "ArrowUp"
                      ? -step
                      : event.key === "ArrowDown"
                        ? step
                        : 0),
                });
              }
            }}
          >
            <Icon name="move" />
          </button>
          <button
            type="button"
            data-panel-toggle
            className="flow-panel-toggle"
            aria-label={
              collapsed ? "Expand diagram tools" : "Collapse diagram tools"
            }
            aria-expanded={!collapsed}
            aria-controls={contentId}
            onClick={() => onCollapsedChange(!collapsed)}
          >
            Diagram tools
            <Icon name="down" />
          </button>
        </div>
        <div id={contentId} className="flow-panel-content" hidden={collapsed}>
          {children}
        </div>
      </div>
    </div>
  );
}
