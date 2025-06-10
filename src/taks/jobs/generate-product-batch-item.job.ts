/**
 * Job definition for generating product batch items
 * This file defines the job data interface and job name constant
 */

export const GENERATE_PRODUCT_BATCH_ITEM_JOB = 'generate-product-batch-items';
export const UPDATE_BATCH_STATUS_JOB = 'update-batch-status';

/**
 * Job data for generating product batch items in batches
 */
export interface GenerateProductBatchItemJobData {
  batchId: number;
  totalQuantity: number;
  batchSize: number;
  startIndex: number;
  endIndex: number;
  qrCodePrefix?: string;
}

/**
 * Job data for updating batch status
 */
export interface UpdateBatchStatusJobData {
  batchId: number;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
  processedCount?: number;
}

/**
 * Progress data structure for job progress tracking
 */
export interface JobProgressData {
  processed: number;
  total: number;
  currentBatch: number;
  totalBatches: number;
  errors: string[];
} 