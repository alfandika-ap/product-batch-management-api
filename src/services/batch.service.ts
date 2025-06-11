import { db } from "../db/connection";
import { count, eq } from "drizzle-orm";
import { productBatchesTable, productItemsTable } from "../db/schema";
import { ProductBatchRequest, ProductItemRequest } from "../types/batch.types";
import { generateProductBatchItemQueue, updateBatchStatusQueue } from "../taks/queues/generate-product-batch-item-queue";

export class BatchService {
  static async getBatches(params: { productId?: number, page?: number, limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const offset = (page - 1) * limit;

    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(productBatchesTable);

    const batches = await db.select()
      .from(productBatchesTable)
      .where(params.productId ? eq(productBatchesTable.productId, params.productId) : undefined)
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

  static async getBatchItems(batchId: number, params: { page?: number, limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const offset = (page - 1) * limit;
    
    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(productItemsTable)
      .where(eq(productItemsTable.batchId, batchId));

    const items = await db.select()
      .from(productItemsTable)
      .where(eq(productItemsTable.batchId, batchId))
      .limit(limit)
      .offset(offset);

    return {
      items,
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
    const createBatch = await db.insert(productBatchesTable)
      .values(data)
      .$returningId();
    const batch = await db.select().from(productBatchesTable).where(eq(productBatchesTable.id, createBatch[0].id))
    return batch[0];
  }

  static async updateProductBatch(batchId: number, data: ProductBatchRequest) {
    const batch = await db.update(productBatchesTable).set(data).where(eq(productBatchesTable.id, batchId));
    return batch;
  }

  static async deleteProductBatch(batchId: number) {
    const batch = await db.delete(productBatchesTable).where(eq(productBatchesTable.id, batchId));
    return batch;
  }

  static async getProductBatchById(batchId: number) {
    const batch = await db.select().from(productBatchesTable).where(eq(productBatchesTable.id, batchId));
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
    batchId: number, 
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
  private static async setupJobCompletionTracking(batchId: number, totalJobs: number) {
    // This could be enhanced with a separate tracking mechanism
    // For now, we'll rely on individual job completion handlers
    console.log(`Set up tracking for ${totalJobs} jobs for batch ${batchId}`);
    
    // You could implement a Redis counter here to track job completion
    // and trigger batch completion when all jobs are done
  }

  /**
   * Get job progress for a batch
   */
  static async getBatchJobProgress(batchId: number) {
    try {
      // Get all jobs for this batch
      const jobs = await generateProductBatchItemQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      const batchJobs = jobs.filter(job => job.data.batchId === batchId);

      const stats = {
        total: batchJobs.length,
        waiting: batchJobs.filter(job => job.opts.jobId?.includes('waiting')).length,
        active: batchJobs.filter(job => job.opts.jobId?.includes('active')).length,
        completed: batchJobs.filter(job => job.opts.jobId?.includes('completed')).length,
        failed: batchJobs.filter(job => job.opts.jobId?.includes('failed')).length,
      };

      return stats;
    } catch (error) {
      console.error(`Failed to get job progress for batch ${batchId}:`, error);
      return null;
    }
  }
}