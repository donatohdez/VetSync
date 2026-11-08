import { createPool, type Pool, type PoolConnection, type PoolOptions, type RowDataPacket } from 'mysql2/promise';
export function database(options: PoolOptions): Pool {
 return createPool({...options,timezone:'Z',connectionLimit:10,charset:'utf8mb4',dateStrings:false});
}
export async function transaction<T>(pool: Pool, operation: (connection: PoolConnection)=>Promise<T>): Promise<T> {
 const connection = await pool.getConnection();
 try {
  await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
  await connection.beginTransaction();
  const result = await operation(connection);
  await connection.commit();
  return result;
 } catch (error) {
  await connection.rollback();
  throw error;
 } finally { connection.release(); }
}
export async function rows<T extends object>(connection: Pool | PoolConnection, sql: string, params: unknown[] = []): Promise<T[]> {
 const [result] = await connection.execute<RowDataPacket[]>(sql, params);
 return result as T[];
}
export function isDuplicate(error: unknown): boolean {
 return typeof error==='object' && error!==null && 'code' in error && error.code==='ER_DUP_ENTRY';
}
