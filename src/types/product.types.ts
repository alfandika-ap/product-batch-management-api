export interface Product {
  id: number;
  name: string;
  category?: string;
  imageUrl?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductRequest = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;