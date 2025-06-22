# BullMQ Task System

Sistema antrian job untuk menangani pemrosesan data secara asynchronous menggunakan BullMQ.

## Overview

Task system ini dirancang khusus untuk menangani pembuatan product items dalam jumlah besar (ribuan) tanpa memblokir API response. Menggunakan Redis sebagai message broker dan BullMQ untuk job management.

## Structure

```
src/tasks/
├── jobs/                           # Job definitions
│   └── generate-product-batch-item.job.ts
├── queues/                         # Queue configurations
│   ├── connection.ts              # Redis connection
│   └── generate-product-batch-item-queue.ts
├── workers/                        # Job processors
│   ├── generate-product-batch-item.worker.ts
│   ├── update-batch-status.worker.ts
│   └── index.ts                   # Workers orchestration
└── README.md                      # This file
```

## Setup

### 1. Environment Variables

Tambahkan ke `.env`:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password  # optional
REDIS_DB=0                   # optional
```

### 2. Start Workers

```typescript
// In your main application file
import { startAllWorkers } from "./src/taks/workers";

// Start workers when application starts
await startAllWorkers();
```

### 3. Install Dependencies

```bash
npm install bullmq ioredis
# or
bun add bullmq ioredis
```

## Usage

### Creating Product Items Asynchronously

```typescript
import { BatchService } from "../services/batch.service";

// Create large batch of product items
const result = await BatchService.createProductItemsAsync(
  batchId,
  5000, // 5000 items
  {
    batchSize: 100, // Process 100 items per job
    qrCodePrefix: "QR", // Optional QR code prefix
    maxJobsPerBatch: 1000, // Max items per individual job
  }
);

console.log(result);
// {
//   success: true,
//   batchId: 123,
//   totalQuantity: 5000,
//   jobsCreated: 50,
//   jobIds: ['job1', 'job2', ...],
//   estimatedDuration: '100 minutes'
// }
```

### Monitoring Progress

```typescript
// Get job progress for a batch
const progress = await BatchService.getBatchJobProgress(batchId);
// {
//   total: 50,
//   waiting: 10,
//   active: 2,
//   completed: 38,
//   failed: 0
// }
```

## Best Practices Implementation

### 1. Batch Processing

- Items diproses dalam chunks kecil (50 items per chunk)
- Bulk insert ke database untuk efisiensi
- Rate limiting untuk mencegah overwhelm database

### 2. Error Handling

- Retry mechanism dengan exponential backoff
- Job failure tracking dan logging
- Batch status update saat error

### 3. Memory Management

- Process items dalam chunks kecil
- Cleanup completed/failed jobs otomatis
- Connection pooling untuk Redis

### 4. Performance Optimization

- Job prioritization (early jobs = higher priority)
- Concurrency control (max 2 jobs concurrent)
- Rate limiting (max 5 jobs per 10 seconds)
- Small delays between job creation

### 5. Monitoring & Logging

- Progress tracking untuk setiap job
- Comprehensive error logging
- Job completion notifications
- Batch status tracking

## Queue Configuration

### Generate Product Batch Items Queue

- **Name**: `generate-product-batch-items`
- **Concurrency**: 2 workers max
- **Rate Limit**: 5 jobs per 10 seconds
- **Retry**: 3 attempts with exponential backoff
- **Cleanup**: Keep 10 completed, 5 failed jobs

### Update Batch Status Queue

- **Name**: `update-batch-status`
- **Concurrency**: 5 workers max
- **Retry**: 3 attempts with exponential backoff
- **Cleanup**: Keep 5 completed, 3 failed jobs

## Job Flow

1. **API Request** → Creates batch in database
2. **Job Creation** → Split quantity into multiple jobs
3. **Job Processing** → Workers process items in chunks
4. **Progress Updates** → Real-time progress tracking
5. **Status Updates** → Batch status updated when complete/failed
6. **Cleanup** → Old jobs automatically removed

## Error Scenarios

### Database Connection Issues

- Jobs akan retry dengan exponential backoff
- After 3 failed attempts, job marked as failed
- Batch status updated to 'failed'

### Large Queue Backlog

- Rate limiting prevents overwhelming
- Job priorities ensure FIFO processing
- Memory-efficient chunk processing

### Redis Connection Issues

- Workers akan reconnect otomatis
- Job state preserved in Redis
- Graceful shutdown handling

## Monitoring

### Job Status Monitoring

```bash
# Redis CLI monitoring
redis-cli
KEYS bull:generate-product-batch-items:*
```

### Application Logs

```
Starting batch generation for batch 123, items 0-99
Processed 50/100 items for batch 123
Successfully generated 100 product items for batch 123
Job job123 completed successfully for batch 123
```

## Scalability

Sistem ini dapat handle:

- **Concurrent Batches**: Multiple batches diproses bersamaan
- **Large Quantities**: Tested untuk 10,000+ items per batch
- **High Throughput**: Rate limiting mencegah database overload
- **Auto Scaling**: Worker processes dapat di-scale horizontal

## Production Considerations

1. **Redis Persistence**: Enable RDB/AOF untuk job recovery
2. **Monitoring**: Setup alerts untuk failed jobs
3. **Resources**: Monitor memory usage workers
4. **Backup**: Regular backup Redis data
5. **Health Checks**: Implement worker health monitoring

## Recent Improvements

### Enhanced Error Handling (Latest)

- **Chunk-level Retry**: Individual chunks are retried independently
- **Better Error Messages**: More descriptive error messages with context
- **Graceful Degradation**: Failed chunks don't stop entire job
- **Detailed Logging**: Comprehensive logging for debugging

### Manual Retry System

- **API Endpoint**: Manual retry of failed jobs
- **Job Recreation**: Failed jobs are recreated with fresh retry count
- **Status Updates**: Batch status is updated when jobs are retried
- **Detailed Reporting**: Comprehensive retry results and statistics

### Improved Monitoring

- **Failed Jobs Details**: Detailed information about failed jobs
- **Progress Tracking**: Real-time progress updates
- **Error Context**: Detailed error information with job context
- **Status Tracking**: Comprehensive batch status tracking
