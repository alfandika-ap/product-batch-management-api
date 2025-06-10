import { Queue } from 'bullmq';
import { redisConnection } from './connection';

export interface GenerateProductBatchItemJobData {
  batchId: number;
  totalQuantity: number;
  batchSize?: number; // Items per batch (default: 100)
  startIndex?: number; // Starting index for this job
  endIndex?: number;   // Ending index for this job
}

export interface UpdateBatchStatusJobData {
  batchId: number;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
}

// Main queue for generating product batch items
export const generateProductBatchItemQueue = new Queue('generate-product-batch-items', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 10,
    removeOnFail: 5,
  },
});

// Queue for updating batch status
export const updateBatchStatusQueue = new Queue('update-batch-status', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 5,
    removeOnFail: 3,
  },
});

export type { Queue };
