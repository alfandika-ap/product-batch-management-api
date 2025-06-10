import { int, mysqlTable, serial, timestamp, varchar, text, mysqlEnum, index } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

export const usersTable = mysqlTable('users', {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: varchar({ length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
}));

export const productsTable = mysqlTable('products', {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  category: varchar({ length: 255 }),
  imageUrl: varchar('image_url', { length: 500 }),
  description: text(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const productBatchesTable = mysqlTable('product_batches', {
  id: serial().primaryKey(),
  productId: int('product_id').notNull(),
  batchCode: varchar('batch_code', { length: 100 }).notNull().unique(),
  quantity: int().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  generateProductItemsStatus: mysqlEnum('generate_product_items_status', ['pending', 'completed', 'failed']).default('pending'),
}, (table) => ({
  productIdx: index('product_idx').on(table.productId),
  batchCodeIdx: index('batch_code_idx').on(table.batchCode),
}));

export const productItemsTable = mysqlTable('product_items', {
  id: serial().primaryKey(),
  batchId: int('batch_id').notNull(),
  qrCode: varchar('qr_code', { length: 255 }).notNull().unique(),
  serialNumber: varchar('serial_number', { length: 255 }).notNull().unique(),
  status: mysqlEnum(['unscanned', 'scanned', 'flagged']).default('unscanned'),
  firstScanAt: timestamp('first_scan_at'),
  scanCount: int('scan_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  batchIdx: index('batch_idx').on(table.batchId),
  qrCodeIdx: index('qr_code_idx').on(table.qrCode),
  statusIdx: index('status_idx').on(table.status),
}));

export const scanLogsTable = mysqlTable('scan_logs', {
  id: serial().primaryKey(),
  itemId: int('item_id').notNull(),
  userId: int('user_id'),
  scannedAt: timestamp('scanned_at').defaultNow(),
  location: varchar({ length: 255 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  deviceInfo: text('device_info'),
}, (table) => ({
  itemIdx: index('item_idx').on(table.itemId),
  userIdx: index('user_idx').on(table.userId),
  scannedAtIdx: index('scanned_at_idx').on(table.scannedAt),
}));

// Relations
export const productsRelations = relations(productsTable, ({ many }) => ({
  batches: many(productBatchesTable),
}));

export const productBatchesRelations = relations(productBatchesTable, ({ one, many }) => ({
  product: one(productsTable, {
    fields: [productBatchesTable.productId],
    references: [productsTable.id],
  }),
  items: many(productItemsTable),
}));

export const productItemsRelations = relations(productItemsTable, ({ one, many }) => ({
  batch: one(productBatchesTable, {
    fields: [productItemsTable.batchId],
    references: [productBatchesTable.id],
  }),
  scanLogs: many(scanLogsTable),
}));

export const scanLogsRelations = relations(scanLogsTable, ({ one }) => ({
  item: one(productItemsTable, {
    fields: [scanLogsTable.itemId],
    references: [productItemsTable.id],
  }),
  user: one(usersTable, {
    fields: [scanLogsTable.userId],
    references: [usersTable.id],
  }),
}));

export const usersRelations = relations(usersTable, ({ many }) => ({
  scanLogs: many(scanLogsTable),
}));