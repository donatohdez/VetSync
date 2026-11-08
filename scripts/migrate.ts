import { readFile, readdir } from 'node:fs/promises';
import { config } from '../src/shared/config.js';
import { database, rows } from '../src/shared/database.js';
const pool = database({host:config.DB_HOST,port:config.DB_PORT,user:config.DB_USER,password:config.DB_PASSWORD,database:config.DB_NAME});
try {
 await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(200) PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
 for (const name of (await readdir('database/migrations')).filter(x=>x.endsWith('.sql')).sort()) {
  if ((await rows(pool,'SELECT name FROM schema_migrations WHERE name = ?',[name])).length) continue;
  const sql = await readFile(`database/migrations/${name}`,'utf8');
  for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean)) await pool.query(statement);
  await pool.execute('INSERT INTO schema_migrations (name) VALUES (?)',[name]);
  console.log(`Migración aplicada: ${name}`);
 }
} finally { await pool.end(); }
