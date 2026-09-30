import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export function Popover({
  label,
  children,
  className = "",
  buttonClassName = "button",
  disabled = false,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<CSSProperties>({
    visibility: "hidden",
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentId = useId();
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const anchor = triggerRef.current?.getBoundingClientRect();
      const content = contentRef.current;
      if (!anchor || !content) return;
      const width = content.offsetWidth;
      const height = content.offsetHeight;
      const below = anchor.bottom + 9;
      const above = anchor.top - height - 9;
      setPosition({
        left: Math.max(
          12,
          Math.min(anchor.right - width, window.innerWidth - width - 12),
        ),
        top: Math.max(
          12,
          Math.min(
            below + height <= window.innerHeight - 12 ? below : above,
            window.innerHeight - height - 12,
          ),
        ),
        visibility: "visible",
      });
    };
    place();
    const observer = new ResizeObserver(place);
    if (contentRef.current) observer.observe(contentRef.current);
    window.addEventListener("resize", place);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !contentRef.current?.contains(target)
      )
        setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);
  return (
    <div className={`popover-root ${className}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={buttonClassName}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={open ? contentId : undefined}
        onClick={() => setOpen(!open)}
      >
        {label}
      </button>
      {open
        ? createPortal(
            <div
              id={contentId}
              ref={contentRef}
              style={position}
              className={`popover-content ${className}-content`}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
