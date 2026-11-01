// src/db/schema.ts
import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

// ─── جدول المستخدمين ─────────────────────────────────────
export const users = sqliteTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()), // UUID v4[reference:11]
    email: text('email').notNull().unique(), // فريد
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()), // تاريخ الإنشاء[reference:12]
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()), // تحديث تلقائي[reference:13]
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email), // فهرس للبحث السريع
  }),
);

// ─── جدول مفاتيح API للمزودين (BYOK) ──────────────────
export const apiKeys = sqliteTable(
  'api_keys',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }), // مفتاح أجنبي مع حذف متسلسل[reference:14]
    provider: text('provider', { enum: ['groq', 'google', 'openrouter'] }).notNull(),
    encryptedKey: text('encrypted_key').notNull(), // المفتاح المشفر
    iv: text('iv').notNull(), // Initialization Vector
    authTag: text('auth_tag').notNull(), // Auth Tag للتشفير
    keyPrefix: text('key_prefix').notNull(), // آخر 4 أحرف للعرض
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true), // Boolean[reference:15]
    lastValidatedAt: integer('last_validated_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
  },
  (table) => ({
    userProviderUnique: uniqueIndex('api_keys_user_provider_unique').on(
      table.userId,
      table.provider,
    ), // مفتاح واحد لكل مزود لكل مستخدم
  }),
);

// ─── جدول المهام ─────────────────────────────────────────
export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status', {
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    })
      .notNull()
      .default('pending'),
    priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] })
      .notNull()
      .default('medium'),
    dueDate: integer('due_date', { mode: 'timestamp_ms' }),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
    source: text('source', { enum: ['manual', 'ai_nl', 'webhook'] })
      .notNull()
      .default('manual'),
    metadata: text('metadata', { mode: 'json' }), // حقل JSON لبيانات الـ AI
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }), // Soft Delete[reference:16]
  },
  (table) => ({
    userIdIdx: index('tasks_user_id_idx').on(table.userId), // فهرس لسرعة الاستعلام
    statusIdx: index('tasks_status_idx').on(table.status),
    userStatusIdx: index('tasks_user_status_idx').on(table.userId, table.status),
  }),
);

// ─── العلاقات (اختياري ولكن مفيد) ──────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  apiKeys: many(apiKeys),
  tasks: many(tasks),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
}));

// ─── أنواع TypeScript المستخرجة ────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
