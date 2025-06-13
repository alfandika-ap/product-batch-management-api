import { eq, count, or } from 'drizzle-orm';
import db from "../db/connection";
import { productBatchesTable, productItemsTable, productsTable } from "../db/schema";

export class ScanQrService {
  static async scanQrCode({
    qrCode,
    serialNumber
  }: {
    qrCode?: string;
    serialNumber?: string;
  }) {
    // Optimized: Get all related data in a single query using joins
    const result = await db
      .select({
        // Product item fields
        productItem: {
          id: productItemsTable.id,
          batchId: productItemsTable.batchId,
          qrCode: productItemsTable.qrCode,
          serialNumber: productItemsTable.serialNumber,
          status: productItemsTable.status,
          firstScanAt: productItemsTable.firstScanAt,
          scanCount: productItemsTable.scanCount,
          createdAt: productItemsTable.createdAt,
        },
        // Batch fields
        batch: {
          id: productBatchesTable.id,
          productId: productBatchesTable.productId,
          batchCode: productBatchesTable.batchCode,
          quantity: productBatchesTable.quantity,
          createdAt: productBatchesTable.createdAt,
          generateProductItemsStatus: productBatchesTable.generateProductItemsStatus,
        },
        // Product fields
        product: {
          id: productsTable.id,
          name: productsTable.name,
          category: productsTable.category,
          imageUrl: productsTable.imageUrl,
          description: productsTable.description,
          createdAt: productsTable.createdAt,
        }
      })
      .from(productItemsTable)
      .innerJoin(productBatchesTable, eq(productItemsTable.batchId, productBatchesTable.id))
      .innerJoin(productsTable, eq(productBatchesTable.productId, productsTable.id))
      .where(
        or(
          qrCode ? eq(productItemsTable.qrCode, qrCode) : undefined,
          serialNumber ? eq(productItemsTable.serialNumber, serialNumber) : undefined
        )
      );

    if (!result.length) {
      throw new Error('QR code atau serial number tidak ditemukan');
    }

    const { product, batch, productItem } = result[0];

    return {
      product,
      batch,
      productItem
    };
  }
}