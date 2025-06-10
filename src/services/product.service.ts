import { eq } from 'drizzle-orm';
import db from "../db/connection";
import { productsTable } from "../db/schema";
import { Product, ProductRequest } from '../types/product.types';

export class ProductService {
  static async getProducts() {
    const products = await db.select().from(productsTable);
    return products;
  }
  static async getProductById(id: number) {
    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .limit(1);
    return product;
  }

  static async createProduct(product: ProductRequest) {
    const result = await db.insert(productsTable).values(product).$returningId();
    return result[0];
  }

  static async updateProduct(id: number, product: ProductRequest) {
    const result = await db.update(productsTable).set(product).where(eq(productsTable.id, id));
    return result[0];
  }

  static async deleteProduct(id: number) {
    const result = await db.delete(productsTable).where(eq(productsTable.id, id));
    return result[0];
  }
}