import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection';
import { usersTable } from '../db/schema';
import { CryptoUtil } from '../utils/crypto.util';
import { 
  LoginRequest, 
  RegisterRequest, 
  User,
  PasswordChangeRequest 
} from '../types/auth.types';
import { JWTPayload, RefreshTokenPayload } from '../config/jwt';

export class AuthService {
  /**
   * Register new user
   */
  static async register(data: RegisterRequest): Promise<User> {
    // Check if email already exists
    const existingUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, data.email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error('Email sudah terdaftar');
    }

    // Hash password
    const hashedPassword = await CryptoUtil.hashPassword(data.password);

    // Insert new user
    await db
      .insert(usersTable)
      .values({
        name: data.name,
        email: data.email,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    // Get the created user
    const [newUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, data.email))
      .limit(1);

    return newUser;
  }

  /**
   * Login user
   */
  static async login(data: LoginRequest): Promise<User> {
    // Find user by email
    const [user] = await db
      .select()
      .from(usersTable)
      .where(and(
        eq(usersTable.email, data.email),
      ))
      .limit(1);

    if (!user) {
      throw new Error('Email atau password salah');
    }

    // Verify password
    const isPasswordValid = await CryptoUtil.comparePassword(data.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Email atau password salah');
    }

    return user;
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: number): Promise<User | null> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(and(
        eq(usersTable.id, id)
      ))
      .limit(1);

    return user || null;
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    return user || null;
  }

  /**
   * Change user password
   */
  static async changePassword(userId: number, data: PasswordChangeRequest): Promise<void> {
    // Get current user
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User tidak ditemukan');
    }

    // Verify current password
    const isCurrentPasswordValid = await CryptoUtil.comparePassword(
      data.currentPassword, 
      user.password
    );

    if (!isCurrentPasswordValid) {
      throw new Error('Password saat ini salah');
    }

    // Hash new password
    const hashedNewPassword = await CryptoUtil.hashPassword(data.newPassword);

    // Update password and increment token version (invalidate all tokens)
    await db
      .update(usersTable)
      .set({ 
        password: hashedNewPassword,
        updatedAt: new Date()
      })
      .where(eq(usersTable.id, userId));
  }

  /**
   * Increment token version (invalidate all refresh tokens)
   */
  static async invalidateUserTokens(userId: number): Promise<void> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (user) {
      await db
        .update(usersTable)
        .set({ 
          updatedAt: new Date()
        })
        .where(eq(usersTable.id, userId));
    }
  }

  /**
   * Deactivate user account
   */
  static async deactivateUser(userId: number): Promise<void> {
    await db
      .update(usersTable)
      .set({ 
        updatedAt: new Date()
      })
      .where(eq(usersTable.id, userId));
  }

  /**
   * Create JWT payload from user
   */
  static createJWTPayload(user: User): JWTPayload {
    return {
      userId: user.id,
      email: user.email,
    };
  }

  /**
   * Create refresh token payload
   */
  static createRefreshTokenPayload(user: User): RefreshTokenPayload {
    return {
      userId: user.id
    };
  }

  /**
   * Remove sensitive data from user
   */
  static sanitizeUser(user: User): Omit<User, 'password'> {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }
} 