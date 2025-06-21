import bcrypt from 'bcrypt';
import { env } from '../config/environment';
import crypto from 'crypto';

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

  /**
   * Encrypt text using AES-256-CBC
   */
  static encrypt(text: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(env.JWT_SECRET, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt text using AES-256-CBC
   */
  static decrypt(encryptedText: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(env.JWT_SECRET, 'salt', 32);
    
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encrypted = textParts.join(':');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
} 