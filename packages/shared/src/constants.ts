export const PRICE_MIN = 50;
export const PRICE_MAX = 500000;
export const HOLD_MINUTES = 15;
export const CART_STORAGE_KEY = "tce:cart";
export const CART_MAX_QUANTITY_PER_LINE = 10;
export const CART_MAX_LINES = 20;

export const ORDER_STATUSES = {
  PENDING_PAYMENT: "pending_payment",
  PAID: "paid",
  FULFILLED: "fulfilled",
  CANCELLED: "cancelled",
} as const;

export const FULFILLMENT_TYPES = {
  IN_STORE_PICKUP: "in_store_pickup",
  COURIER_DELIVERY: "courier_delivery",
} as const;

export const ORDER_TABS = {
  TO_FULFILL: "to_fulfill",
  COMPLETED: "completed",
  EXPIRED: "expired",
} as const;

export const DM_TEMPLATES = {
  orderReady: (orderNumber: string, itemSummary: string) =>
    `ትዕዛዝዎ #${orderNumber} ተዘጋጅቷል! / Your order is ready! ${itemSummary}. The store has dispatched your items.`,
  paymentReceived: (orderNumber: string, totalETB: string, itemSummary: string) =>
    `ክፍያዎ ተቀብለናል! / Payment confirmed for #${orderNumber} (${totalETB} ETB). Items: ${itemSummary}.`,
  orderExpired: (orderNumber: string) =>
    `ትዕዛዝዎ #${orderNumber} ጊዜው አልፏል / Your order reservation #${orderNumber} has expired.`,
};
