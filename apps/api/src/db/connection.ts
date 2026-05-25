import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import * as path from 'path';
import * as fs from 'fs';

const BetterSqlite3 = require('better-sqlite3');

let db: ReturnType<typeof drizzle> | null = null;
let sqlite: any = null;

export function getDb(dbPath?: string) {
  if (db) return db;

  const resolvedPath = dbPath || process.env.DB_PATH || './data/sqlite.db';
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  sqlite = new BetterSqlite3(resolvedPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  db = drizzle(sqlite, { schema });
  return db;
}

export function getSqlite() {
  if (!sqlite) getDb();
  return sqlite;
}

export function closeDb() {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
  }
}
