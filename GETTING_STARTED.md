# Getting Started

Everything you need to run this project locally and know what to build next.
Spec: [`SPEC-001.md`](./SPEC-001.md) · Map of every file: [`README.md`](./README.md)

---

## 1. Prerequisites

| Tool | Why | Check |
|---|---|---|
| Node.js ≥ 20 | runtime | `node -v` |
| pnpm | workspace installs | `pnpm -v` (else `brew install pnpm`) |
| ngrok | HTTPS tunnel for phone testing | `ngrok version` |
| Telegram account | to open the Mini App | — |

No Docker, no database, no API — this is the **UI-first phase**.

## 2. One-time setup

```bash
git clone <repo> && cd miniapp
pnpm install
```

`.env` lives at the repo root (git-ignored):

```bash
BOT_TOKEN=123456789:ABC...     # from @BotFather
BOT_HANDLE=your_bot_username    # without @
TMA_BASE_URL=http://localhost:5173   # overridden automatically by `pnpm dev`
NGROK_DOMAIN=                    # optional — your static ngrok domain (see below)
```

> **Why ngrok?** Telegram only accepts `https://` web-app URLs — on **desktop too**,
> not just phones. `pnpm dev` starts ngrok for you and points the bot at the tunnel.

## 3. Run

```bash
pnpm dev
```

One command starts everything: Vite (`:5173`) → ngrok tunnel → bot.
It reuses anything already running, and one Ctrl-C stops only what it started.

Healthy logs:

```
[dev] reusing vite already on :5173
[dev] starting ngrok → random https URL (set NGROK_DOMAIN in .env for a permanent one)
[dev] waiting for ngrok tunnel…
[dev] tunnel up: https://xxxx.ngrok-free.dev
[dev] starting bot with TMA_BASE_URL=https://xxxx.ngrok-free.dev
[dev] ready · open Telegram → /start → 🛍 Open Shop · Ctrl-C stops everything

[bot] 11:18:23 token 123456789:*** · connected as @your_bot
[bot] 11:18:23 mini app url: https://xxxx.ngrok-free.dev
[bot] 11:18:23 listening: /start · channel_post
```

```
[tma info] boot: mounting React
[tma info] inside Telegram WebApp
[tma info] user { id: …, name: …, username: … }
```

If the bot refuses to start with `TMA_BASE_URL must be https://`, you ran
`pnpm dev:bot` directly — either use `pnpm dev`, or set an https URL in `.env`.

## 4. Open the Mini App

### A. Chat with the bot (desktop or phone)
1. Open a chat with your bot → send `/start`
2. Tap **🛍 Open Shop** in the reply keyboard
3. The Mini App opens (white screen for now); it logs user/initData/theme to the console

> Seeing the TMA console: desktop Telegram → right-click → *Inspect Element*;
> Android → `chrome://inspect`; iOS → Safari → Develop menu.

### B. The real channel flow
1. One-time: `NGROK_DOMAIN` set in `.env` (permanent URL) **and** the Main Mini App
   configured in BotFather: `/mybots` → your bot → **Bot Settings → Configure Mini App →
   Enable Mini App**, URL = `https://<your-static-domain>` — otherwise `t.me/…?startapp`
   links won't open the app (`getMe` shows `has_main_web_app: true` when it's set)
2. Create a test channel (or use an existing one)
3. Add `@your_bot` as **administrator** (it cannot edit posts otherwise)
4. Post anything containing text, e.g. `Nike Dunk 2,400 ብር size 42`
5. The bot injects **🛍 ይዘዙ / Order Now (2,400 ETB)** — a `url` button linking to
   `https://t.me/<bot>?startapp=p_demo` (channels can't use `web_app` buttons —
   Bot API rejects them with `BUTTON_TYPE_INVALID`)
6. Tap it → Mini App opens, console shows `start_param: p_demo`

### C. Stop the ngrok interstitial
Free ngrok shows a "visit site?" warning page once per browser — tap through it,
or add the header `ngrok-skip-browser-warning: 1` when testing with curl.

## 5. Static ngrok domain (recommended — URL never changes)

Random ngrok URLs die on every restart, which breaks any link you shared.

1. Sign up at <https://dashboard.ngrok.com> (free)
2. **Domains → Create a free static domain** → you get e.g. `myshop.ngrok-free.app`
3. Put it in `.env`:
   ```bash
   NGROK_DOMAIN=myshop.ngrok-free.app
   ```
4. `pnpm dev` now always tunnels to `https://myshop.ngrok-free.app` — same URL forever

## 6. Useful commands

```bash
pnpm dev              # the whole loop: vite + ngrok + bot
pnpm typecheck        # tsc across bot + tma — run before pushing
pnpm dev:tma          # just the UI dev server (browser-only testing)
pnpm dev:bot          # just the bot — needs TMA_BASE_URL=https:// in .env
```

---

## What's next — the UI (build in this order)

State today: `apps/tma` renders a **white screen** with clean boot logs.
No backend — everything is driven by a fake catalog file we'll add first.

| # | File | What to build |
|---|---|---|
| 0 | `src/mock/catalog.ts` | 3–5 fake products: image, title, price ETB, variants (`S–XXL`, shoe `36–46`), stock. The only "backend" until the API exists. |
| 1 | `src/pages/ProductPage.tsx` | Product detail: hero image, title, price, variant pills, **Buy now** + **Add to cart**. Reads `?p=<id>` from the button URL. |
| 2 | `src/components/VariantPills.tsx` | Size selector driven by the product's variants; selected state. |
| 3 | `src/components/QuantityStepper.tsx` | `− n +`, clamped 1–10. |
| 4 | `src/components/CartSheet.tsx` | Bottom sheet: cart lines, steppers, remove, subtotal, checkout CTA. Cart state via `hooks/useCart.ts` (localStorage for now). |
| 5 | `src/pages/CheckoutPage.tsx` | Phone input, pickup/courier choice, subcity + landmark fields (Bole-style), order summary, submit → fake 1s delay → success. |
| 6 | `src/components/FulfillmentSheet.tsx` | The pickup-vs-courier bottom sheet used by checkout. |
| 7 | `src/pages/SuccessPage.tsx` | Order confirmation: order ref, items, total. |
| 8 | `src/components/CartBadge.tsx` | Header cart icon + line count. |
| 9 | `src/styles/zinc-dark.css` | Replace the white `base.css` with the dark theme (zinc palette, safe-area padding). |

Supporting files as they become useful:

- `src/App.tsx` — shell: page-state switching (no router lib), header, cart badge
- `src/hooks/useWebApp.ts` — wrap `window.Telegram.WebApp` (haptics, expand, theme vars, `initData`)
- `src/hooks/useCart.ts` — cart state + localStorage persistence
- `src/api/client.ts` — typed fetch wrapper (stubs first, real API later)

### Rules of the road

- **Spec wins** — behavior described in `SPEC-001.md` (§4 checkout, §6 cart) is the contract
- **One merchant per cart** — adding another shop's item asks to clear the cart
- **Instant buy stays** — the channel button's one-tap path never goes through the cart
- **Prices always live from the catalog** — a stale cart never decides a charge
- Run `pnpm typecheck` before you push

### After the UI

1. `apps/api` — Fastify: products, cart, checkout (wire `src/api/client.ts` to it)
2. `packages/db` — Postgres schema per SPEC §5
3. Real payments — BirrJS/Chapa in `apps/api/src/webhooks/`
4. `apps/dashboard` — merchant orders board
