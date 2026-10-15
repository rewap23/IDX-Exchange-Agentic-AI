import mysql from "mysql2/promise";
import type { Pool } from "mysql2/promise";

let pool: Pool | undefined;

function getPool(): Pool {
  if (pool) return pool;

  const config = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  };
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length) {
    throw new Error(`Missing required database settings: ${missing.join(", ")}`);
  }

  pool = mysql.createPool({ ...config, waitForConnections: true, connectionLimit: 5 });
  return pool;
}

export async function query<T>(
  sql: string,
  params: (string | number)[] = [],
): Promise<T[]> {
  const [rows] = await getPool().execute(sql, params);
  return rows as T[];
}

export async function closePool(): Promise<void> {
  if (!pool) return;
  const currentPool = pool;
  pool = undefined;
  await currentPool.end();
}
