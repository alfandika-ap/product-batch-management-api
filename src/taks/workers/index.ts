/**
 * BullMQ Workers Index
 * This file exports all workers and provides a method to start them all
 */

import generateProductBatchItemWorker from './generate-product-batch-item.worker';
import updateBatchStatusWorker from './update-batch-status.worker';

// Export all workers
export {
  generateProductBatchItemWorker,
  updateBatchStatusWorker,
};

/**
 * Start all workers
 * Call this function to start all background workers
 */
export async function startAllWorkers() {
  console.log('Starting all BullMQ workers...');
  
  try {
    // Workers are automatically started when imported
    // But we can add additional setup here if needed
    
    console.log('✅ Generate Product Batch Item Worker: Ready');
    console.log('✅ Update Batch Status Worker: Ready');
    console.log('🚀 All workers started successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to start workers:', error);
    throw error;
  }
}

/**
 * Gracefully shutdown all workers
 */
export async function shutdownAllWorkers() {
  console.log('Shutting down all BullMQ workers...');
  
  try {
    await generateProductBatchItemWorker.close();
    await updateBatchStatusWorker.close();
    
    console.log('✅ All workers shut down successfully');
    return true;
  } catch (error) {
    console.error('❌ Error shutting down workers:', error);
    throw error;
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down workers...');
  await shutdownAllWorkers();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down workers...');
  await shutdownAllWorkers();
  process.exit(0);
}); 