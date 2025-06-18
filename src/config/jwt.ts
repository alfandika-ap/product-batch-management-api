import { env } from './environment';

export const jwtConfig = {
  secret: env.JWT_SECRET,
  expiresIn: env.JWT_EXPIRES_IN,
  refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  algorithm: 'HS256' as const,
  issuer: 'carabao-api',
  audience: 'carabao-client'
};

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface RefreshTokenPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

export default jwtConfig; 