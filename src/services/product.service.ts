import { eq, count, isNull, and } from 'drizzle-orm';
import db from "../db/connection";
import { productsTable } from "../db/schema";
import { Product, ProductRequest } from '../types/product.types';
import { DateUtil } from '../utils/date.util';

export class ProductService {
  static async getProducts(params?: { page?: number; limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const offset = (page - 1) * limit;

    // Get total count for pagination metadata (only active products)
    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(productsTable)
      .where(isNull(productsTable.deletedAt));

    // Get paginated products (only active products)
    const products = await db
      .select()
      .from(productsTable)
      .where(isNull(productsTable.deletedAt))
      .limit(limit)
      .offset(offset);

    return {
      products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPreviousPage: page > 1
      }
    };
  }

  static async getProductById(id: string) {
    const [product] = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.id, id), isNull(productsTable.deletedAt)))
      .limit(1);
    return product;
  }

  static async createProduct(product: ProductRequest) {
    const result = await db.insert(productsTable).values(product).$returningId();
    return result[0];
  }

  static async updateProduct(id: string, product: ProductRequest) {
    const result = await db.update(productsTable).set(product).where(eq(productsTable.id, id));
    return result[0];
  }

  static async deleteProduct(id: string) {
    const result = await db
      .update(productsTable)
      .set({ deletedAt: DateUtil.getCurrentUTCTimestamp() })
      .where(and(eq(productsTable.id, id), isNull(productsTable.deletedAt)));
    return result[0];
  }

  static async restoreProduct(id: string) {
    const result = await db
      .update(productsTable)
      .set({ deletedAt: null })
      .where(eq(productsTable.id, id));
    return result[0];
  }

  static async permanentDeleteProduct(id: string) {
    const result = await db.delete(productsTable).where(eq(productsTable.id, id));
    return result[0];
  }
}