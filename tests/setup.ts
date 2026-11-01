// tests/setup.ts
import { vi } from 'vitest';
import path from 'node:path';

// نستبدل src/db/index.js بنسخة in-memory مع migrations مطبقة
vi.mock('../src/db/index.js', async () => {
  const Database = (await import('better-sqlite3')).default;
  const { drizzle } = await import('drizzle-orm/better-sqlite3');
  const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
  const schema = await import('../src/db/schema.js');

  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });
  migrate(db, {
    migrationsFolder: path.resolve(process.cwd(), 'src/db/migrations'),
  });

  return { db, sqlite };
});

// منع أي تسريب لبيانات حقيقية في الاختبارات
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = ':memory:';
process.env.JWT_SECRET = 'test_secret_at_least_32_characters_long_xxxxx';
process.env.JWT_EXPIRES_IN = '7d';
process.env.MASTER_ENCRYPTION_KEY = Buffer.from('0'.repeat(32)).toString('base64');
