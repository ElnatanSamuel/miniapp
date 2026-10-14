export type Product = {
  id: string;
  channelId?: number;
  messageId?: number;
  title: string;
  description: string | null;
  price: number | null;
  variants: string[];
  images: string[];
  createdAt?: string;
};

export type IndexEntry = {
  id: string;
  title: string;
  price: number | null;
  image: string | null;
  createdAt: string;
};

export type FulfillmentType = "in_store_pickup" | "courier_delivery";

export const ADDIS_SUBCITIES = [
  { am: "ቦሌ", en: "Bole" },
  { am: "የካ", en: "Yeka" },
  { am: "ቂርቆስ", en: "Kirkos" },
  { am: "አራዳ", en: "Arada" },
  { am: "ጉለሌ", en: "Gullele" },
  { am: "ልደታ", en: "Lideta" },
  { am: "ንፋስ ስልክ ላፍቶ", en: "Nifas Silk-Lafto" },
  { am: "ኮልፌ ቀራኒዮ", en: "Kolfe Keranio" },
  { am: "አቃቂ ቃሊቲ", en: "Akaki Kality" },
  { am: "አዲስ ከተማ", en: "Addis Ketema" },
  { am: "ለሚ ኩራ", en: "Lemi Kura" },
] as const;

export type AddisSubcity = (typeof ADDIS_SUBCITIES)[number]["en"];

export type CheckoutLine = {
  productId: string;
  variantId: string;
  quantity: number;
};

export type CartCheckoutPayload = {
  cartId?: string;
  items?: CheckoutLine[];
  ackPriceDrift?: true;
  fulfillment: FulfillmentType;
  buyerPhone: string;
  deliverySubcity?: string;
  deliveryLandmark?: string;
};

export type CheckoutResponse = {
  checkoutUrl: string;
  orderId: string;
};

