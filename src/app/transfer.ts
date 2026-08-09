/**
 * Device-to-device content transfer without a backend: the full case or
 * puzzle JSON is packed into a base64url URL fragment. Open the link on
 * another device and it can publish the content into that device's
 * localStorage library.
 */

function toBase64Url(text: string): string {
  const base64 = btoa(unescape(encodeURIComponent(text)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(base64)));
}

export function encodeTransfer(payload: unknown): string {
  return toBase64Url(JSON.stringify(payload));
}

export function decodeTransfer(data: string): unknown {
  return JSON.parse(fromBase64Url(data));
}

export function buildTransferUrl(kind: "case" | "puzzle", payload: unknown): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/transfer/${kind}/${encodeTransfer(payload)}`;
}
