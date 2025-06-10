export type ProductBatchRequest = {
  productId: number;
  batchCode: string;
  quantity: number;
  generateProductItemsStatus?: 'pending' | 'completed' | 'failed';
};

export type ProductItemRequest = {
  batchId: number;
  qrCode: string;
  serialNumber: string;
};