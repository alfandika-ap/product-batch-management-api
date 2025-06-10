import { Context } from "elysia";
import { BatchService } from "../services/batch.service";
import { ResponseUtil } from "../utils/response.util";
import { ProductBatchRequest } from "../types/batch.types";
import { generateSerialNumber, getLastSequenceNumber } from "../taks/workers/generate-product-batch-item.worker";

export class BatchController {
  static async getBatches(context: Context) {
    try {
      // Get productId from query parameters if provided
      const productId = context.query?.productId ? Number(context.query.productId) : undefined;
      const batches = await BatchService.getBatches({ productId });
      return ResponseUtil.success(batches, 'Batches retrieved successfully');
    } catch (error) {
      console.error('Error fetching batches:', error);
      return ResponseUtil.error('Failed to retrieve batches', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  static async createBatch(context: Context & { body: { product_id: number; batch_code: string; quantity: number } }) {
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
            serialNumber: generateSerialNumber(batch.batchCode, i, lastSequence)
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
      const batchId = Number(context.params.id);
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
}