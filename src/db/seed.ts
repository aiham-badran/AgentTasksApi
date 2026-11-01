// src/db/seed.ts
import { db } from './index.js';
import { users } from './schema.js';
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger.js';

async function seed() {
  try {
    // التحقق من وجود المستخدم مسبقًا
    const existing = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, 'demo@example.com'),
    });

    if (existing) {
      logger.info('Demo user already exists');
      return;
    }

    const passwordHash = await bcrypt.hash('Password123!', 12);

    const [user] = await db
      .insert(users)
      .values({
        email: 'demo@example.com',
        name: 'Demo User',
        passwordHash,
      })
      .returning();

    logger.info({ userId: user?.id }, '✅ Demo user created');
    logger.info('Email: demo@example.com');
    logger.info('Password: Password123!');
  } catch (error) {
    logger.error({ error }, 'Seed failed');
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seed();
