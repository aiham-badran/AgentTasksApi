// src/db/index.ts
import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { env } from '../config/env.js';
import * as schema from './schema.js';

// إنشاء اتصال SQLite
const sqlite = new Database(env.DATABASE_URL);

// تمكين WAL mode لتحسين الأداء والتزامن[reference:17]
sqlite.pragma('journal_mode = WAL');
// تمكين المفاتيح الأجنبية (مهم جدًا لـ CASCADE)
sqlite.pragma('foreign_keys = ON'); //[reference:18]

// إنشاء عميل Drizzle
export const db: BetterSQLite3Database<typeof schema> = drizzle(sqlite, { schema });

// تصدير sqlite للاستخدام في الإغلاق الآمن
export { sqlite };
