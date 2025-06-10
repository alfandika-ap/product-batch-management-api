import { Context } from 'elysia';
import jwt from '@elysiajs/jwt';
import { jwtConfig, JWTPayload } from '../config/jwt';
import { AuthService } from '../services/auth.service';
import { ResponseUtil } from '../utils/response.util';

export interface AuthContext {
  user: Omit<import('../types/auth.types').User, 'password' | 'tokenVersion'>;
  jwt: {
    sign: (payload: any) => Promise<string>;
    verify: (token: string) => Promise<any>;
  };
}

/**
 * JWT Authentication middleware
 */
export function createAuthMiddleware() {
  return async (context: Context & { jwt: any }) => {
    const authHeader = context.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseUtil.unauthorized('Token tidak ditemukan');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify JWT token
      const payload = await context.jwt.verify(token) as JWTPayload;
      
      if (!payload || !payload.userId) {
        return ResponseUtil.unauthorized('Token tidak valid');
      }

      // Get user from database
      const user = await AuthService.getUserById(payload.userId);
      
      if (!user) {
        return ResponseUtil.unauthorized('User tidak ditemukan');
      }

      // Add user to context (without sensitive data)
      (context as any).user = AuthService.sanitizeUser(user);
      
    } catch (error) {
      console.error('JWT verification error:', error);
      return ResponseUtil.unauthorized('Token tidak valid');
    }
  };
}

/**
 * Admin role middleware (requires auth middleware first)
 */
export function requireAdmin() {
  return async (context: any) => {
    if (!context.user) {
      return ResponseUtil.unauthorized('Authentication required');
    }

    if (context.user.role !== 'admin') {
      return ResponseUtil.forbidden('Admin access required');
    }
  };
}

/**
 * Optional auth middleware (doesn't fail if no token)
 */
export function createOptionalAuthMiddleware() {
  return async (context: Context & { jwt: any }) => {
    const authHeader = context.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      (context as any).user = null;
      return;
    }

    const token = authHeader.substring(7);

    try {
      const payload = await context.jwt.verify(token) as JWTPayload;
      
      if (payload && payload.userId) {
        const user = await AuthService.getUserById(payload.userId);
        
        if (user) {
          (context as any).user = AuthService.sanitizeUser(user);
        } else {
          (context as any).user = null;
        }
      } else {
        (context as any).user = null;
      }
    } catch (error) {
      (context as any).user = null;
    }
  };
} 