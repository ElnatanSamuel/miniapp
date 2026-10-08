# SPEC-001: TeleCommerce ET (Zero-Touch Telegram Commerce Engine)
**Version:** 1.0.0
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
|          Stores Merchants, Products, Variants, and Orders       |
+───────────────▲─────────────────────────────────▲───────────────+
                │                                 │
    Client Auth (initData)           Session Auth (Telegram OAuth)
                │                                 │
+───────────────┴───────────────+ +───────────────┴───────────────+
|   Telegram Mini App (TMA)     | |    Merchant Web Dashboard     |
|  - Dynamic Zinc Dark UI       | |  - Live Fulfillment Board     |
|  - Size/Variant pill selector | |  - Channel-to-Inventory Sync  |
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

  // Inject the Mini App button into the existing Telegram post
  await ctx.api.editMessageReplyMarkup(post.chat.id, post.message_id, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: `🛍 ይዘዙ / Order (${price.toLocaleString()} ETB)`,
            web_app: { url: `${process.env.TMA_BASE_URL}?p=${product.id}` }
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
Displays cards refreshed via real-time SSE or 10-second polling:

```
+─────────────────────────────────────────────────────────────+
| [● TO FULFILL (3)]    [ COMPLETED (42) ]    [ EXPIRED (5) ] |
+─────────────────────────────────────────────────────────────+
|  ORDER #ET-9182                     2,400 ETB [Telebirr OK] |
|  Product: Nike Dunk Low (Size 42)                           |
|  Customer: +251 91 123 4567 (Call Customer)                 |
|  Mode: [🛵 COURIER DELIVERY]                                |
|  Location: Bole Sub-city, Behind Edna Mall, near Awash Bank |
|                                                             |
|  [ Mark as Fulfilled / Dispatched ]                         |
+─────────────────────────────────────────────────────────────+
```

* **Action:** Clicking **"Mark as Fulfilled"** sets DB status to `fulfilled` and prompts the Telegram Bot to DM the buyer:
  > *"ትዕዛዝዎ #ET-9182 ተዘጋጅቷል! / Your order is ready! The store has dispatched your item."*

### B. Catalog Management Screen (`/dashboard/catalog`)
* **Live Feed from Channel:** Ingested posts appear as cards with image, extracted title, detected price, and stock counts.
* **Sold Out Toggle:** Toggling an item to "Out of Stock" triggers a Telegram Bot API call editing the channel post's button to `❌ ተሽጧል / Sold Out` (unclickable).

---

## 4. Payment Lifecycle with BirrJS

Direct checkout using `@birrjs/core` and provider plugins (`@birrjs/chapa`, Telebirr):

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
export async function createCheckoutSession(order: OrderPayload) {
  // Lock inventory in PostgreSQL for 15 minutes
  await db.orders.setPendingHold(order.id);

  // Initialize payment redirect
  const session = await birr.provider.initializeCheckout({
    amount: order.amount.toString(),
    currency: "ETB",
    email: `${order.buyerTelegramId}@tma.local`,
    tx_ref: `tx_${order.id}_${Date.now()}`,
    callback_url: `${process.env.API_URL}/api/webhooks/birrjs`,
    return_url: `https://t.me/${process.env.BOT_HANDLE}/app?startapp=order_${order.id}`,
    customization: {
      title: order.storeName,
      description: `Order #${order.id.slice(0, 6)}`,
    },
  });

  return session.checkoutUrl;
}
```

---

## 5. PostgreSQL Database Migration

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

-- Orders
CREATE TYPE order_status AS ENUM ('pending_payment', 'paid', 'fulfilled', 'cancelled');
CREATE TYPE fulfillment_type AS ENUM ('in_store_pickup', 'courier_delivery');

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES merchants(id),
    product_id UUID REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
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
```
