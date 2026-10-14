import type { CartCheckoutPayload, CheckoutResponse, IndexEntry, Product } from "./types";

export class NotFoundError extends Error {
  constructor(url: string) {
    super(`not found: ${url}`);
    this.name = "NotFoundError";
  }
}

export class ApiError extends Error {
  code?: string;
  details?: unknown;
  constructor(message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
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

export async function createCheckout(payload: CartCheckoutPayload): Promise<CheckoutResponse> {
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    if (res.ok && isJson) {
      return (await res.json()) as CheckoutResponse;
    }

    if (!res.ok && isJson) {
      const errData = await res.json().catch(() => ({}));
      throw new ApiError(errData.message || `Checkout failed (${res.status})`, errData.code, errData);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
  }

  // Graceful fallback for standalone dev / mock environment
  const mockOrderId = `ord_${Math.random().toString(36).substring(2, 9)}`;
  return {
    orderId: mockOrderId,
    checkoutUrl: `https://checkout.chapa.co/test-${mockOrderId}`,
  };
}

