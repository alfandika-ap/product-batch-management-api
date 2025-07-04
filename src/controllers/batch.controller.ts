import { Context } from "elysia";
import { BatchService } from "../services/batch.service";
import { ResponseUtil } from "../utils/response.util";
import { ProductBatchRequest } from "../types/batch.types";
import { generateSerialNumber, getLastSequenceNumber } from "../taks/workers/generate-product-batch-item.worker";
import { CryptoUtil } from "../utils/crypto.util";

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
      const batchDetails = await BatchService.getProductBatchById(batchId);
      const batchDeleted = await BatchService.deleteProductBatch(batchId);
      
      if (batchDetails.length) {
        const item = batchDetails[0];
        if (item.batchLinkDownload) {
          const fs = await import('fs');
          const zipFileName = `batch-${batchId}-qrcodes.zip`;
          const zipFilePath = `./downloads/${zipFileName}`;
          if (fs.existsSync(zipFilePath)) {
            fs.unlinkSync(zipFilePath);
          }
        }
      }
      
      return ResponseUtil.success(batchDeleted, 'Batch deleted successfully');
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

  static async getBatchJobProgress(context: Context) {
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

  static async retryFailedJobs(context: Context) {
    try {
      const batchId = context.params.id;
      const result = await BatchService.retryFailedJobs(batchId);
      
      if (!result.success) {
        return ResponseUtil.error('Failed to retry jobs', result.message || 'Unable to retry failed jobs');
      }
      
      return ResponseUtil.success(result, 'Failed jobs retried successfully');
    } catch (error) {
      console.error('Error retrying failed jobs:', error);
      return ResponseUtil.error('Failed to retry jobs', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  static async getFailedJobsDetails(context: Context) {
    try {
      const batchId = context.params.id;
      const details = await BatchService.getFailedJobsDetails(batchId);
      
      if (!details) {
        return ResponseUtil.error('Failed jobs details not available', 'Unable to retrieve failed jobs details');
      }
      
      return ResponseUtil.success(details, 'Failed jobs details retrieved successfully');
    } catch (error) {
      console.error('Error fetching failed jobs details:', error);
      return ResponseUtil.error('Failed to retrieve failed jobs details', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  static async downloadBatch(context: Context) {
    try {
      const batchId = context.params.id;
      
      // Get batch info
      const batch = await BatchService.getProductBatchById(batchId);
      if (!batch || batch.length === 0) {
        context.set.status = 404;
        return ResponseUtil.error('Batch not found', 'The specified batch does not exist');
      }

      const batchData = batch[0];
      
      // Check if batch generation is completed
      if (batchData.generateProductItemsStatus !== 'completed') {
        context.set.status = 400;
        return ResponseUtil.error('Batch not ready', 'Batch QR codes are still being generated');
      }

      // Check if download link exists
      if (!batchData.batchLinkDownload) {
        context.set.status = 404;
        return ResponseUtil.error('Download not available', 'No download link available for this batch');
      }

      const zipFileName = `batch-${batchId}-qrcodes.zip`;
      const zipFilePath = `./downloads/${zipFileName}`;
      
      // Check if file exists
      const fs = await import('fs');
      if (!fs.existsSync(zipFilePath)) {
        context.set.status = 404;
        return ResponseUtil.error('File not found', 'The zip file is no longer available');
      }

      // Generate public download URL with encrypted token
      const baseUrl = "https://api-check.carabaopro.com/api/v1"; // Get base URL from request
      const downloadUrl = `${baseUrl}/api/v1/downloads/${zipFileName}`;
      const encryptedToken = CryptoUtil.encrypt(downloadUrl);
      const publicUrl = `${downloadUrl}?token=${encodeURIComponent(encryptedToken)}`;
      
      return ResponseUtil.success({
        downloadUrl: publicUrl,
        expiresIn: '24 hours',
        instructions: 'Use this public URL to download the file. The URL will expire after 24 hours.'
      }, 'Public download URL generated successfully');
      
    } catch (error) {
      console.error('Error generating download URL:', error);
      context.set.status = 500;
      return ResponseUtil.error('Failed to generate download URL', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  static async downloadFile(context: Context) {
    try {
      const filename = context.params.filename;
      const token = context.query.token;
      
      if (!token) {
        context.set.status = 400;
        return ResponseUtil.error('Token required', 'Download token is required');
      }

      // Decrypt the token to get the original URL
      let decryptedUrl: string;
      try {
        decryptedUrl = CryptoUtil.decrypt(token);
      } catch (error) {
        context.set.status = 400;
        return ResponseUtil.error('Invalid token', 'The download token is invalid or expired');
      }

      // Verify the URL matches the expected pattern
      const baseUrl = "https://api-check.carabaopro.com/api/v1";
      const expectedUrl = `${baseUrl}/api/v1/downloads/${filename}`;
      if (decryptedUrl !== expectedUrl) {
        context.set.status = 400;
        return ResponseUtil.error('Invalid token', 'The download token is invalid for this file');
      }

      const zipFilePath = `./downloads/${filename}`;
      
      // Check if file exists
      const fs = await import('fs');
      if (!fs.existsSync(zipFilePath)) {
        context.set.status = 404;
        return ResponseUtil.error('File not found', 'The requested file is no longer available');
      }

      // Set response headers for file download
      context.set.headers['Content-Type'] = 'application/zip';
      context.set.headers['Content-Disposition'] = `attachment; filename="${filename}"`;

      // Read and return file
      const fileBuffer = fs.readFileSync(zipFilePath);
      
      return fileBuffer;
      
    } catch (error) {
      console.error('Error downloading file:', error);
      context.set.status = 500;
      return ResponseUtil.error('Download failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}