export type ProductBatchRequest = {
  productId: string;
  batchCode: string;
  quantity: number;
  generateProductItemsStatus?: 'pending' | 'completed' | 'failed';
};

export type ProductItemRequest = {
  batchId: string;
  qrCode: string;
  serialNumber: string;
  itemOrder: number;
};