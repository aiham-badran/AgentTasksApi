// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  dialect: 'sqlite', // نوع قاعدة البيانات[reference:3]
  schema: './src/db/schema.ts', // مسار ملف الـ Schema
  out: './src/db/migrations', // مجلد حفظ ملفات الـ migration
  dbCredentials: {
    url: process.env.DATABASE_URL || './data/app.db', // مسار قاعدة البيانات[reference:4]
  },
  verbose: true, // طباعة تفاصيل إضافية
  strict: true, // تأكيد قبل تنفيذ الأوامر
});
