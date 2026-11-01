// tests/helpers/db.ts
import { db } from '../../src/db/index.js';
import { users, apiKeys, tasks } from '../../src/db/schema.js';

/** تنظيف كل الجداول — استخدمها في beforeEach */
export function resetDb(): void {
  db.delete(tasks).run();
  db.delete(apiKeys).run();
  db.delete(users).run();
}
