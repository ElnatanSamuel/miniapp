# SPEC-001: TeleCommerce ET (Zero-Touch Telegram Commerce Engine)
**Version:** 1.1.0 (adds §6 Cart & Multi-Item Checkout)
**Target:** Addis Ababa, Ethiopia (Telegram Boutiques & Kiosks)
**Primary Stack:** Node.js (Fastify / grammY) + React (Vite / TMA) + Next.js (Admin Portal) + PostgreSQL + BirrJS

---

## 1. System Topology

```
+─────────────────────────────────────────────────────────────────+
|               Telegram Channel (e.g., @BoleThrift)              |
|        Merchant posts photo + caption (Amharic / English)       |
+────────────────────────────────┬────────────────────────────────+
                                 │
                   Webhook: channel_post event
                                 ▼
+─────────────────────────────────────────────────────────────────+
|              Ingestion Worker (grammY Bot Daemon)               |
|  - Streams top-res photo -> Cloudflare R2 / S3                  |
|  - Heuristic Regex Parser (Price ETB, Sizes 36-45/S-XXL, Title) |
|  - Injects inline button: [ 🛍 ይዘዙ / Order Now (2,400 ETB) ]    |
+────────────────────────────────┬────────────────────────────────+
                                 │
                        Internal SQL Insert
                                 ▼
+─────────────────────────────────────────────────────────────────+
|                    Database Core (PostgreSQL)                   |
|          Stores Merchants, Products, Variants, Carts, Orders     |
|          and Order Items                                          |
+───────────────▲─────────────────────────────────▲───────────────+
                │                                 │
    Client Auth (initData)           Session Auth (Telegram OAuth)
                │                                 │
+───────────────┴───────────────+ +───────────────┴───────────────+
|   Telegram Mini App (TMA)     | |    Merchant Web Dashboard     |
|  - Dynamic Zinc Dark UI       | |  - Live Fulfillment Board     |
|  - Size/Variant pill selector | |  - Channel-to-Inventory Sync  |
|  - Cart sheet + qty steppers  | |  - Order line-items view      |
|  - Bottom-sheet pickup/courier| |  - BirrJS Payout Config       |
|  - BirrJS checkout redirect   | |  - 1-Click "Mark Fulfilled"   |
+───────────────────────────────+ +───────────────────────────────+
                │
                ▼
+─────────────────────────────────────────────────────────────────+
|                 BirrJS Gateway & Webhook Engine                 |
|            Telebirr / Chapa / CBE Birr Processing               |
|  - Validates cryptographic signature                            |
|  - Sets Order: paid -> fires Telegram Bot DM to Buyer & Shop    |
+─────────────────────────────────────────────────────────────────+
```

---

## 2. Realistic Channel Post Parsing Rules

Sellers in Addis Ababa post in a blend of Amharic, English, and local slang.

### A. Price Matcher
Targets digits around `ETB`, `Birr`, `ብር`, `ዋጋ`, and `/-`.
```typescript
const PRICE_REGEX = /(?:ዋጋ|price|💲)?\s*[:=-]?\s*(\d{1,3}(?:[,\s]\d{3})*|\d+)\s*(?:etb|birr|ብር|\/-)?/i;

export function extractPrice(text: string): number | null {
  const match = text.match(PRICE_REGEX);
  if (!match) return null;
  const cleaned = match[1].replace(/[\s,]/g, "");
  const val = parseFloat(cleaned);
  return val >= 50 && val <= 500000 ? val : null;
}
```

### B. Size Matcher
Supports apparel and footwear (Euro sizes 36–46 are standard in Ethiopia):
```typescript
const APPAREL_SIZES = /\b(XXS|XS|S|M|L|XL|2XL|3XL|XXL)\b/gi;
const SHOE_SIZES = /(?:size|ቁጥር)?\s*[:=-]?\s*([3-4][0-8](?:\s*[,/-]\s*[3-4][0-8])*)/i;

export function extractVariants(text: string): string[] {
  const variants: string[] = [];
  const apparelMatches = text.match(APPAREL_SIZES);
  if (apparelMatches) {
    variants.push(...new Set(apparelMatches.map((s) => s.toUpperCase())));
  }
  const shoeMatch = text.match(SHOE_SIZES);
  if (shoeMatch) {
    const rawNumbers = shoeMatch[1].match(/[3-4][0-8]/g);
    if (rawNumbers) variants.push(...new Set(rawNumbers.map((n) => `Size ${n}`)));
  }
  return variants.length > 0 ? variants : ["Standard"];
}
```

### C. Bot Channel Post Ingestion (`bot.ts`)

> **Button type constraint (Bot API):** `web_app` inline buttons are **private chats
> only** — Telegram rejects them in channels with `BUTTON_TYPE_INVALID`. Channel posts
> therefore get a plain **`url` button** pointing at the main Mini App direct link
> `https://t.me/<bot>?startapp=<productId>` (requires the Main Mini App configured in
> BotFather; the param arrives in the TMA as `start_param` / `tgWebAppStartParam`).
> The private-chat `/start` reply keyboard keeps using `web_app`.

```typescript
bot.on("channel_post", async (ctx) => {
  const post = ctx.channelPost;
  const caption = post.caption || post.text || "";
  if (!caption) return;

  const price = extractPrice(caption);
  if (!price) return; // Ignore non-product announcements

  const variants = extractVariants(caption);
  const title = caption.split("\n")[0].slice(0, 120).trim();

  // Save product to database
  const product = await db.products.create({
    channelId: post.chat.id,
    messageId: post.message_id,
    title,
    price,
    variants,
  });

  // Inject the order button into the existing Telegram post.
  // url (deep link), NOT web_app — web_app is private-chat only.
  await ctx.api.editMessageReplyMarkup(post.chat.id, post.message_id, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: `🛍 ይዘዙ / Order (${price.toLocaleString()} ETB)`,
            url: `https://t.me/${BOT_HANDLE}?startapp=p_${product.id}`,
          }
        ]
      ]
    }
  });
});
```

---

## 3. Merchant Web Dashboard Spec

A streamlined portal for boutique staff to track fulfillment without getting bogged down in typical ERP complexity.

```
/dashboard
├── /orders          -> Live Kanban/Table of customer checkouts (Default)
├── /catalog         -> Synced channel items with instant stock toggles
└── /settlements     -> BirrJS payout ledger (Telebirr / CBE Birr)
```

### A. Live Orders Screen (`/dashboard/orders`)
Displays cards refreshed via real-time SSE or 10-second polling. Each card lists
every `order_items` line — a cart checkout shows N lines under one order header:

```
+─────────────────────────────────────────────────────────────+
| [● TO FULFILL (3)]    [ COMPLETED (42) ]    [ EXPIRED (5) ] |
+─────────────────────────────────────────────────────────────+
|  ORDER #ET-9182                     5,900 ETB [Telebirr OK] |
|  Items (2):                                                 |
|   1× Nike Dunk Low (Size 42)        2,400 ETB               |
|   1× Adidas Hoodie (XL)             3,500 ETB               |
|  Customer: +251 91 123 4567 (Call Customer)                 |
|  Mode: [🛵 COURIER DELIVERY]                                |
|  Location: Bole Sub-city, Behind Edna Mall, near Awash Bank |
|                                                             |
|  [ Mark as Fulfilled / Dispatched ]                         |
+─────────────────────────────────────────────────────────────+
```

* **Action:** Clicking **"Mark as Fulfilled"** sets the **order header** status to
  `fulfilled` (all line items at once — never line-by-line) and prompts the Telegram
  Bot to DM the buyer with an itemized summary:
  > *"ትዕዛዝዎ #ET-9182 ተዘጋጅቷል! / Your order is ready! 1× Nike Dunk Low (42), 1× Adidas Hoodie (XL). The store has dispatched your items."*
* **Sold-out lines:** a line whose product was toggled sold-out after purchase still
  fulfills normally (it was paid); the toggle only blocks *new* checkouts.

### B. Catalog Management Screen (`/dashboard/catalog`)
* **Live Feed from Channel:** Ingested posts appear as cards with image, extracted title, detected price, and stock counts.
* **Sold Out Toggle:** Toggling an item to "Out of Stock" triggers a Telegram Bot API call editing the channel post's button to `❌ ተሽጧል / Sold Out` (unclickable).

---

## 4. Payment Lifecycle with BirrJS

Checkout accepts **either** a cart (`cartId`) **or** a direct line list (`items[]`)
for the instant 🛍 buy-now path — both run the exact same server pipeline, and the
buy-now path never touches a cart record.

**Request:** `POST /api/checkout` `{ cartId }` *or* `{ items: [{productId, variantId, quantity}] }`
plus `fulfillment`, `buyerPhone`, `deliverySubcity`, `deliveryLandmark`.

**Pipeline (in order, one DB transaction):**

1. **Revalidate every line** against live catalog state:
   * product `is_sold_out` → reject `SOLD_OUT` (name the line; TMA prompts removal)
   * live price ≠ price the buyer saw → reject `PRICE_CHANGED` with the delta;
     TMA shows a confirm sheet and re-submits with `ackPriceDrift: true` — **never
     silently charge a different amount**
   * `quantity > stock_quantity` → reject `INSUFFICIENT_STOCK`
2. **Single order header + N `order_items`** — `unit_price` is *snapshotted* here,
   `total_amount` = Σ(qty × unit_price), one `hold_expires_at` (15 min) locks every variant.
3. **Cart checkout only:** clear the buyer's cart after the order row is committed
   (stock is locked, so the cart has no further job). Buy-now skips this.
4. **Initialize BirrJS** with the summed total; `tx_ref` stays `tx_<orderId>_<ts>`
   so the webhook resolves one order regardless of line count.

```typescript
// checkout.ts
import { createBirrJS } from "birrjs";
import { chapa } from "@birrjs/chapa";

export const birr = createBirrJS({
  database: process.env.DATABASE_URL!,
  provider: chapa({
    secretKey: process.env.CHAPA_SECRET_KEY!,
    webhookSecret: process.env.CHAPA_WEBHOOK_SECRET!,
    callbackUrl: `${process.env.API_URL}/api/webhooks/birrjs`,
  }),
});

// POST /api/checkout
export async function createCheckoutSession(payload: CartCheckoutPayload) {
  // 1. Revalidate (sold-out / price drift / stock) — throws typed errors above
  const lines = await revalidateLines(payload);

  return db.tx(async (tx) => {
    // 2. One header, N lines, one hold — unit_price snapshotted per line
    const order = await createOrderWithItems(tx, payload, lines);

    // 3. Cart path only: cart is emptied once the hold exists
    if (payload.cartId) await tx.clearCart(payload.cartId);

    // 4. Single payment session for the whole basket
    const session = await birr.provider.initializeCheckout({
      amount: order.totalAmount.toString(),
      currency: "ETB",
      email: `${order.buyerTelegramId}@tma.local`,
      tx_ref: `tx_${order.id}_${Date.now()}`,
      callback_url: `${process.env.API_URL}/api/webhooks/birrjs`,
      return_url: `https://t.me/${process.env.BOT_HANDLE}/app?startapp=order_${order.id}`,
      customization: {
        title: order.storeName,
        description: `Order #${order.id.slice(0, 6)} · ${lines.length} item${lines.length > 1 ? "s" : ""}`,
      },
    });

    return session.checkoutUrl;
  });
}
```

* **Webhook unchanged (§4 still holds):** `POST /api/webhooks/birrjs` verifies the
  signature, matches `tx_ref`, flips the *header* `pending_payment → paid` (idempotent),
  then fires one buyer DM + one shop DM summarizing all lines.
* **Expiry:** a `pending_payment` order that outlives `hold_expires_at` releases every
  variant hold at once; status moves to `cancelled` and the buyer DM says the basket expired.

---

## 5. PostgreSQL Database Migration

Lands as `packages/db/migrations/0001_init.sql` (edited in place — this file has
never been applied anywhere).

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Merchants
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_user_id BIGINT UNIQUE NOT NULL,
    store_name VARCHAR(150) NOT NULL,
    contact_phone VARCHAR(30) NOT NULL,
    payout_provider VARCHAR(30) DEFAULT 'telebirr',
    payout_account VARCHAR(60) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registered Telegram Channels
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    telegram_channel_id BIGINT UNIQUE NOT NULL,
    channel_title VARCHAR(200) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ingested Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    telegram_message_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    media_urls TEXT[] NOT NULL,
    is_sold_out BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_channel_post UNIQUE(channel_id, telegram_message_id)
);

-- Product Variants
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_name VARCHAR(60) NOT NULL,
    stock_quantity INT DEFAULT 1
);

-- Carts: exactly one OPEN cart per buyer (§6). merchant_id pins the
-- one-merchant-per-cart rule; NULL until the first item is added.
CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_telegram_id BIGINT UNIQUE NOT NULL,
    merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cart lines. No price column: prices are joined live from products so a
-- stale cache can never decide a charge. Qty capped at the line limit.
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 10),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_cart_line UNIQUE(cart_id, product_id, variant_id)
);

CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);

-- Orders: header only — fulfillment, address, payment, totals, status.
CREATE TYPE order_status AS ENUM ('pending_payment', 'paid', 'fulfilled', 'cancelled');
CREATE TYPE fulfillment_type AS ENUM ('in_store_pickup', 'courier_delivery');

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES merchants(id),
    buyer_telegram_id BIGINT NOT NULL,
    buyer_phone VARCHAR(30) NOT NULL,
    fulfillment fulfillment_type NOT NULL,
    delivery_subcity VARCHAR(100),
    delivery_landmark TEXT,
    total_amount NUMERIC(10, 2) NOT NULL,
    status order_status DEFAULT 'pending_payment',
    payment_reference VARCHAR(150),
    hold_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 minutes'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_merchant_status ON orders(merchant_id, status);

-- Order lines: one row per purchased item. unit_price is the snapshot taken
-- at checkout (§4 step 2) so later catalog edits never rewrite history.
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    title_snapshot VARCHAR(255) NOT NULL,
    variant_snapshot VARCHAR(60),
    unit_price NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity >= 1),
    line_total NUMERIC(10, 2) GENERATED ALWAYS AS (unit_price * quantity) STORED
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
```

---

## 6. Cart & Multi-Item Checkout

The cart lets a buyer stack several items from **one shop** into a single payment
and a single fulfillment action. The instant 🛍 buy-now button (§2C) stays untouched —
it posts `items[]` directly and never creates a cart record.

### A. Storage Split (Postgres = truth, localStorage = instant UI)

| Layer | Holds | Role |
|---|---|---|
| `carts` + `cart_items` | server | Source of truth. Keyed by `buyer_telegram_id` from verified `initData`. Survives device switches, enables abandoned-cart DMs later. |
| `localStorage["tce:cart"]` | client | Version-stamped cache (`v: 1`) for instant first paint and offline-ish browsing. **Display only — never a charge input.** |

**Sync rules:**
1. **Boot:** paint from cache → `GET /api/cart` → replace state with server response
   (server wins on any conflict; a cache miss is not an error).
2. **Write:** apply optimistically locally → debounce 400 ms → send the mutation →
   reconcile with the server response. On `409`/`410`, drop local, refetch, surface toast.
3. **Invalidate:** version mismatch on the cache key → discard cache silently.
4. **Clear:** server `DELETE /api/cart` first, then local; on checkout success clear both.

### B. One-Merchant Rule

`carts.merchant_id` is set by the first item. Adding an item from a *different*
merchant returns `409 CART_MERCHANT_CONFLICT` with `{ conflictingStoreName }`.
The TMA shows a sheet — *"Your cart has items from {A}. Clear it and start a new cart for {B}?"*
— and on confirm runs `DELETE /api/cart` then retries the add. Never silently merge.

### C. API Surface

All routes are prefixed `/api/cart`, require the `initData` HMAC header (same guard
as every TMA request), and operate on the caller's own cart only.

| Method | Path | Body | Notes |
|---|---|---|---|
| `GET` | `/api/cart` | — | Returns cart + hydrated lines (title, media, **live** price, variant stock, `is_sold_out` flags, line subtotal, cart total). Creates an empty cart lazily or returns `{ items: [] }`. |
| `POST` | `/api/cart/items` | `{ productId, variantId, quantity? }` | Upserts (increments) the line. Enforces one-merchant rule, `quantity ≤ 10`, and `total lines ≤ 20` → `422 CART_FULL`. |
| `PATCH` | `/api/cart/items/:itemId` | `{ quantity }` | `0` is invalid here — use DELETE. Clamps against `stock_quantity` → `422 INSUFFICIENT_STOCK`. |
| `DELETE` | `/api/cart/items/:itemId` | — | Removes one line. |
| `DELETE` | `/api/cart` | — | Clears all lines (used by the conflict sheet and post-checkout). |

**Error vocabulary** (shared with §4): `SOLD_OUT`, `PRICE_CHANGED { livePrice }`,
`INSUFFICIENT_STOCK { available }`, `CART_MERCHANT_CONFLICT { conflictingStoreName }`,
`CART_FULL`, `LINE_LIMIT`.

### D. Checkout Payload

```typescript
// packages/shared/src/types.ts
type CartCheckoutPayload = {
  cartId?: string;        // cart path — server loads lines from cart_items
  items?: CheckoutLine[]; // buy-now path — { productId, variantId, quantity }
  ackPriceDrift?: true;   // only set after the buyer confirms a PRICE_CHANGED sheet
  fulfillment: "in_store_pickup" | "courier_delivery";
  buyerPhone: string;
  deliverySubcity?: string;
  deliveryLandmark?: string;
};
```

Both paths converge on the §4 pipeline (revalidate → header + lines → clear cart →
BirrJS). Exactly one of `cartId` / `items` must be present → `400`.

### E. TMA Screens & Components

| Piece | File | Behavior |
|---|---|---|
| Add to cart | `pages/ProductPage.tsx` | Secondary CTA beside the instant **Buy now**. Requires a selected variant; shows a `+` toast and bumps the header badge. |
| Header badge | `components/CartBadge.tsx` | Live line count, opens the cart. |
| Cart sheet | `components/CartSheet.tsx` | Bottom sheet: lines with thumb/title/variant, `QuantityStepper`, remove, live subtotal, sold-out/price-change callouts, **Checkout** CTA. Empty state links back to the product. |
| Qty stepper | `components/QuantityStepper.tsx` | `− n +`, clamped 1–10 and by live stock; disables `+` at the cap. |
| State | `hooks/useCart.ts` | Implements §6A: cache read/write, debounced sync, mutation helpers, conflict handling. One hook instance at app root (`CartProvider`). |
| Checkout | `pages/CheckoutPage.tsx` | Renders the same form for both paths; on `PRICE_CHANGED` shows a confirm sheet (old → new total) then resubmits with `ackPriceDrift`. |
| Success | `pages/SuccessPage.tsx` | Unchanged — order-level deep link (`startapp=order_<id>`), now lists all lines. |

### F. Dashboard & Notifications

* **Orders card** shows the `order_items` list (§3A); **Mark as Fulfilled** remains a
  single header-level action.
* **Settlements** unchanged — one row per order, `total_amount` already summed.
* **DM templates** (`packages/shared/src/constants.ts`) gain an itemized variant:
  payment-received and order-ready DMs list `qty× title (variant)` lines, collapsing
  to the original single-item copy when `order_items` has exactly one row.

### G. Limits & Edge Cases

* **Qty per line:** 1–10 (`CHECK` enforced). **Lines per cart:** 20.
* **Cart TTL:** carts untouched for **30 days** are swept (cascade deletes lines);
  the buyer's next add silently starts fresh.
* **Sold-out line in cart:** allowed to sit (with a warning badge) but **blocks
  checkout** until removed — the buyer is never charged for it.
* **Price drift:** cart shows live prices at all times, so drift normally never
  reaches checkout; the §4 revalidation is the backstop for the seconds between
  render and submit.
* **Variant deleted / product pulled mid-cart:** line fails revalidation →
  `SOLD_OUT`-style rejection naming the line.
* **Stock default of 1:** qty > 1 must validate against `stock_quantity` server-side
  at both `POST /cart/items` and checkout — UI caps alone are not sufficient.
