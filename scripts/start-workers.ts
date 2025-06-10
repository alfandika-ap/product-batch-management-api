#!/usr/bin/env bun

/**
 * BullMQ Workers Startup Script
 * 
 * This script starts all BullMQ workers in a separate process.
 * Run this script independently from your main API server.
 * 
 * Usage:
 *   bun run scripts/start-workers.ts
 *   OR
 *   bun scripts/start-workers.ts
 */

import { startAllWorkers } from '../src/taks/workers';

async function main() {
  console.log('🚀 Starting BullMQ Workers...');
  console.log('Press Ctrl+C to stop workers gracefully');
  console.log('=====================================');
  
  try {
    await startAllWorkers();
    
    console.log('=====================================');
    console.log('✅ All workers are running');
    console.log('Waiting for jobs...');
    
    // Keep the process running
    process.stdin.resume();
    
  } catch (error) {
    console.error('❌ Failed to start workers:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the workers
main().catch((error) => {
  console.error('Error in main:', error);
  process.exit(1);
}); 