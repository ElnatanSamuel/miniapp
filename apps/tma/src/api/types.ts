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
