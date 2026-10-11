/** SPEC-001 §2B — size/variant matcher. Returns [] when the caption has none. */
const APPAREL_SIZES = /\b(XXS|XS|S|M|L|XL|2XL|3XL|XXL)\b/gi;
const SHOE_SIZES = /(?:size|ቁጥር)?\s*[:=-]?\s*\b([3-4][0-8])\b/gi;

export function extractVariants(text: string): string[] {
  const variants = new Set<string>();

  for (const match of text.matchAll(APPAREL_SIZES)) {
    variants.add(match[1].toUpperCase());
  }

  for (const match of text.matchAll(SHOE_SIZES)) {
    const prefix = text.slice(Math.max(0, match.index! - 5), match.index!).toLowerCase();
    if (/(size|ቁጥር)/.test(prefix) || variants.size === 0) {
      variants.add(`Size ${match[1]}`);
    }
  }

  return [...variants];
}
