export type ShareState = {
  code: string;
  themeId: string;
};

const VERSION_PREFIX = "v1.";

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4;
  const base64 = pad ? padded + "=".repeat(4 - pad) : padded;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encodeShare(state: ShareState): string {
  const json = JSON.stringify({ c: state.code, t: state.themeId });
  return `${VERSION_PREFIX}${bytesToBase64Url(new TextEncoder().encode(json))}`;
}

export function decodeShare(hash: string): ShareState | null {
  const raw = hash.replace(/^#/, "");
  if (!raw.startsWith(VERSION_PREFIX)) return null;
  try {
    const json = new TextDecoder().decode(
      base64UrlToBytes(raw.slice(VERSION_PREFIX.length)),
    );
    const data: unknown = JSON.parse(json);
    if (!data || typeof data !== "object" || !("c" in data)) return null;
    const code = data.c;
    if (typeof code !== "string") return null;
    const themeId =
      "t" in data && typeof data.t === "string" ? data.t : undefined;
    return { code, themeId: themeId ?? "" };
  } catch {
    return null;
  }
}

export function readShareFromLocation(): ShareState | null {
  return decodeShare(window.location.hash);
}

export function writeShareToLocation(state: ShareState) {
  const hash = `#${encodeShare(state)}`;
  if (window.location.hash === hash) return;
  try {
    history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}${hash}`,
    );
  } catch {
    // Very large diagrams can exceed the browser URL limit.
  }
}

export function shareUrl(state: ShareState): string {
  const url = new URL(window.location.href);
  url.hash = encodeShare(state);
  return url.href;
}
