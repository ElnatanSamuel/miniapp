# miniapp — TeleCommerce ET

Zero-Touch Telegram Commerce Engine for Addis Ababa boutiques & kiosks.
Merchants post photos in their Telegram channel; the system parses the post,
injects an order button, takes payment via BirrJS (Telebirr / Chapa / CBE Birr),
and puts the order on the merchant's fulfillment board.

📖 **Full spec: [`SPEC-001.md`](./SPEC-001.md)** — read it before writing any code here.

**Stack:** Node.js (Fastify + grammY) · React (Vite, Telegram Mini App) · Next.js (merchant dashboard) · PostgreSQL · BirrJS · pnpm workspaces

> **⚠️ Skeleton status:** every file below exists but is **empty (0 bytes)** — no code, no config contents yet. This README is the map; fill files in the order listed in [Where do I start?](#where-do-i-start).

---

## How a sale flows (the whole point)

```
1. Merchant posts "Nike Dunk 2,400 ብር size 42" + photo in @BoleThrift
2. apps/bot sees channel_post → packages/parser extracts price + sizes
3. bot stores product in Postgres (packages/db) + edits the post:
   adds button [🛍 ይዘዙ / Order (2,400 ETB)]
4. Buyer taps button → apps/tma opens (?p=<productId>), picks size,
   chooses pickup/courier, enters phone → POST /api/checkout
5. apps/api locks stock for 15 min, redirects to BirrJS (Telebirr/Chapa)
6. Payment webhook → apps/api marks order 'paid' → bot DMs buyer + shop
7. Merchant sees order on apps/dashboard → packs it → "Mark Fulfilled"
8. Bot DMs buyer: "ትዕዛዝዎ #ET-9182 ተዘጋጅቷል! / Your order is ready!"
```

---

## Project layout — every folder

| Folder | What lives here |
|---|---|
| `apps/bot/` | The **grammY bot daemon**. Watches the merchant's channel, parses posts, injects order buttons, sends DM notifications. Runs long-polling (dev) or webhook (prod). |
| `apps/api/` | The **Fastify backend**. Checkout, payment webhooks, SSE order feed, catalog toggles, initData auth. The only process that talks to the DB directly from HTTP. |
| `apps/tma/` | The **buyer-facing Telegram Mini App** (React + Vite). Opens from the channel button. Zinc Dark theme, variant pills, bottom-sheet fulfillment, BirrJS redirect. |
| `apps/dashboard/` | The **merchant web portal** (Next.js App Router). Orders board, catalog stock toggles, payout settlements. Session auth via Telegram OAuth. |
| `packages/db/` | Postgres access layer: SQL migrations, Drizzle schema, client singleton. Shared by `bot` and `api`. |
| `packages/parser/` | Pure regex functions that turn messy Amharic/English captions into price + variants. Zero deps → fully unit-testable. |
| `packages/shared/` | Types and constants used by **all four apps**. If two apps need the same type, it lives here — never copy it. |
| `docs/` | Architecture notes beyond the spec (process boundaries, deployment). |
| `infra/` | Deployment artifacts when we get there (fly.toml, vercel.json, nginx). |
| `scripts/` | Dev helpers (seed data, "run everything" script). |

---

## Every file explained

### Root configs
| File | Purpose |
|---|---|
| `SPEC-001.md` | The contract. System topology, parsing rules, DB schema, payment flow. If spec and code disagree, fix the code. |
| `package.json` | Workspace root. Scripts: `dev:bot`, `dev:api`, `dev:tma`, `dev:dashboard`, `build`, `typecheck`, `lint`, `db:migrate`. |
| `pnpm-workspace.yaml` | Tells pnpm that `apps/*` and `packages/*` are workspace packages (`@tce/*`). |
| `tsconfig.base.json` | Shared strict TS options; every package's `tsconfig.json` extends this. |
| `.env.example` | Template for every secret/env var. **Never commit `.env`.** New env var → add it here first. |
| `docker-compose.yml` | Local Postgres 16 + Minio (S3 stand-in for Cloudflare R2 media storage). |
| `eslint.config.js` / `.prettierrc` | Lint + format rules. Run before pushing. |
| `.gitignore` | Keeps `node_modules/`, `dist/`, `.next/`, `.env` out of git. |
| `.github/workflows/ci.yml` | On every PR: install → typecheck → lint → test. |

### `apps/bot/` — ingestion daemon
| File | Purpose |
|---|---|
| `package.json` | Deps: `grammy`, `@tce/parser`, `@tce/db`. |
| `src/index.ts` | Entrypoint: register handlers → `bot.start()`. Crash = process exits non-zero. |
| `src/bot.ts` | Builds the grammY `Bot` instance and wires handlers. Pure wiring, no logic. |
| `src/env.ts` | Validates `BOT_TOKEN`, `DATABASE_URL` at boot — fail fast, not mid-request. |
| `src/handlers/channelPost.ts` | **SPEC §2C.** On `channel_post`: parse caption → create product → `editMessageReplyMarkup` with the 🛍 order button. Skips posts with no price. |
| `src/handlers/notify.ts` | Sends Telegram DMs: "payment received", "order ready", sold-out notices. Called by `api` via `lib/telegram.ts`. |
| `src/ingestion/media.ts` | Downloads the post's highest-res photo → uploads to R2/Minio → returns public URL. |
| `src/ingestion/sync.ts` | The DB write pipeline: channel lookup → product upsert (dedupes on `channel_id + telegram_message_id`) → variant inserts. |

### `apps/api/` — Fastify backend
| File | Purpose |
|---|---|
| `src/index.ts` | Calls `buildApp()` then listens on :3001. |
| `src/app.ts` | `buildApp()` factory — registers CORS, routes, webhooks. Kept separate so tests can build the app without binding a port. |
| `src/env.ts` | Validates `DATABASE_URL`, `API_URL`; reads `CHAPA_*`, `BOT_TOKEN`. |
| `src/routes/checkout.ts` | **SPEC §4.** `POST /api/checkout` — hold inventory 15 min (`hold_expires_at`), init BirrJS checkout, return redirect URL. |
| `src/routes/orders.ts` | Orders for the dashboard: SSE stream (fallback 10s polling). Filters by merchant + status tab. |
| `src/routes/catalog.ts` | Product list + `PATCH` sold-out toggle. Toggle also fires the channel-post edit (through `lib/telegram.ts`). |
| `src/routes/settlements.ts` | BirrJS payout ledger: paid orders, fees, Telebirr/CBE Birr transfers. |
| `src/webhooks/birrjs.ts` | `POST /api/webhooks/birrjs` — **verify signature**, match `tx_ref` → order `pending_payment → paid` → trigger DMs. Must be idempotent (webhooks retry). |
| `src/lib/auth.ts` | Validates Telegram Mini App `initData` (HMAC check) → authenticated buyer/merchant identity. Every TMA request goes through this. |
| `src/lib/telegram.ts` | Stateless grammY `Api` client. **Why:** the bot process long-polls, so API can't call *into* it. For dashboard actions (fulfill DM, sold-out edit) the API calls the Bot API directly. |
| `src/lib/birr.ts` | `createBirrJS()` init — provider config (Chapa/Telebirr), webhook secret, callback URL. One instance, imported everywhere. |

### `apps/tma/` — buyer Mini App (React + Vite)
| File | Purpose |
|---|---|
| `index.html` | Vite entry; Telegram WebApp script included here. |
| `vite.config.ts` | React plugin, port 5173, proxy `/api` → Fastify in dev. |
| `src/main.tsx` | Mounts React into `#root`, initializes Telegram WebApp SDK. |
| `src/App.tsx` | Shell: Zinc Dark theme, reads `?p=<productId>`, routes page-by-page (no router library needed for 3 screens). |
| `src/api/client.ts` | Typed `fetch` wrapper — attaches `initData` header to every call, one place to handle API errors. |
| `src/pages/ProductPage.tsx` | Hero image, title, price, variant pills, "Order" CTA. Entry point from the channel button. |
| `src/pages/CheckoutPage.tsx` | Phone input, pickup vs courier choice (uses `FulfillmentSheet`), address fields for Bole-style landmarks, submit → redirect to BirrJS. |
| `src/pages/SuccessPage.tsx` | Post-payment return screen (`startapp=order_<id>` deep link). |
| `src/components/VariantPills.tsx` | Size selector pills — `S–XXL` and shoe `36–46`, driven by the variants the parser extracted. |
| `src/components/FulfillmentSheet.tsx` | Bottom sheet: 🏬 in-store pickup vs 🛵 courier + sub-city/landmark inputs. |
| `src/components/ProductCard.tsx` | Reusable image + title + price card (used on product + success screens). |
| `src/hooks/useWebApp.ts` | Wraps `window.Telegram.WebApp`: theme vars, haptics, expand, viewport. |
| `src/hooks/useProduct.ts` | Fetches `GET /api/products/:id`, exposes loading/error/variant state. |
| `src/styles/zinc-dark.css` | The theme: zinc palette tokens, safe-area padding for TMA. |

### `apps/dashboard/` — merchant portal (Next.js)
| File | Purpose |
|---|---|
| `next.config.mjs` | Next config (empty for now). |
| `src/app/layout.tsx` | Root layout: `<html>`, fonts, session provider (Telegram OAuth). |
| `src/app/page.tsx` | Landing → redirect to `/dashboard/orders`. |
| `src/app/dashboard/layout.tsx` | Sidebar shell: Orders (default) / Catalog / Settlements nav. |
| `src/app/dashboard/orders/page.tsx` | **SPEC §3A.** Tabs `TO FULFILL / COMPLETED / EXPIRED`, order cards (phone, mode, landmark), **Mark as Fulfilled** button → API → DM. |
| `src/app/dashboard/catalog/page.tsx` | **SPEC §3B.** Channel-synced product cards, instant sold-out toggle (edits the Telegram post button live). |
| `src/app/dashboard/settlements/page.tsx` | Payout ledger: per-order amounts, provider, status. |
| `src/lib/api.ts` | Server-side fetch helpers for pages (base URL, merchant session header). |
| `src/components/OrderCard.tsx` | The card in the ASCII mock: order #, amount, payment badge, call customer, fulfill button. |

### `packages/db/` — database
| File | Purpose |
|---|---|
| `migrations/0001_init.sql` | **SPEC §5 verbatim** — merchants, channels, products, product_variants, orders, enums, index. Applied in filename order. |
| `src/schema.ts` | Drizzle table defs mirroring the SQL. Keep in sync with migrations. |
| `src/index.ts` | postgres.js + Drizzle singleton. Import from here, never open your own connection. |
| `src/migrate.ts` | Minimal runner: applies `migrations/*.sql` in order, records applied files. Run via `pnpm db:migrate`. |
| `drizzle.config.ts` | For `drizzle-kit generate` (auto-migrations from schema changes). |

### `packages/parser/` — post parsing (SPEC §2)
| File | Purpose |
|---|---|
| `src/price.ts` | `extractPrice()` — digits around `ETB / ብር / ዋጋ / /-`, clamped to 50–500,000 ETB. |
| `src/variants.ts` | `extractVariants()` — apparel `S–XXL` + Euro shoe sizes `36–46` → `["Size 42", …]`, default `["Standard"]`. |
| `src/index.ts` | Re-exports. Bot imports `@tce/parser`, nothing else. |
| `tests/price.test.ts` | Real Addis-style captions: `"ዋጋ 2,400 ብር"`, `"2400 ETB"`, `"price:-1500"` + rejects `"900"` phone numbers etc. |
| `tests/variants.test.ts` | `"size 42,43"` → `Size 42`, `Size 43`; `"L, XL"` → `L`, `XL`. |

### `packages/shared/` — cross-app contract
| File | Purpose |
|---|---|
| `src/types.ts` | `Order`, `Product`, `ProductVariant`, `Merchant`, status enums. If API and dashboard both need it, it lives here. |
| `src/constants.ts` | `PRICE_MIN/MAX`, `HOLD_MINUTES`, order tab labels, DM templates. |
| `src/index.ts` | Re-exports both. |

---

## Where do I…?

| Task | File(s) |
|---|---|
| Change how price/size is parsed | `packages/parser/src/*.ts` + tests |
| Change what happens when someone posts | `apps/bot/src/handlers/channelPost.ts` |
| Add an API endpoint | new file in `apps/api/src/routes/` → register in `apps/api/src/app.ts` |
| Handle payment success | `apps/api/src/webhooks/birrjs.ts` |
| Change buyer checkout UX | `apps/tma/src/pages/CheckoutPage.tsx` + `components/` |
| Change merchant orders board | `apps/dashboard/src/app/dashboard/orders/page.tsx` |
| Add a DB column | `packages/db/migrations/000X_*.sql` **and** `packages/db/src/schema.ts` |
| Add a type both apps share | `packages/shared/src/types.ts` |
| Add a secret | `.env.example` + the relevant `src/env.ts` |

---

## Where do I start? (fill order)

Configs first, then make one flow work end-to-end (post → button → checkout → paid):

1. Root: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.env.example`, `docker-compose.yml`
2. `packages/shared` → 3. `packages/db` (+ run migration) → 4. `packages/parser` (+ tests)
5. `apps/bot` (button injection) → 6. `apps/api` (checkout + webhook) → 7. `apps/tma` → 8. `apps/dashboard`
9. Lint/CI last: `eslint.config.js`, `.prettierrc`, `.github/workflows/ci.yml`

## Planned dev workflow (once files are filled)

```bash
pnpm install
docker compose up -d        # postgres + minio
cp .env.example .env        # fill BOT_TOKEN, CHAPA_* …
pnpm db:migrate
pnpm dev:bot                # terminal 1
pnpm dev:api                # terminal 2
pnpm dev:tma                # terminal 3
pnpm dev:dashboard          # terminal 4
```

## Conventions

- **pnpm workspaces**, packages named `@tce/*`, cross-imports via `workspace:*`
- **Strict TypeScript** everywhere; shared config in `tsconfig.base.json`
- **No secrets in git** — `.env` only, template in `.env.example`
- **Pure logic in `packages/`** (parser, shared) so it's testable without a server
- **`buildApp()` / `bot` instances separate from `listen()`** so tests can mount them
- Spec wins: `SPEC-001.md` is the source of truth; update it when the design changes
