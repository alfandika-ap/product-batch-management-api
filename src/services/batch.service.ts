import { db } from "../db/connection";
import { count, eq, asc, isNull, and } from "drizzle-orm";
import { productBatchesTable, productItemsTable } from "../db/schema";
import { ProductBatchRequest, ProductItemRequest } from "../types/batch.types";
import { generateProductBatchItemQueue, updateBatchStatusQueue } from "../taks/queues/generate-product-batch-item-queue";
import QRCode from 'qrcode'
import { Jimp } from "jimp";
import { DateUtil } from '../utils/date.util';

export class BatchService {
  static async getBatches(params: { productId?: string, page?: number, limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const offset = (page - 1) * limit;

    // Build conditions for active batches
    const conditions = [isNull(productBatchesTable.deletedAt)];
    if (params.productId) {
      conditions.push(eq(productBatchesTable.productId, params.productId));
    }

    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(productBatchesTable)
      .where(and(...conditions));

    const batches = await db.select()
      .from(productBatchesTable)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    return {
      batches,
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

  static async addWatermarkToQrCode(qrCode: string) {
    const qrBuffer = await QRCode.toBuffer(qrCode, {
      width: 300,
      errorCorrectionLevel: 'H'
    });

    const qrImage = await Jimp.read(qrBuffer);
    const logo = await Jimp.read('./src/assets/images/carabo-qr-watermark.png');
  
    const logoSize = qrImage.bitmap.width * 0.2;
    logo.resize({w: logoSize, h: logoSize});
  
    const x = (qrImage.bitmap.width / 2) - (logo.bitmap.width / 2);
    const y = (qrImage.bitmap.height / 2) - (logo.bitmap.height / 2);
  
    qrImage.composite(logo, x, y);
  
    const qrCodeWithWatermark = await qrImage.getBase64("image/png");
    return qrCodeWithWatermark;
  }
  

  static async getBatchItems(batchId: string, params: { page?: number, limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const offset = (page - 1) * limit;
    const WITH_WATERMARK = false;
    
    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(productItemsTable)
      .where(eq(productItemsTable.batchId, batchId));

    const items = await db.select()
      .from(productItemsTable)
      .where(eq(productItemsTable.batchId, batchId))
      .limit(limit)
      .orderBy(asc(productItemsTable.serialNumber))
      .offset(offset);

    const itemsWithQrCode = await Promise.all(items.map(async (item) => {
      const qrString = `${process.env.SCAN_BASE_URL}/scan?qrCode=${item.qrCode}`
      const qrCodeBase64 = WITH_WATERMARK ? await this.addWatermarkToQrCode(qrString) : await QRCode.toDataURL(qrString);
      return {
        ...item,
        qrCode: qrCodeBase64
      }
    }));

    return {
      items: itemsWithQrCode,
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

  static async createProductBatch(data: ProductBatchRequest) {
    try {
      const createBatch = await db.insert(productBatchesTable)
        .values(data)
        .$returningId();
      
      if (!createBatch || !createBatch[0]?.id) {
        throw new Error('Failed to create batch: Database operation returned no ID');
      }

      const batch = await db.select()
        .from(productBatchesTable)
        .where(eq(productBatchesTable.id, createBatch[0].id));

      if (!batch || batch.length === 0) {
        throw new Error('Failed to retrieve created batch');
      }

      return batch[0];
    } catch (error) {
      console.error('Error in createProductBatch:', error);
      throw error; // Re-throw to be caught by the controller
    }
  }

  static async updateProductBatch(batchId: string, data: ProductBatchRequest) {
    const batch = await db.update(productBatchesTable).set(data).where(eq(productBatchesTable.id, batchId));
    return batch;
  }

  static async deleteProductBatch(batchId: string) {
    const batch = await db
      .update(productBatchesTable)
      .set({ deletedAt: DateUtil.getCurrentUTCTimestamp() })
      .where(and(eq(productBatchesTable.id, batchId), isNull(productBatchesTable.deletedAt)));
    return batch;
  }

  static async getProductBatchById(batchId: string) {
    const batch = await db
      .select()
      .from(productBatchesTable)
      .where(and(eq(productBatchesTable.id, batchId), isNull(productBatchesTable.deletedAt)));
    return batch;
  }

  static async createProductItem(data: ProductItemRequest) {
    const productItem = await db.insert(productItemsTable).values(data);
    return productItem;
  }

  /**
   * Create product items using BullMQ for optimal performance with large quantities
   * @param batchId - The batch ID to create items for
   * @param quantity - Total number of items to create
   * @param options - Configuration options for job processing
   */
  static async createProductItemsAsync(
    batchId: string, 
    quantity: number,
    options: {
      batchSize?: number;
      qrCodePrefix?: string;
      maxJobsPerBatch?: number;
    } = {}
  ) {
    const { 
      batchSize = 100, // Items per job
      qrCodePrefix,
      maxJobsPerBatch = 1000 // Max items per individual job
    } = options;

    try {
      console.log(`Starting async creation of ${quantity} product items for batch ${batchId}`);

      // Calculate optimal job distribution
      const effectiveBatchSize = Math.min(batchSize, maxJobsPerBatch);
      const totalJobs = Math.ceil(quantity / effectiveBatchSize);
      
      console.log(`Creating ${totalJobs} jobs with batch size ${effectiveBatchSize}`);

      // Create jobs for processing batches
      const jobPromises = [];
      for (let jobIndex = 0; jobIndex < totalJobs; jobIndex++) {
        const startIndex = jobIndex * effectiveBatchSize;
        const endIndex = Math.min(startIndex + effectiveBatchSize - 1, quantity - 1);
        
        const jobData = {
          batchId,
          totalQuantity: quantity,
          batchSize: effectiveBatchSize,
          startIndex,
          endIndex,
          qrCodePrefix
        };

        // Add job with priority based on job index (earlier jobs have higher priority)
        const jobPromise = generateProductBatchItemQueue.add(
          'generate-product-batch-items',
          jobData,
          {
            priority: totalJobs - jobIndex, // Higher number = higher priority
            jobId: `batch-${batchId}-job-${jobIndex}`, // Unique job ID
            delay: jobIndex * 100, // Small delay between jobs to prevent overwhelming
          }
        );

        jobPromises.push(jobPromise);
      }

      // Wait for all jobs to be queued
      const jobs = await Promise.all(jobPromises);
      
      console.log(`Successfully queued ${jobs.length} jobs for batch ${batchId}`);

      // Set up completion tracking
      this.setupJobCompletionTracking(batchId, totalJobs);

      return {
        success: true,
        batchId,
        totalQuantity: quantity,
        jobsCreated: jobs.length,
        jobIds: jobs.map(job => job.id),
        estimatedDuration: `${Math.ceil(totalJobs * 2)} minutes` // Rough estimate
      };

    } catch (error) {
      console.error(`Failed to create async product items for batch ${batchId}:`, error);
      
      // Update batch status to failed
      await updateBatchStatusQueue.add('update-batch-status', {
        batchId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Set up job completion tracking to update batch status when all jobs are done
   */
  private static async setupJobCompletionTracking(batchId: string, totalJobs: number) {
    // This could be enhanced with a separate tracking mechanism
    // For now, we'll rely on individual job completion handlers
    console.log(`Set up tracking for ${totalJobs} jobs for batch ${batchId}`);
    
    // You could implement a Redis counter here to track job completion
    // and trigger batch completion when all jobs are done
  }

  /**
   * Get job progress for a batch including actual inserted items count
   */
  static async getBatchJobProgress(batchId: string) {
    try {
      // Get batch info to know the total quantity
      const batch = await db.select()
        .from(productBatchesTable)
        .where(eq(productBatchesTable.id, batchId))
        .limit(1);

      if (batch.length === 0) {
        return null;
      }

      // Get actual count of inserted product items
      const [{ totalInserted }] = await db
        .select({ totalInserted: count() })
        .from(productItemsTable)
        .where(eq(productItemsTable.batchId, batchId));

      // Get jobs by status for this batch
      const [waitingJobs, activeJobs, completedJobs, failedJobs] = await Promise.all([
        generateProductBatchItemQueue.getJobs(['waiting']),
        generateProductBatchItemQueue.getJobs(['active']),
        generateProductBatchItemQueue.getJobs(['completed']),
        generateProductBatchItemQueue.getJobs(['failed'])
      ]);

      // Filter jobs by batchId
      const batchWaitingJobs = waitingJobs.filter(job => job.data.batchId === batchId);
      const batchActiveJobs = activeJobs.filter(job => job.data.batchId === batchId);
      const batchCompletedJobs = completedJobs.filter(job => job.data.batchId === batchId);
      const batchFailedJobs = failedJobs.filter(job => job.data.batchId === batchId);

      const stats = {
        // Job progress
        totalJobs: batchWaitingJobs.length + batchActiveJobs.length + batchCompletedJobs.length + batchFailedJobs.length,
        waiting: batchWaitingJobs.length,
        active: batchActiveJobs.length,
        completed: batchCompletedJobs.length,
        failed: batchFailedJobs.length,
        
        // Item insertion progress
        totalInsert: totalInserted,
        qty: batch[0].quantity,
        progressPercentage: Math.round((totalInserted / batch[0].quantity) * 100),
        isCompleted: totalInserted >= batch[0].quantity
      };

      return stats;
    } catch (error) {
      console.error(`Failed to get job progress for batch ${batchId}:`, error);
      return null;
    }
  }

  /**
   * Retry failed jobs for a specific batch
   */
  static async retryFailedJobs(batchId: string) {
    try {
      // Get batch info to verify it exists
      const batch = await db.select()
        .from(productBatchesTable)
        .where(eq(productBatchesTable.id, batchId))
        .limit(1);

      if (batch.length === 0) {
        return {
          success: false,
          message: 'Batch not found'
        };
      }

      // Get failed jobs for this batch
      const failedJobs = await generateProductBatchItemQueue.getJobs(['failed']);
      const batchFailedJobs = failedJobs.filter(job => job.data.batchId === batchId);

      if (batchFailedJobs.length === 0) {
        return {
          success: true,
          message: 'No failed jobs found for this batch',
          retriedJobs: 0
        };
      }

      console.log(`Retrying ${batchFailedJobs.length} failed jobs for batch ${batchId}`);

      // Retry each failed job
      const retryPromises = batchFailedJobs.map(async (job) => {
        try {
          // Remove the failed job and create a new one with the same data
          await job.remove();
          
          // Create new job with same data but fresh retry count
          const newJob = await generateProductBatchItemQueue.add(
            'generate-product-batch-items',
            job.data,
            {
              priority: job.opts.priority || 0,
              jobId: `retry-${job.id}`, // New unique ID for retry
              delay: 0, // No delay for retry
            }
          );
          
          console.log(`Retried job ${job.id} as ${newJob.id} for batch ${batchId}`);
          return { originalJobId: job.id, newJobId: newJob.id, success: true };
        } catch (error) {
          console.error(`Failed to retry job ${job.id}:`, error);
          return { originalJobId: job.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });

      const retryResults = await Promise.all(retryPromises);
      const successfulRetries = retryResults.filter(result => result.success).length;
      const failedRetries = retryResults.filter(result => !result.success).length;

      // Update batch status if we have retried jobs
      if (successfulRetries > 0) {
        await db
          .update(productBatchesTable)
          .set({ generateProductItemsStatus: 'pending' })
          .where(eq(productBatchesTable.id, batchId));
      }

      return {
        success: true,
        message: `Retried ${successfulRetries} jobs successfully`,
        retriedJobs: successfulRetries,
        failedRetries,
        details: retryResults
      };

    } catch (error) {
      console.error(`Failed to retry jobs for batch ${batchId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get detailed information about failed jobs for a batch
   */
  static async getFailedJobsDetails(batchId: string) {
    try {
      // Get batch info to verify it exists
      const batch = await db.select()
        .from(productBatchesTable)
        .where(eq(productBatchesTable.id, batchId))
        .limit(1);

      if (batch.length === 0) {
        return null;
      }

      // Get failed jobs for this batch
      const failedJobs = await generateProductBatchItemQueue.getJobs(['failed']);
      const batchFailedJobs = failedJobs.filter(job => job.data.batchId === batchId);

      if (batchFailedJobs.length === 0) {
        return {
          batchId,
          failedJobsCount: 0,
          failedJobs: [],
          message: 'No failed jobs found for this batch'
        };
      }

      // Get detailed information about each failed job
      const failedJobsDetails = batchFailedJobs.map(job => ({
        jobId: job.id,
        batchId: job.data.batchId,
        startIndex: job.data.startIndex,
        endIndex: job.data.endIndex,
        totalQuantity: job.data.totalQuantity,
        batchSize: job.data.batchSize,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts || 3,
        failedAt: job.finishedOn,
        error: job.failedReason,
        progress: job.progress,
        data: job.data
      }));

      return {
        batchId,
        failedJobsCount: batchFailedJobs.length,
        failedJobs: failedJobsDetails,
        batchInfo: {
          id: batch[0].id,
          batchCode: batch[0].batchCode,
          quantity: batch[0].quantity,
          status: batch[0].generateProductItemsStatus
        }
      };

    } catch (error) {
      console.error(`Failed to get failed jobs details for batch ${batchId}:`, error);
      return null;
    }
  }

  /**
   * Restore a soft-deleted batch
   */
  static async restoreProductBatch(batchId: string) {
    const batch = await db
      .update(productBatchesTable)
      .set({ deletedAt: null })
      .where(eq(productBatchesTable.id, batchId));
    return batch;
  }

  /**
   * Permanently delete a batch (hard delete)
   */
  static async permanentDeleteProductBatch(batchId: string) {
    const batch = await db.delete(productBatchesTable).where(eq(productBatchesTable.id, batchId));
    return batch;
  }
}