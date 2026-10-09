/** Fake catalog — the only "backend" until the API lands. */
export type MockProduct = {
  id: string;
  title: string;
  price: number;
  image: string;
  variants: string[];
  stock: number;
};

export const products: MockProduct[] = [];
