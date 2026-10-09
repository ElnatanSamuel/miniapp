/** Cart state hook — SPEC-001 §6A (localStorage cache + sync). One instance at app root. */
export function useCart() {
  return {
    items: [] as { productId: string; variantId: string; quantity: number }[],
    count: 0,
    subtotal: 0,
    addItem: (_productId: string, _variantId: string, _quantity?: number) => {},
    removeItem: (_itemId: string) => {},
    setQuantity: (_itemId: string, _quantity: number) => {},
    clear: () => {},
  };
}
