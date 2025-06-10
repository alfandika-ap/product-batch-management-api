import bcrypt from 'bcrypt';
import { env } from '../config/environment';

export class CryptoUtil {
  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate random string for tokens
   */
  static generateRandomString(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate secure 6-digit PIN
   */
  static generateSecurePIN(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate unique QR code string
   */
  static generateQRCode(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = this.generateRandomString(16);
    return `CBX${timestamp}${randomPart}`.toUpperCase();
  }
} 