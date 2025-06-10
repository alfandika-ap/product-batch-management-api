import { Worker, Job } from 'bullmq';
import { db } from '../../db/connection';
import { productItemsTable, productBatchesTable } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { redisConnection } from '../queues/connection';
import { updateBatchStatusQueue } from '../queues/generate-product-batch-item-queue';
import {
  GENERATE_PRODUCT_BATCH_ITEM_JOB,
  GenerateProductBatchItemJobData,
  JobProgressData
} from '../jobs/generate-product-batch-item.job';

/**
 * Generate unique QR code for product item
 */
function generateQRCode(batchId: number, index: number, prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}-${batchId}-${index}-${timestamp}-${random}` : `QR-${batchId}-${index}-${timestamp}-${random}`;
}

/**
 * Get the last sequence number from existing product items in a batch
 */
export async function getLastSequenceNumber(batchId: number): Promise<number> {
  const lastItem = await db
    .select({ serialNumber: productItemsTable.serialNumber })
    .from(productItemsTable)
    .where(eq(productItemsTable.batchId, batchId))
    .orderBy(desc(productItemsTable.serialNumber))
    .limit(1);

  if (lastItem.length === 0) return 0;

  // Extract the sequence number from serialNumber (format: BATCH001-00000123)
  const lastSerialNumber = lastItem[0].serialNumber;
  const sequenceStr = lastSerialNumber.split('-')[1];
  return parseInt(sequenceStr, 10);
}

export function generateSerialNumber(batchCode: string, index: number, startFrom: number): string {
  // Calculate new sequence by adding index to startFrom
  const newSequence = startFrom + index;
  
  // Pad the sequence with leading zeros to 8 digits
  const paddedSequence = newSequence.toString().padStart(8, '0');
  return `${batchCode}-${paddedSequence}`;
}

/**
 * Create product items in optimized batches
 */
async function createProductItemsBatch(
  batchId: number,
  startIndex: number,
  endIndex: number,
  qrCodePrefix?: string
): Promise<number> {
  const items = [];
  const batch = await db.select().from(productBatchesTable).where(eq(productBatchesTable.id, batchId)).limit(1);
  
  // Get the last sequence number once at the start
  const lastSequence = await getLastSequenceNumber(batchId);
  
  for (let i = startIndex; i <= endIndex; i++) {
    items.push({
      batchId,
      qrCode: generateQRCode(batchId, i, qrCodePrefix),
      serialNumber: generateSerialNumber(batch[0].batchCode, i, lastSequence),
    });
  }

  // Use bulk insert for better performance
  await db.insert(productItemsTable).values(items);
  
  return items.length;
}

/**
 * Worker for processing product batch item generation jobs
 */
export const generateProductBatchItemWorker = new Worker(
  GENERATE_PRODUCT_BATCH_ITEM_JOB,
  async (job: Job<GenerateProductBatchItemJobData>) => {
    const { batchId, batchSize, startIndex, endIndex, qrCodePrefix } = job.data;
    
    try {
      // Update job progress
      const progressData: JobProgressData = {
        processed: 0,
        total: endIndex - startIndex + 1,
        currentBatch: 1,
        totalBatches: Math.ceil((endIndex - startIndex + 1) / batchSize),
        errors: []
      };

      await job.updateProgress(progressData);

      console.log(`Starting batch generation for batch ${batchId}, items ${startIndex}-${endIndex}`);

      // Process items in smaller chunks for better memory management
      const chunkSize = Math.min(batchSize, 50); // Process max 50 items at once
      let processed = 0;
      
      for (let currentStart = startIndex; currentStart <= endIndex; currentStart += chunkSize) {
        const currentEnd = Math.min(currentStart + chunkSize - 1, endIndex);
        
        try {
          const itemsCreated = await createProductItemsBatch(
            batchId,
            currentStart,
            currentEnd,
            qrCodePrefix
          );
          
          processed += itemsCreated;
          
          // Update progress
          progressData.processed = processed;
          progressData.currentBatch = Math.ceil(processed / chunkSize);
          await job.updateProgress(progressData);
          
          console.log(`Processed ${processed}/${progressData.total} items for batch ${batchId}`);
          
          // Small delay to prevent overwhelming the database
          if (currentEnd < endIndex) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        } catch (error) {
          const errorMsg = `Error processing items ${currentStart}-${currentEnd}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          progressData.errors.push(errorMsg);
          console.error(errorMsg);
          throw error; // Re-throw to trigger job retry
        }
      }

      await db
        .update(productBatchesTable)
        .set({ 
          generateProductItemsStatus: 'completed'
        })
        .where(eq(productBatchesTable.id, batchId));

      console.log(`Successfully generated ${processed} product items for batch ${batchId}`);
      return { processed, batchId, success: true };
      
    } catch (error) {
      console.error(`Failed to generate product items for batch ${batchId}:`, error);
      
      // Add job to update batch status to failed
      await updateBatchStatusQueue.add('update-batch-status', {
        batchId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error; // Re-throw to mark job as failed
    }
  },
  {
    connection: redisConnection,
    concurrency: 2, // Process max 2 jobs concurrently
    limiter: {
      max: 5, // Max 5 jobs per duration
      duration: 10000, // 10 seconds
    },
  }
);

// Worker event handlers
generateProductBatchItemWorker.on('completed', async (job) => {
  console.log(`Job ${job.id} completed successfully for batch ${job.data.batchId}`);
});

generateProductBatchItemWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed for batch ${job?.data.batchId}:`, err);
});

generateProductBatchItemWorker.on('error', (err) => {
  console.error('Worker error:', err);
});

console.log('Generate Product Batch Item Worker started');

export default generateProductBatchItemWorker; 