import type { IndexEntry, Product } from "./types";

export class NotFoundError extends Error {
  constructor(url: string) {
    super(`not found: ${url}`);
    this.name = "NotFoundError";
  }
}

async function getJson<T>(url: string, opts: { fallback?: T } = {}): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  // A missing file may come back as 404 OR as the SPA fallback page (200 + HTML).
  const isHtml = res.headers.get("content-type")?.includes("text/html") ?? false;
  if (res.status === 404 || (res.ok && isHtml)) {
    if ("fallback" in opts) return opts.fallback as T;
    throw new NotFoundError(url);
  }
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return (await res.json()) as T;
}

export function fetchProduct(id: string): Promise<Product> {
  return getJson<Product>(`/api/products/${encodeURIComponent(id)}.json`);
}

export function fetchIndex(): Promise<IndexEntry[]> {
  return getJson<IndexEntry[]>(`/api/index.json`, { fallback: [] });
}
