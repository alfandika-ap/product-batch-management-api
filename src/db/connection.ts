import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { env } from '../config/environment';
import * as schema from './schema';

let connection: mysql.Connection | null = null;

export async function getDbConnection() {
  if (!connection) {
    connection = await mysql.createConnection(env.DATABASE_URL);
  }
  return connection;
}

export const db = drizzle(await getDbConnection(), {
  schema,
  mode: 'default',
  logger: env.NODE_ENV === 'development'
});

export type Database = typeof db;
export default db; 