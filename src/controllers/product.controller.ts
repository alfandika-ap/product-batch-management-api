import { Context } from "elysia";
import { ProductService } from "../services/product.service";
import { ResponseUtil } from "../utils/response.util";
import { ProductRequest } from "../types/product.types";

export class ProductController {
  static async getProducts(context: Context) {
    try {
      const products = await ProductService.getProducts();
      return ResponseUtil.success(products, 'Products retrieved successfully');
    } catch (error) {
      console.error('Error fetching products:', error);
      return ResponseUtil.error(
        'Failed to retrieve products', 
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  static async getProductById(context: Context) {
    try {
      const product = await ProductService.getProductById(Number(context.params.id));
      
      if (!product) {
        return ResponseUtil.error('Product not found', 'Product with the specified ID does not exist');
      }
      
      return ResponseUtil.success(product, 'Product retrieved successfully');
    } catch (error) {
      console.error('Error fetching product:', error);
      return ResponseUtil.error(
        'Failed to retrieve product',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  static async createProduct(context: Context & { body: ProductRequest }) {
    try {
      const product = await ProductService.createProduct(context.body);
      return ResponseUtil.success(product, 'Product created successfully');
    } catch (error) {
      console.error('Error creating product:', error);
      return ResponseUtil.error(
        'Failed to create product',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  static async updateProduct(context: Context & { body: ProductRequest }) {
    try {
      const product = await ProductService.updateProduct(Number(context.params.id), context.body);
      
      if (!product) {
        return ResponseUtil.error('Product not found', 'Product with the specified ID does not exist');
      }
      
      return ResponseUtil.success(product, 'Product updated successfully');
    } catch (error) {
      console.error('Error updating product:', error);
      return ResponseUtil.error(
        'Failed to update product',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  static async deleteProduct(context: Context) {
    try {
      const product = await ProductService.deleteProduct(Number(context.params.id));
      
      if (!product) {
        return ResponseUtil.error('Product not found', 'Product with the specified ID does not exist');
      }
      
      return ResponseUtil.success(product, 'Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      return ResponseUtil.error(
        'Failed to delete product',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}