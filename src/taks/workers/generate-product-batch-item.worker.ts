import { Worker, Job } from 'bullmq';
import { db } from '../../db/connection';
import { productItemsTable, productBatchesTable } from '../../db/schema';
import { eq, desc, count } from 'drizzle-orm';
import { redisConnection } from '../queues/connection';
import { updateBatchStatusQueue } from '../queues/generate-product-batch-item-queue';
import {
  GENERATE_PRODUCT_BATCH_ITEM_JOB,
  GenerateProductBatchItemJobData,
  JobProgressData
} from '../jobs/generate-product-batch-item.job';
import QRCode from 'qrcode';
import { Jimp } from "jimp";
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);

/**
 * Generate unique QR code for product item
 */
function generateQRCode(batchId: string, index: number, prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}-${batchId}-${index}-${timestamp}-${random}` : `QR-${batchId}-${index}-${timestamp}-${random}`;
}

/**
 * Add watermark to QR code like in getBatchItems
 */
async function addWatermarkToQrCode(qrCode: string): Promise<string> {
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

  return await qrImage.getBase64("image/png");
}

/**
 * Get the last sequence number from existing product items in a batch
 */
export async function getLastSequenceNumber(batchId: string): Promise<number> {
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
  batchId: string,
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
      itemOrder: i + 1,
    });
  }

  // Use bulk insert for better performance
  await db.insert(productItemsTable).values(items);
  
  return items.length;
}

/**
 * Check if this is the last job for the batch and create zip if so
 */
async function checkAndCreateZipIfLastJob(batchId: string, totalQuantity: number): Promise<void> {
  // Get actual count of inserted product items
  const [{ totalInserted }] = await db
    .select({ totalInserted: count() })
    .from(productItemsTable)
    .where(eq(productItemsTable.batchId, batchId));

  // Check if all items are created
  if (totalInserted >= totalQuantity) {
    console.log(`All ${totalInserted} items created for batch ${batchId}. Starting zip creation...`);
    
    // Create zip file using streaming approach
    await createZipFileStreaming(batchId, totalInserted);
    
    console.log(`Batch ${batchId} completed with zip file created`);
  }
}

/**
 * Create zip file using streaming approach for large batches
 */
async function createZipFileStreaming(batchId: string, totalQuantity: number): Promise<void> {
  const outputDir = './downloads';
  await mkdir(outputDir, { recursive: true });
  
  const zipFileName = `batch-${batchId}-qrcodes.zip`;
  const zipFilePath = path.join(outputDir, zipFileName);
  
  return new Promise(async (resolve, reject) => {
    try {
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip', { 
        zlib: { level: 6 }, // Balanced compression (faster than level 9)
        forceLocalTime: true
      });
      
      output.on('close', async () => {
        console.log(`Zip file created: ${zipFilePath} (${archive.pointer()} total bytes)`);
        
        // Update batch with download link and completed status
        const downloadLink = `/batches/${batchId}/download`;
        await db
          .update(productBatchesTable)
          .set({ 
            generateProductItemsStatus: 'completed',
            batchLinkDownload: downloadLink
          })
          .where(eq(productBatchesTable.id, batchId));
          
        resolve();
      });
      
      archive.on('error', (err: Error) => {
        console.error(`Archive error for batch ${batchId}:`, err);
        reject(err);
      });
      
      archive.pipe(output);
      
      // Process items in chunks to avoid memory issues
      const chunkSize = 50; // Process 50 QR codes at a time for better memory management
      const totalChunks = Math.ceil(totalQuantity / chunkSize);
      
      console.log(`Processing ${totalQuantity} QR codes in ${totalChunks} chunks of ${chunkSize}`);
      
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const offset = chunkIndex * chunkSize;
        const limit = Math.min(chunkSize, totalQuantity - offset);
        
        // Get items for this chunk
        const chunkItems = await db.select()
          .from(productItemsTable)
          .where(eq(productItemsTable.batchId, batchId))
          .limit(limit)
          .offset(offset);
        
        // Process chunk items
        for (const item of chunkItems) {
          try {
            const qrString = `${process.env.SCAN_BASE_URL}/scan?qrCode=${item.qrCode}`;
            const qrCodeBase64 = await addWatermarkToQrCode(qrString);
            
            // Convert base64 to buffer
            const base64Data = qrCodeBase64.replace(/^data:image\/png;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Add directly to archive without saving to disk
            archive.append(buffer, { name: `${item.serialNumber}.png` });
            
          } catch (error) {
            console.error(`Error processing QR code for item ${item.serialNumber}:`, error);
            // Continue with next item instead of failing entire batch
          }
        }
        
        // Log progress
        const processed = Math.min((chunkIndex + 1) * chunkSize, totalQuantity);
        console.log(`Zip Progress: ${processed}/${totalQuantity} QR codes processed for batch ${batchId}`);
        
        // Small delay to prevent overwhelming the system
        if (chunkIndex < totalChunks - 1) {
          await new Promise(resolve => setTimeout(resolve, 100)); // Slightly longer delay for QR generation
        }
      }
      
      // Finalize the archive
      await archive.finalize();
      
    } catch (error) {
      console.error(`Error creating zip file for batch ${batchId}:`, error);
      reject(error);
    }
  });
}

/**
 * Worker for processing product batch item generation jobs
 */
export const generateProductBatchItemWorker = new Worker(
  GENERATE_PRODUCT_BATCH_ITEM_JOB,
  async (job: Job<GenerateProductBatchItemJobData>) => {
    const { batchId, batchSize, startIndex, endIndex, qrCodePrefix, totalQuantity } = job.data;
    
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

      console.log(`Successfully generated ${processed} product items for batch ${batchId}`);
      
      // Check if this is the last job and create zip if so
      await checkAndCreateZipIfLastJob(batchId, totalQuantity);
      
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