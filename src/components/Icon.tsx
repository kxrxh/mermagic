import type { CSSProperties } from "react";

const paths = {
  plus: "M12 5v14M5 12h14",
  chevron: "m9 5 7 7-7 7",
  down: "m6 9 6 6 6-6",
  code: "m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16",
  canvas: "M4 4h16v16H4zM4 9h16M9 9v11",
  split: "M4 4h16v16H4zM12 4v16",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  share:
    "M15 8a3 3 0 1 0 0-2M6 13a3 3 0 1 0 0-2m9 8a3 3 0 1 0 0-2M8 10l7-4M8 14l7 4",
  copy: "M9 9h12v12H9zM15 9V3H3v12h6",
  check: "m5 12 4 4L19 6",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm5-1.5L21 21",
  diagram: "M8 3h8v5H8zM2 16h8v5H2zM14 16h8v5h-8zM12 8v4M6 16v-4h12v4",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z",
  edit: "m15 4 5 5M4 20l2-7L16 3l5 5-10 10z",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
  close: "m6 6 12 12M6 18 18 6",
  panel: "M3 4h18v16H3zM9 4v16M5.5 8h1M5.5 12h1",
  palette:
    "M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-3.7 2 2 0 0 1 1-3.8h3a3 3 0 0 0 3-3A8 8 0 0 0 12 3ZM7 9h.01M10 6h.01M15 6h.01M18 9h.01",
  expand: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  book: "M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-4-2-7-1-10 1Zm0 0v15",
} as const;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  className,
  style,
}: {
  name: IconName;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={`icon ${className ?? ""}`}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="m4 17 4-10 4 7 4-7 4 10"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19 2v4m-2-2h4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
