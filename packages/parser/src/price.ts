/** SPEC-001 §2A — price matcher for Amharic/English/slang captions. */
const PRICE_TOKEN =
  /(?:ዋጋ|ውጤት|price|birr|ብር|etb|\/-)?\s*[:=-]?\s*(\d{1,3}(?:[,.\s]\d{3})+|\d+)\s*(?:etb|birr|ብር|ዋጋ|\/-)?/gi;

const MIN_PRICE = 50;
const MAX_PRICE = 500_000;

/** First in-range number found (thousand separators stripped), or null. */
export function extractPrice(text: string): number | null {
  for (const match of text.matchAll(PRICE_TOKEN)) {
    const cleaned = match[1].replace(/[\s,.]/g, "");
    const value = Number.parseFloat(cleaned);
    if (Number.isFinite(value) && value >= MIN_PRICE && value <= MAX_PRICE) {
      return value;
    }
  }
  return null;
}
