import { Context } from "elysia";
import { BatchService } from "../services/batch.service";
import { ResponseUtil } from "../utils/response.util";
import { ProductBatchRequest } from "../types/batch.types";
import { generateSerialNumber, getLastSequenceNumber } from "../taks/workers/generate-product-batch-item.worker";

export class BatchController {
  static async getBatches(context: Context) {
    try {

      const page = context.query?.page ? Number(context.query.page) : 1;
      const limit = context.query?.limit ? Number(context.query.limit) : 10;

      // Validate pagination parameters
      if (page < 1) {
        return ResponseUtil.error('Invalid page number', 'Page number must be greater than 0');
      }
      if (limit < 1 || limit > 100) {
        return ResponseUtil.error('Invalid limit', 'Limit must be between 1 and 100');
      }

      // Get productId from query parameters if provided
      const productId = context.query?.productId ? context.query.productId : undefined;
      const batches = await BatchService.getBatches({ productId, page, limit });
      return ResponseUtil.success(batches, 'Batches retrieved successfully');
    } catch (error) {
      console.error('Error fetching batches:', error);
      return ResponseUtil.error('Failed to retrieve batches', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  static async getBatchItems(context: Context) {
    try {

      const page = context.query?.page ? Number(context.query.page) : 1;
      const limit = context.query?.limit ? Number(context.query.limit) : 10;

      // Validate pagination parameters
      if (page < 1) {
        return ResponseUtil.error('Invalid page number', 'Page number must be greater than 0');
      }
      if (limit < 1 || limit > 100) {
        return ResponseUtil.error('Invalid limit', 'Limit must be between 1 and 100');
      }

      const batchId = context.params.id;
      const items = await BatchService.getBatchItems(batchId, { page, limit });
      return ResponseUtil.success(items, 'Batch items retrieved successfully');
    } catch (error) {
      console.error('Error fetching batch items:', error);
      return ResponseUtil.error('Failed to retrieve batch items', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  static async createBatch(context: Context & { body: { product_id: string; batch_code: string; quantity: number } }) {
    try {
      // Transform snake_case to camelCase
      const batchRequest: ProductBatchRequest = {
        productId: context.body.product_id,
        batchCode: context.body.batch_code,
        quantity: context.body.quantity,
        generateProductItemsStatus: context.body.quantity > 10 ? 'pending' : 'completed'
      };

      const batch = await BatchService.createProductBatch(batchRequest);
      const qty = batchRequest.quantity;
      
      // Use async processing for large quantities
      if (qty > 10) { // Threshold for async processing
        const result = await BatchService.createProductItemsAsync(
          batch.id,
          qty,
          {
            batchSize: 100, // Process 100 items per job
            qrCodePrefix: 'QR'
          }
        );
        
        return ResponseUtil.success({
          batch: batch,
          processing: result
        }, `Batch created successfully. ${qty} product items are being generated asynchronously.`);
      } else {
        const lastSequence = await getLastSequenceNumber(batch.id);
        // For small quantities, use synchronous processing 
        for (let i = 0; i < qty; i++) {
          await BatchService.createProductItem({
            batchId: batch.id,
            qrCode: `QR-${batch.id}-${i}`,
            serialNumber: generateSerialNumber(batch.batchCode, i, lastSequence),
            itemOrder: i + 1
          });
        }
        return ResponseUtil.success(batch, 'Batch created successfully');
      }
    } catch (error) {
      console.error('Error creating batch:', error);
      return ResponseUtil.error('Failed to create batch', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  static async getBatchProgress(context: Context) {
    try {
      const batchId = context.params.id;
      const progress = await BatchService.getBatchJobProgress(batchId);
      
      if (!progress) {
        return ResponseUtil.error('Progress information not available', 'Unable to retrieve progress');
      }
      
      return ResponseUtil.success(progress, 'Batch progress retrieved successfully');
    } catch (error) {
      console.error('Error fetching batch progress:', error);
      return ResponseUtil.error('Failed to retrieve batch progress', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  static async deleteBatch(context: Context) {
    try {
      const batchId = context.params.id;
      const batch = await BatchService.deleteProductBatch(batchId);
      return ResponseUtil.success(batch, 'Batch deleted successfully');
    } catch (error) {
      if (error instanceof Error) {
        // Log detailed error information
        context.set.status = 500;
        console.error('Error deleting batch:', {
          message: error.message,
          stack: error.stack,
          batchId: context.params.id
        });
        
        // Check for specific database errors
        if (error.message.includes('foreign key constraint')) {
          return ResponseUtil.error(
            'Cannot delete batch', 
            'This batch has associated product items that must be deleted first'
          );
        }
        
        if (error.message.includes('not found')) {
          return ResponseUtil.error(
            'Batch not found', 
            'The specified batch does not exist'
          );
        }
      }
      console.error('Error deleting batch:', error);
      return ResponseUtil.error('Failed to delete batch', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}