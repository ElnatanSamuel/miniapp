const stamp = () => new Date().toTimeString().slice(0, 8);

type Level = "info" | "warn" | "error";

const styles: Record<Level, string> = {
  info: "color:#2563eb;font-weight:600",
  warn: "color:#d97706;font-weight:600",
  error: "color:#dc2626;font-weight:600",
};

/** Pretty, timestamped console logging — same shape as the bot's logger. */
export function log(level: Level, message: string, extra?: unknown): void {
  const label = `%c[tma ${level}] ${stamp()}`;
  if (extra !== undefined) {
    console[level](label, styles[level], message, extra);
  } else {
    console[level](label, styles[level], message);
  }
}

export const tma = {
  info: (msg: string, extra?: unknown) => log("info", msg, extra),
  warn: (msg: string, extra?: unknown) => log("warn", msg, extra),
  error: (msg: string, extra?: unknown) => log("error", msg, extra),
};
