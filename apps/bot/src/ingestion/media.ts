import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Bot } from "grammy";
import type { PhotoSize } from "grammy/types";
import { mediaDir } from "./sync";

/** Downloads the largest size of a channel photo into the TMA public dir; returns its public URL. */
export async function savePhoto(
  bot: Bot,
  token: string,
  photo: PhotoSize[],
  baseName: string,
): Promise<string | null> {
  const largest = photo.reduce((a, b) => ((b.file_size ?? 0) > (a.file_size ?? 0) ? b : a));
  const file = await bot.api.getFile(largest.file_id);
  if (!file.file_path) return null;

  const ext = path.extname(file.file_path).slice(1) || "jpg";
  const res = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
  if (!res.ok) return null;

  await mkdir(mediaDir(), { recursive: true });
  const fileName = `${baseName}.${ext}`;
  await writeFile(path.join(mediaDir(), fileName), Buffer.from(await res.arrayBuffer()));
  return `/api/media/${fileName}`;
}
