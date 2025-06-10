import { Context } from 'elysia';
import { AuthService } from '../services/auth.service';
import { ResponseUtil } from '../utils/response.util';
import { 
  LoginRequest, 
  RegisterRequest, 
  LoginResponse,
  RefreshTokenRequest,
  PasswordChangeRequest
} from '../types/auth.types';
import { jwtConfig } from '../config/jwt';

export class AuthController {
  /**
   * Register new user
   */
  static async register(context: Context & { body: RegisterRequest; jwt: any }) {
    try {
      const userData = context.body;
      
      // Register user
      const user = await AuthService.register(userData);
      
      // Create JWT tokens
      const accessTokenPayload = AuthService.createJWTPayload(user);
      const refreshTokenPayload = AuthService.createRefreshTokenPayload(user);
      
      const accessToken = await context.jwt.sign(accessTokenPayload);
      const refreshToken = await context.jwt.sign(refreshTokenPayload);
      
      const response: LoginResponse = {
        user: AuthService.sanitizeUser(user),
        accessToken,
        refreshToken
      };
      
      return ResponseUtil.success(response, 'Registrasi berhasil');
      
    } catch (error: any) {
      console.error('Registration error:', error);
      return ResponseUtil.error(error.message || 'Registrasi gagal');
    }
  }

  /**
   * Login user
   */
  static async login(context: Context & { body: LoginRequest; jwt: any }) {
    try {
      const { email, password } = context.body;
      
      // Authenticate user
      const user = await AuthService.login({ email, password });
      
      // Create JWT tokens
      const accessTokenPayload = AuthService.createJWTPayload(user);
      const refreshTokenPayload = AuthService.createRefreshTokenPayload(user);
      
      const accessToken = await context.jwt.sign(accessTokenPayload);
      const refreshToken = await context.jwt.sign(refreshTokenPayload);
      
      const response: LoginResponse = {
        user: AuthService.sanitizeUser(user),
        accessToken,
        refreshToken
      };
      
      return ResponseUtil.success(response, 'Login berhasil');
      
    } catch (error: any) {
      console.error('Login error:', error);
      return ResponseUtil.error(error.message || 'Login gagal');
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(context: Context & { body: RefreshTokenRequest; jwt: any }) {
    try {
      const { refreshToken } = context.body;
      
      // Verify refresh token
      const payload = await context.jwt.verify(refreshToken);
      
      if (!payload || !payload.userId || payload.tokenVersion === undefined) {
        return ResponseUtil.unauthorized('Refresh token tidak valid');
      }
      
      // Get user and verify token version
      const user = await AuthService.getUserById(payload.userId);
      
      // Create new tokens
      if (!user) {
        return ResponseUtil.unauthorized('Refresh token tidak valid');
      }
      
      const accessTokenPayload = AuthService.createJWTPayload(user);
      const newRefreshTokenPayload = AuthService.createRefreshTokenPayload(user);
      
      const newAccessToken = await context.jwt.sign(accessTokenPayload);
      const newRefreshToken = await context.jwt.sign(newRefreshTokenPayload);
      
      const response = {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
      
      return ResponseUtil.success(response, 'Token berhasil diperbarui');
      
    } catch (error: any) {
      console.error('Refresh token error:', error);
      return ResponseUtil.unauthorized('Refresh token tidak valid');
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(context: Context & { user: any }) {
    try {
      const user = context.user;
      
      if (!user) {
        return ResponseUtil.unauthorized('Authentication required');
      }
      
      return ResponseUtil.success(user, 'Profile berhasil diambil');
      
    } catch (error: any) {
      console.error('Get profile error:', error);
      return ResponseUtil.error('Gagal mengambil profile');
    }
  }

  /**
   * Change password
   */
  static async changePassword(context: Context & { body: PasswordChangeRequest; user: any }) {
    try {
      const user = context.user;
      const passwordData = context.body;
      
      if (!user) {
        return ResponseUtil.unauthorized('Authentication required');
      }
      
      await AuthService.changePassword(user.id, passwordData);
      
      return ResponseUtil.success(null, 'Password berhasil diubah');
      
    } catch (error: any) {
      console.error('Change password error:', error);
      return ResponseUtil.error(error.message || 'Gagal mengubah password');
    }
  }

  /**
   * Logout (invalidate refresh tokens)
   */
  static async logout(context: Context & { user: any }) {
    try {
      const user = context.user;
      
      if (!user) {
        return ResponseUtil.unauthorized('Authentication required');
      }
      
      // Invalidate all refresh tokens by incrementing token version
      await AuthService.invalidateUserTokens(user.id);
      
      return ResponseUtil.success(null, 'Logout berhasil');
      
    } catch (error: any) {
      console.error('Logout error:', error);
      return ResponseUtil.error('Logout gagal');
    }
  }

  /**
   * Deactivate account
   */
  static async deactivateAccount(context: Context & { user: any }) {
    try {
      const user = context.user;
      
      if (!user) {
        return ResponseUtil.unauthorized('Authentication required');
      }
      
      await AuthService.deactivateUser(user.id);
      
      return ResponseUtil.success(null, 'Akun berhasil dinonaktifkan');
      
    } catch (error: any) {
      console.error('Deactivate account error:', error);
      return ResponseUtil.error('Gagal menonaktifkan akun');
    }
  }
} 