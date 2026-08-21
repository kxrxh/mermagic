import { PDFDocument } from "pdf-lib";

const MAX_PDF_PAGE = 14400;

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function parseSvg(svg: string): SVGSVGElement {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const el = doc.documentElement;
  if (!(el instanceof SVGSVGElement)) {
    throw new Error("Invalid SVG");
  }
  return el;
}

function svgSize(el: SVGSVGElement): { width: number; height: number } {
  const viewBox = el.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }
  const width = Number.parseFloat(el.getAttribute("width") ?? "");
  const height = Number.parseFloat(el.getAttribute("height") ?? "");
  return {
    width: Number.isFinite(width) && width > 0 ? width : 800,
    height: Number.isFinite(height) && height > 0 ? height : 600,
  };
}

function stripRootBackground(el: SVGSVGElement) {
  const style = el.getAttribute("style");
  if (style) {
    const next = style
      .replace(/(?:^|;)\s*background(?:-color)?\s*:[^;]*/gi, "")
      .replace(/^[;\s]+|[;\s]+$/g, "");
    if (next) el.setAttribute("style", next);
    else el.removeAttribute("style");
  }
  el.style.removeProperty("background");
  el.style.removeProperty("background-color");
}

function prepareSvg(svg: string, background: string | null): SVGSVGElement {
  const el = parseSvg(svg);
  el.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const { width, height } = svgSize(el);
  el.setAttribute("width", String(width));
  el.setAttribute("height", String(height));
  if (!el.getAttribute("viewBox")) {
    el.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  const existing = el.querySelector("[data-mermagic-bg]");
  existing?.remove();
  stripRootBackground(el);

  if (background) {
    const rect = el.ownerDocument.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect",
    );
    rect.setAttribute("data-mermagic-bg", "true");
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    rect.setAttribute("fill", background);
    el.insertBefore(rect, el.firstChild);
  }
  return el;
}

function serializeSvg(el: SVGSVGElement): string {
  const body = new XMLSerializer().serializeToString(el);
  if (body.startsWith("<?xml")) return body;
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not rasterize SVG"));
    img.src = url;
  });
}

export function downloadSvg(
  svg: string,
  background: string | null,
  filename = "diagram.svg",
) {
  const prepared = serializeSvg(prepareSvg(svg, background));
  const blob = new Blob([prepared], { type: "image/svg+xml;charset=utf-8" });
  triggerDownload(blob, filename);
}

async function rasterizePng(
  svg: string,
  background: string | null,
  scale = 2,
): Promise<Blob> {
  const el = prepareSvg(svg, background);
  const { width, height } = svgSize(el);
  const serialized = serializeSvg(el);
  const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    const ratio = Math.min(scale, 8192 / Math.max(width, height, 1));
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not supported");
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((png) => {
        if (!png) {
          reject(new Error("PNG export failed"));
          return;
        }
        resolve(png);
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadPng(
  svg: string,
  background: string | null,
  filename = "diagram.png",
  scale = 2,
) {
  const png = await rasterizePng(svg, background, scale);
  triggerDownload(png, filename);
}

export async function copyPngToClipboard(
  svg: string,
  background: string | null,
  scale = 2,
) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("Clipboard is not supported");
  }

  const png = rasterizePng(svg, background, scale);
  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": png,
    }),
  ]);
}

export async function downloadPdf(
  svg: string,
  background: string | null,
  filename = "diagram.pdf",
  scale = 2,
) {
  const el = prepareSvg(svg, background);
  const { width, height } = svgSize(el);
  const png = await rasterizePng(svg, background, scale);
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(new Uint8Array(await png.arrayBuffer()));
  const fit = Math.min(1, MAX_PDF_PAGE / width, MAX_PDF_PAGE / height);
  const pageWidth = width * fit;
  const pageHeight = height * fit;
  const page = pdf.addPage([pageWidth, pageHeight]);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
  });
  const bytes = await pdf.save();
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  triggerDownload(
    new Blob([copy.buffer], { type: "application/pdf" }),
    filename,
  );
}
