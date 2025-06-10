import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  
  // Server
  PORT: z.string().transform(Number).default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // CORS
  CORS_ORIGIN: z.string().default('*'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // Security
  BCRYPT_ROUNDS: z.string().transform(Number).default('12')
});

export type Environment = z.infer<typeof envSchema>;

function loadEnvironment(): Environment {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    process.exit(1);
  }
}

export const env = loadEnvironment();

export default env; 