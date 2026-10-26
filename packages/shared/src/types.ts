export type OrderStatus = "pending_payment" | "paid" | "fulfilled" | "cancelled";

export type FulfillmentType = "in_store_pickup" | "courier_delivery";

export type PaymentProvider = "Telebirr" | "Chapa" | "CBE Birr";

export interface Merchant {
  id: string;
  telegramUserId: number;
  storeName: string;
  contactPhone: string;
  payoutProvider: string;
  payoutAccount: string;
  channelTitle?: string;
  channelUsername?: string;
  createdAt?: string;
}

export interface Channel {
  id: string;
  merchantId: string;
  telegramChannelId: number;
  channelTitle: string;
  isActive: boolean;
  createdAt?: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  variantName: string;
  stockQuantity: number;
}

export interface Product {
  id: string;
  channelId?: string;
  telegramMessageId?: number;
  title: string;
  price: number;
  mediaUrls: string[];
  isSoldOut: boolean;
  createdAt?: string;
  variants: ProductVariant[];
  telegramPostUrl?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string;
  variantId?: string;
  titleSnapshot: string;
  variantSnapshot?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  merchantId?: string;
  buyerTelegramId: number;
  buyerPhone: string;
  fulfillment: FulfillmentType;
  deliverySubcity?: string;
  deliveryLandmark?: string;
  totalAmount: number;
  status: OrderStatus;
  paymentReference?: string;
  paymentProvider?: PaymentProvider;
  holdExpiresAt?: string;
  createdAt: string;
  items: OrderItem[];
}

export interface Settlement {
  id: string;
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  provider: PaymentProvider;
  status: "paid" | "pending";
  date: string;
  payoutAccount: string;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId: string;
  quantity: number;
  createdAt?: string;
}

export interface Cart {
  id: string;
  buyerTelegramId: number;
  merchantId?: string | null;
  items: CartItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CheckoutLine {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface CartCheckoutPayload {
  cartId?: string;
  items?: CheckoutLine[];
  ackPriceDrift?: true;
  fulfillment: FulfillmentType;
  buyerPhone: string;
  deliverySubcity?: string;
  deliveryLandmark?: string;
}
