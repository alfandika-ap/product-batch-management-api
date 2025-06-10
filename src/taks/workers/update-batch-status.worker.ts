import { Worker, Job } from 'bullmq';
import { db } from '../../db/connection';
import { productBatchesTable } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { redisConnection } from '../queues/connection';
import {
  UPDATE_BATCH_STATUS_JOB,
  UpdateBatchStatusJobData
} from '../jobs/generate-product-batch-item.job';

/**
 * Worker for updating batch status after product items generation
 */
export const updateBatchStatusWorker = new Worker(
  UPDATE_BATCH_STATUS_JOB,
  async (job: Job<UpdateBatchStatusJobData>) => {
    const { batchId, status, error, processedCount } = job.data;
    
    try {
      console.log(`Updating batch ${batchId} status to ${status}`);
      
      await db
        .update(productBatchesTable)
        .set({ 
          generateProductItemsStatus: status,
          // You might want to add an error field to the schema
        })
        .where(eq(productBatchesTable.id, batchId));

      console.log(`Successfully updated batch ${batchId} status to ${status}`);
      
      if (error) {
        console.error(`Batch ${batchId} failed with error: ${error}`);
      }
      
      if (processedCount) {
        console.log(`Batch ${batchId} processed ${processedCount} items`);
      }

      return { batchId, status, success: true };
      
    } catch (dbError) {
      console.error(`Failed to update batch ${batchId} status:`, dbError);
      throw dbError;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Higher concurrency for status updates as they're lightweight
  }
);

// Worker event handlers
updateBatchStatusWorker.on('completed', (job) => {
  console.log(`Batch status update job ${job.id} completed for batch ${job.data.batchId}`);
});

updateBatchStatusWorker.on('failed', (job, err) => {
  console.error(`Batch status update job ${job?.id} failed for batch ${job?.data.batchId}:`, err);
});

updateBatchStatusWorker.on('error', (err) => {
  console.error('Update batch status worker error:', err);
});

console.log('Update Batch Status Worker started');

export default updateBatchStatusWorker; 