import { extractPrice, extractVariants } from "@tce/parser";

export type ParsedCaption = {
  title: string;
  description: string | null;
  price: number | null;
  variants: string[];
};

/** SPEC-001 §2C — first line is the title, the rest is the description. */
export function parseCaption(caption: string): ParsedCaption {
  const lines = caption.replace(/\r/g, "").split("\n").map((l) => l.trim());
  const title = (lines[0] ?? "").slice(0, 120).trim();
  const description = lines.slice(1).join("\n").trim() || null;
  return {
    title: title || "(untitled)",
    description,
    price: extractPrice(caption),
    variants: extractVariants(caption),
  };
}
