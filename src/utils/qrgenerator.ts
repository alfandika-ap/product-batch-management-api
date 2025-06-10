/**
 * Generate 10-digit QR code with right-aligned numbers
 * Format: 0000000321 (10 digits total)
 */
export class QRCodeGenerator {
  static generate(number: number): string {
    // Convert number to string and pad with zeros on the left to make it 10 digits
    return number.toString().padStart(10, '0');
  }

  /**
   * Generate QR code with batch prefix
   * Format: BATCH001-0000000321
   */
  static generateWithBatch(batchCode: string, number: number): string {
    const paddedNumber = this.generate(number);
    return `${batchCode}-${paddedNumber}`;
  }

  /**
   * Generate sequential QR codes for a range
   */
  static generateRange(batchCode: string, startIndex: number, endIndex: number): string[] {
    const qrCodes: string[] = [];
    
    for (let i = startIndex; i <= endIndex; i++) {
      qrCodes.push(this.generateWithBatch(batchCode, i));
    }
    
    return qrCodes;
  }
}