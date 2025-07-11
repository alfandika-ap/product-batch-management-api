import { sql } from 'drizzle-orm';

export class DateUtil {
  /**
   * Get current UTC timestamp for database operations
   * Using MySQL's UTC_TIMESTAMP() function to ensure consistent UTC time
   */
  static getCurrentUTCTimestamp() {
    return sql`UTC_TIMESTAMP()`;
  }

  /**
   * Get current UTC timestamp as JavaScript Date object
   */
  static getCurrentUTCDate(): Date {
    return new Date(Date.now());
  }

  /**
   * Convert date to UTC ISO string
   */
  static toUTCISOString(date: Date): string {
    return date.toISOString();
  }

  /**
   * Get current UTC timestamp as ISO string
   */
  static getCurrentUTCISOString(): string {
    return new Date().toISOString();
  }

  /**
   * Check if date is valid
   */
  static isValidDate(date: any): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Format date to UTC string for logging
   */
  static formatUTCForLog(date: Date): string {
    return date.toISOString().replace('T', ' ').replace('Z', ' UTC');
  }
} 