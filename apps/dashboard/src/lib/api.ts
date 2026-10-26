import type { Order, Product, Settlement } from "@tce/shared";
import { z } from "zod";

import { MOCK_ORDERS, MOCK_PRODUCTS, MOCK_SETTLEMENTS } from "./mock";

// In-memory runtime state holding mutations
const ordersState: Order[] = [...MOCK_ORDERS];
const productsState: Product[] = [...MOCK_PRODUCTS];
const settlementsState: Settlement[] = [...MOCK_SETTLEMENTS];

// Zod schemas for validation
export const OrderItemSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  productId: z.string().optional(),
  variantId: z.string().optional(),
  titleSnapshot: z.string(),
  variantSnapshot: z.string().optional(),
  unitPrice: z.number(),
  quantity: z.number().int().min(1),
  lineTotal: z.number(),
});

export const OrderSchema = z.object({
  id: z.string(),
  merchantId: z.string().optional(),
  buyerTelegramId: z.number(),
  buyerPhone: z.string(),
  fulfillment: z.enum(["in_store_pickup", "courier_delivery"]),
  deliverySubcity: z.string().optional(),
  deliveryLandmark: z.string().optional(),
  totalAmount: z.number(),
  status: z.enum(["pending_payment", "paid", "fulfilled", "cancelled"]),
  paymentReference: z.string().optional(),
  paymentProvider: z.enum(["Telebirr", "Chapa", "CBE Birr"]).optional(),
  holdExpiresAt: z.string().optional(),
  createdAt: z.string(),
  items: z.array(OrderItemSchema),
});

export const ProductVariantSchema = z.object({
  id: z.string(),
  productId: z.string(),
  variantName: z.string(),
  stockQuantity: z.number().int().min(0),
});

export const ProductSchema = z.object({
  id: z.string(),
  channelId: z.string().optional(),
  telegramMessageId: z.number().optional(),
  title: z.string(),
  price: z.number().min(0),
  mediaUrls: z.array(z.string()),
  isSoldOut: z.boolean(),
  createdAt: z.string().optional(),
  variants: z.array(ProductVariantSchema),
  telegramPostUrl: z.string().optional(),
});

export const SettlementSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  orderNumber: z.string(),
  totalAmount: z.number(),
  provider: z.enum(["Telebirr", "Chapa", "CBE Birr"]),
  status: z.enum(["paid", "pending"]),
  date: z.string(),
  payoutAccount: z.string(),
});

export interface OrderStats {
  toFulfill: number;
  revenueToday: number;
  revenueThisWeek: number;
  expiredHolds: number;
}

export interface SettlementsSummary {
  settlements: Settlement[];
  totalPaidOut: number;
  pendingPayout: number;
  thisWeekPayout: number;
}

/* =========================================================================
   API Functions (Replace with real fetch calls to apps/api once backend lands)
   ========================================================================= */

/**
 * Fetch all orders or orders filtered by active tab.
 * Ready for SSE/WebSocket subscription upgrade.
 */
export async function getOrders(tab?: "to_fulfill" | "completed" | "expired"): Promise<Order[]> {
  // Simulated small network delay
  await new Promise((res) => setTimeout(res, 80));

  let filtered = [...ordersState];

  if (tab === "to_fulfill") {
    // Paid orders awaiting merchant fulfillment
    filtered = filtered.filter((o) => o.status === "paid");
  } else if (tab === "completed") {
    filtered = filtered.filter((o) => o.status === "fulfilled");
  } else if (tab === "expired") {
    filtered = filtered.filter((o) => o.status === "cancelled" || o.status === "pending_payment");
  }

  // Sort descending by created date
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return z.array(OrderSchema).parse(filtered);
}

/**
 * Get aggregated counts and statistics for the Orders top row cards.
 */
export async function getOrderStats(): Promise<OrderStats> {
  await new Promise((res) => setTimeout(res, 40));

  const toFulfillCount = ordersState.filter((o) => o.status === "paid").length;
  const expiredCount = ordersState.filter((o) => o.status === "cancelled").length;

  // Revenue today & this week computed from completed and paid orders
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;

  let revenueToday = 0;
  let revenueThisWeek = 0;

  for (const order of ordersState) {
    if (order.status === "paid" || order.status === "fulfilled") {
      const orderTime = new Date(order.createdAt).getTime();
      if (orderTime >= startOfToday) {
        revenueToday += order.totalAmount;
      }
      if (orderTime >= sevenDaysAgo) {
        revenueThisWeek += order.totalAmount;
      }
    }
  }

  return {
    toFulfill: toFulfillCount,
    revenueToday,
    revenueThisWeek,
    expiredHolds: expiredCount,
  };
}

/**
 * Mark order as fulfilled (header-level only).
 * Prompts bot to send DM to buyer in production.
 */
export async function markOrderFulfilled(orderId: string): Promise<Order> {
  await new Promise((res) => setTimeout(res, 120));

  const orderIndex = ordersState.findIndex((o) => o.id === orderId);
  if (orderIndex === -1) {
    throw new Error(`Order ${orderId} not found`);
  }

  const order = ordersState[orderIndex];
  if (order.status !== "paid") {
    throw new Error(`Cannot fulfill order ${orderId} with status ${order.status}`);
  }

  const updatedOrder: Order = {
    ...order,
    status: "fulfilled",
  };

  ordersState[orderIndex] = updatedOrder;
  return OrderSchema.parse(updatedOrder);
}

/**
 * Fetch channel-synced catalog products.
 */
export async function getCatalogProducts(options?: {
  search?: string;
  filter?: "all" | "in_stock" | "sold_out";
}): Promise<Product[]> {
  await new Promise((res) => setTimeout(res, 80));

  let results = [...productsState];

  if (options?.filter === "in_stock") {
    results = results.filter((p) => !p.isSoldOut && p.variants.some((v) => v.stockQuantity > 0));
  } else if (options?.filter === "sold_out") {
    results = results.filter((p) => p.isSoldOut || p.variants.every((v) => v.stockQuantity === 0));
  }

  if (options?.search) {
    const q = options.search.toLowerCase();
    results = results.filter((p) => p.title.toLowerCase().includes(q));
  }

  return z.array(ProductSchema).parse(results);
}

/**
 * Toggle product sold-out state.
 * In production, triggers Bot API editMessageReplyMarkup to ❌ ተሽጧል / Sold Out.
 */
export async function toggleProductSoldOut(productId: string, isSoldOut: boolean): Promise<Product> {
  await new Promise((res) => setTimeout(res, 100));

  const index = productsState.findIndex((p) => p.id === productId);
  if (index === -1) {
    throw new Error(`Product ${productId} not found`);
  }

  const updated: Product = {
    ...productsState[index],
    isSoldOut,
  };

  productsState[index] = updated;
  return ProductSchema.parse(updated);
}

/**
 * Update stock count for a single variant.
 */
export async function updateVariantStock(productId: string, variantId: string, newStock: number): Promise<Product> {
  await new Promise((res) => setTimeout(res, 100));

  const pIndex = productsState.findIndex((p) => p.id === productId);
  if (pIndex === -1) {
    throw new Error(`Product ${productId} not found`);
  }

  const product = productsState[pIndex];
  const updatedVariants = product.variants.map((v) =>
    v.id === variantId ? { ...v, stockQuantity: Math.max(0, newStock) } : v,
  );

  const updated: Product = {
    ...product,
    variants: updatedVariants,
  };

  productsState[pIndex] = updated;
  return ProductSchema.parse(updated);
}

/**
 * Fetch settlements ledger & summary metrics.
 */
export async function getSettlements(): Promise<SettlementsSummary> {
  await new Promise((res) => setTimeout(res, 80));

  const totalPaidOut = settlementsState
    .filter((s) => s.status === "paid")
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  const pendingPayout = settlementsState
    .filter((s) => s.status === "pending")
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  const now = new Date();
  const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const thisWeekPayout = settlementsState
    .filter((s) => s.status === "paid" && new Date(s.date).getTime() >= sevenDaysAgo)
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  return {
    settlements: z.array(SettlementSchema).parse(settlementsState),
    totalPaidOut,
    pendingPayout,
    thisWeekPayout,
  };
}
