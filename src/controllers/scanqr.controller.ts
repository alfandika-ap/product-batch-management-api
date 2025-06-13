import { Context } from "elysia";
import { ScanQrService } from "../services/scanqr.service";
import { ResponseUtil } from "../utils/response.util";

export class ScanQrController {
  static async scanQrCode(context: any) {
    try {
      const { qrCode, serialNumber } = context.body;
      const { product, batch, productItem } = await ScanQrService.scanQrCode({ qrCode, serialNumber });
      return ResponseUtil.success({ product, batch, productItem }, 'QR code scanned successfully');
    } catch (error) {
      context.set.status = 400;
      return ResponseUtil.error('Failed to scan QR code', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}