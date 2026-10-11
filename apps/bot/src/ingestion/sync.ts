import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

/** Product store: JSON files under apps/tma/public/api — the TMA's "backend" until apps/api exists. */
const API_DIR = fileURLToPath(new URL("../../../tma/public/api/", import.meta.url));
const PRODUCTS_DIR = path.join(API_DIR, "products");
const MEDIA_DIR = path.join(API_DIR, "media");

export type StoredProduct = {
  id: string;
  channelId: number;
  messageId: number;
  title: string;
  description: string | null;
  price: number | null;
  variants: string[];
  images: string[];
  createdAt: string;
};

export type IndexEntry = {
  id: string;
  title: string;
  price: number | null;
  image: string | null;
  createdAt: string;
};

export async function writeProduct(product: StoredProduct): Promise<string> {
  await mkdir(PRODUCTS_DIR, { recursive: true });
  const file = path.join(PRODUCTS_DIR, `${product.id}.json`);
  await writeFile(file, JSON.stringify(product, null, 2));
  return file;
}

export async function updateIndex(product: StoredProduct): Promise<void> {
  await mkdir(API_DIR, { recursive: true });
  const file = path.join(API_DIR, "index.json");
  let index: IndexEntry[] = [];
  try {
    index = JSON.parse(await readFile(file, "utf8")) as IndexEntry[];
  } catch {
    index = [];
  }
  index = [
    {
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.images[0] ?? null,
      createdAt: product.createdAt,
    },
    ...index.filter((e) => e.id !== product.id),
  ].slice(0, 50);
  await writeFile(file, JSON.stringify(index, null, 2));
}

export function mediaDir(): string {
  return MEDIA_DIR;
}

export function apiDir(): string {
  return API_DIR;
}
