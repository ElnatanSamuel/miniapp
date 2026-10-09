#!/usr/bin/env bash
# One-command dev loop: vite + ngrok + bot. Reuses anything already running,
# only stops what it started. Works on macOS's stock bash 3.2.
# Usage: pnpm dev
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "[dev] .env is missing — copy .env.example to .env and set BOT_TOKEN" >&2
  exit 1
fi
# shellcheck disable=SC1091
set -a && source ./.env && set +a

if [[ -z "${BOT_TOKEN:-}" ]]; then
  echo "[dev] BOT_TOKEN is empty in .env" >&2
  exit 1
fi

STARTED_VITE=""
STARTED_NGROK=""
STARTED_BOT=""

STOPPING=""
cleanup() {
  [[ -n "$STOPPING" ]] && return
  STOPPING=1
  trap - EXIT INT TERM
  echo ""
  echo "[dev] stopping…"
  for pid in $STARTED_BOT $STARTED_NGROK $STARTED_VITE; do
    [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  echo "[dev] stopped"
}
trap cleanup EXIT
trap 'cleanup; exit 0' INT
trap 'cleanup; exit 0' TERM

# --- vite -------------------------------------------------------------
if curl -sf -m 2 http://localhost:5173/ >/dev/null 2>&1; then
  echo "[dev] reusing vite already on :5173"
else
  echo "[dev] starting vite on :5173"
  pnpm --filter @tce/tma dev &
  STARTED_VITE=$!
fi

# --- ngrok ------------------------------------------------------------
PUBLIC_URL=""
find_tunnel() {
  curl -s -m 2 http://localhost:4040/api/tunnels 2>/dev/null |
    node -e '
      let raw = "";
      process.stdin.on("data", (d) => (raw += d)).on("end", () => {
        try {
          const { tunnels } = JSON.parse(raw);
          const t = tunnels.find(
            (x) => x.config?.addr === "http://localhost:5173" && x.public_url?.startsWith("https://"),
          );
          if (t) process.stdout.write(t.public_url);
        } catch {}
      });'
}

if curl -sf -m 2 http://localhost:4040/api/tunnels >/dev/null 2>&1; then
  echo "[dev] ngrok already running — looking for its tunnel to :5173"
  PUBLIC_URL=$(find_tunnel)
  if [[ -z "$PUBLIC_URL" ]]; then
    echo "[dev] ngrok is up but has no https tunnel to :5173 — kill it and rerun \`pnpm dev\`" >&2
    exit 1
  fi
else
  if ! command -v ngrok >/dev/null 2>&1; then
    echo "[dev] ngrok not installed — buttons will be REJECTED by Telegram (brew install ngrok)" >&2
  else
    if [[ -n "${NGROK_DOMAIN:-}" ]]; then
      echo "[dev] starting ngrok → https://${NGROK_DOMAIN} (static domain)"
      ngrok http 5173 --url "${NGROK_DOMAIN}" --log=warn &
    else
      echo "[dev] starting ngrok → random https URL (set NGROK_DOMAIN in .env for a permanent one)"
      ngrok http 5173 --log=warn &
    fi
    STARTED_NGROK=$!

    echo "[dev] waiting for ngrok tunnel…"
    for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do
      sleep 1
      PUBLIC_URL=$(find_tunnel)
      [[ -n "$PUBLIC_URL" ]] && break
    done
    if [[ -z "$PUBLIC_URL" ]]; then
      echo "[dev] ngrok produced no https tunnel in 30s — check ngrok logs" >&2
      exit 1
    fi
  fi
fi

# --- bot --------------------------------------------------------------
TMA_URL="http://localhost:5173"
if [[ -n "$PUBLIC_URL" ]]; then
  TMA_URL="$PUBLIC_URL"
  echo "[dev] tunnel up: ${TMA_URL}"
else
  echo "[dev] no https tunnel — Telegram will REJECT web_app buttons" >&2
fi

echo "[dev] starting bot with TMA_BASE_URL=${TMA_URL}"
TMA_BASE_URL="$TMA_URL" pnpm --filter @tce/bot start &
STARTED_BOT=$!

echo "[dev] ready · open Telegram → /start → 🛍 Open Shop · Ctrl-C stops everything"

# bash 3.2 has no `wait -n` — poll our children; exit if any of them dies.
alive=""
for pid in $STARTED_VITE $STARTED_NGROK $STARTED_BOT; do
  [[ -n "$pid" ]] && alive="$alive $pid"
done

if [[ -z "$alive" ]]; then
  echo "[dev] everything was already running elsewhere — idle, Ctrl-C to detach"
fi

while :; do
  sleep 1
  for pid in $alive; do
    if ! kill -0 "$pid" 2>/dev/null; then
      if [[ -z "$STOPPING" ]]; then
        echo "[dev] process $pid exited — shutting the rest down" >&2
        exit 1
      fi
      exit 0
    fi
  done
done
