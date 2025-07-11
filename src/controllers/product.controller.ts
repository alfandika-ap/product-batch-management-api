import { Context } from "elysia";
import { ProductService } from "../services/product.service";
import { ResponseUtil } from "../utils/response.util";
import { ProductRequest } from "../types/product.types";

export class ProductController {
  static async getProducts(context: Context) {
    try {
      // Extract pagination parameters from query
      const page = context.query?.page ? Number(context.query.page) : 1;
      const limit = context.query?.limit ? Number(context.query.limit) : 10;

      // Validate pagination parameters
      if (page < 1) {
        return ResponseUtil.error('Invalid page number', 'Page number must be greater than 0');
      }
      if (limit < 1 || limit > 100) {
        return ResponseUtil.error('Invalid limit', 'Limit must be between 1 and 100');
      }

      const result = await ProductService.getProducts({ page, limit });
      return ResponseUtil.success(result, 'Products retrieved successfully');
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
      const product = await ProductService.getProductById(context.params.id);
      
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
      const product = await ProductService.updateProduct(context.params.id, context.body);
      
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
      const product = await ProductService.deleteProduct(context.params.id);
      
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

  static async restoreProduct(context: Context) {
    try {
      const product = await ProductService.restoreProduct(context.params.id);
      
      if (!product) {
        return ResponseUtil.error('Product not found', 'Product with the specified ID does not exist');
      }
      
      return ResponseUtil.success(product, 'Product restored successfully');
    } catch (error) {
      console.error('Error restoring product:', error);
      return ResponseUtil.error(
        'Failed to restore product',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  static async permanentDeleteProduct(context: Context) {
    try {
      const product = await ProductService.permanentDeleteProduct(context.params.id);
      
      if (!product) {
        return ResponseUtil.error('Product not found', 'Product with the specified ID does not exist');
      }
      
      return ResponseUtil.success(product, 'Product permanently deleted successfully');
    } catch (error) {
      console.error('Error permanently deleting product:', error);
      return ResponseUtil.error(
        'Failed to permanently delete product',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}