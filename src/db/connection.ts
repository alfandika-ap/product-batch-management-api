import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { env } from '../config/environment';
import * as schema from './schema';

const pool = mysql.createPool({
  uri: env.DATABASE_URL, 
  connectionLimit: 10,
});

export const db = drizzle(pool, {
  schema,
  mode: 'default',
  logger: env.NODE_ENV === 'development',
});

export type Database = typeof db;
export default db;
