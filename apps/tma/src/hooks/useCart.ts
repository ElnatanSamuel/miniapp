import { useCallback, useEffect, useState } from "react";

export type CartLine = { productId: string; variantId: string; quantity: number };

const STORAGE_KEY = "tce.cart.v1";
const LINE_CAP = 10;

function readCache(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function useCart() {
  const [items, setItems] = useState<CartLine[]>(readCache);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // private mode — cache is best-effort
    }
  }, [items]);

  const addItem = useCallback((productId: string, variantId: string, quantity = 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((l) => l.productId === productId && l.variantId === variantId);
      if (idx === -1) {
        return [...prev, { productId, variantId, quantity: Math.min(LINE_CAP, Math.max(1, quantity)) }];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: Math.min(LINE_CAP, next[idx].quantity + quantity) };
      return next;
    });
  }, []);

  const removeItem = useCallback((productId: string, variantId: string) => {
    setItems((prev) => prev.filter((l) => !(l.productId === productId && l.variantId === variantId)));
  }, []);

  const setQuantity = useCallback((productId: string, variantId: string, quantity: number) => {
    if (quantity < 1) {
      setItems((prev) => prev.filter((l) => !(l.productId === productId && l.variantId === variantId)));
      return;
    }
    setItems((prev) =>
      prev.map((l) =>
        l.productId === productId && l.variantId === variantId
          ? { ...l, quantity: Math.min(LINE_CAP, quantity) }
          : l,
      ),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((n, line) => n + line.quantity, 0);

  return { items, count, addItem, removeItem, setQuantity, clear };
}
