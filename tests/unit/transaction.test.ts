import { it,expect,vi } from 'vitest';
import type { PoolConnection } from 'mysql2/promise';
import { database,transaction } from '../../src/shared/database.js';
it.each([false,true])('preserva el fallo original y libera la conexión; rollback falla=%s',async(rollbackFails)=>{
 const original=new Error('Falló la operación');
 const rollbackError=new Error('Conexión perdida durante rollback');
 const connection={query:vi.fn().mockResolvedValue([]),beginTransaction:vi.fn().mockResolvedValue(undefined),commit:vi.fn(),rollback:rollbackFails?vi.fn().mockRejectedValue(rollbackError):vi.fn().mockResolvedValue(undefined),release:vi.fn()};
 const pool=database({});
 vi.spyOn(pool,'getConnection').mockResolvedValue(connection as unknown as PoolConnection);
 try{
  let caught:unknown;
  try{await transaction(pool,async()=>{throw original;});}catch(error){caught=error;}
  if(rollbackFails){
   expect(caught).toBeInstanceOf(AggregateError);
   expect((caught as AggregateError).cause).toBe(original);
   expect((caught as AggregateError).errors).toEqual([original,rollbackError]);
  }else expect(caught).toBe(original);
  expect(connection.rollback).toHaveBeenCalledOnce();
  expect(connection.commit).not.toHaveBeenCalled();
  expect(connection.release).toHaveBeenCalledOnce();
 }finally{await pool.end();}
});
