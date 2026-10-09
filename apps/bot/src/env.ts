import { fileURLToPath } from "node:url";
import process from "node:process";

const rootEnv = fileURLToPath(new URL("../../../.env", import.meta.url));

try {
  process.loadEnvFile(rootEnv);
} catch {
  // no .env on disk — required vars below fail fast with a clear message
}

function fail(message: string): never {
  console.error(`[bot] ${new Date().toTimeString().slice(0, 8)} ${message}`);
  process.exit(1);
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) fail(`${name} is missing — add it to .env at the repo root`);
  return value;
}

function validateTmaUrl(raw: string): string {
  const url = raw.replace(/\/+$/, "");
  if (!url.startsWith("https://")) {
    fail(
      `TMA_BASE_URL must be https:// — got ${url}\n` +
        `[bot]       run \`pnpm dev\` (starts ngrok for you), or set TMA_BASE_URL in .env to an https:// URL`,
    );
  }
  return url;
}

export const env = {
  botToken: required("BOT_TOKEN"),
  tmaBaseUrl: validateTmaUrl(process.env.TMA_BASE_URL ?? "http://localhost:5173"),
};

export function maskToken(token: string): string {
  const id = token.split(":")[0] ?? "????";
  return `${id}:***`;
}
