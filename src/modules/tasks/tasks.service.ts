// src/modules/tasks/tasks.service.ts
import { and, eq, isNull, like, or, lte, gte, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { tasks, type Task } from '../../db/schema.js';
import { TaskNotFoundError } from '../../utils/errors.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import type { CreateTaskInput, UpdateTaskInput, ListTasksQuery } from './tasks.schemas.js';

// ─── Row → API shape (Date → ISO handled by JSON.stringify) ─
function serialize(task: Task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    completedAt: task.completedAt,
    source: task.source,
    metadata: task.metadata,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

// ─── Sort mapping ───────────────────────────────────────────
const SORT_COLUMNS = {
  created_at: tasks.createdAt,
  updated_at: tasks.updatedAt,
  due_date: tasks.dueDate,
  priority: tasks.priority,
  title: tasks.title,
} as const;

function parseSort(sortStr?: string) {
  if (!sortStr) return { column: tasks.createdAt, direction: 'desc' as const };
  const [field, dir] = sortStr.split(':');
  const column = SORT_COLUMNS[field as keyof typeof SORT_COLUMNS];
  if (!column) return { column: tasks.createdAt, direction: 'desc' as const };
  return { column, direction: dir === 'asc' ? ('asc' as const) : ('desc' as const) };
}

// ─── Helpers ────────────────────────────────────────────────
async function findOwnedTask(userId: string, taskId: string): Promise<Task> {
  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId), isNull(tasks.deletedAt)))
    .limit(1);

  const task = rows[0];
  if (!task) throw new TaskNotFoundError();
  return task;
}

// ─── CRUD ───────────────────────────────────────────────────
export async function createTask(userId: string, input: CreateTaskInput) {
  const [row] = await db
    .insert(tasks)
    .values({
      userId,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      dueDate: input.due_date ? new Date(input.due_date) : null,
      source: 'manual',
    })
    .returning();

  return serialize(row!);
}

export async function listTasks(userId: string, query: ListTasksQuery) {
  const conditions: SQL[] = [eq(tasks.userId, userId), isNull(tasks.deletedAt)];

  if (query.status) conditions.push(eq(tasks.status, query.status));
  if (query.priority) conditions.push(eq(tasks.priority, query.priority));
  if (query.search) {
    conditions.push(
      or(
        like(tasks.title, `%${query.search}%`),
        like(tasks.description, `%${query.search}%`),
      ) as SQL,
    );
  }
  if (query.due_before) conditions.push(lte(tasks.dueDate, new Date(query.due_before)));
  if (query.due_after) conditions.push(gte(tasks.dueDate, new Date(query.due_after)));

  const where = and(...conditions);
  const { column, direction } = parseSort(query.sort);
  const pg = parsePagination({ page: query.page, limit: query.limit });

  const totalRow = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(where);
  const total = Number(totalRow[0]?.count ?? 0);

  const rows = await db
    .select()
    .from(tasks)
    .where(where)
    .orderBy(direction === 'asc' ? column : sql`${column} DESC`)
    .limit(pg.limit)
    .offset(pg.offset);

  return {
    data: rows.map(serialize),
    pagination: buildPaginationMeta(pg, total),
  };
}

export async function getTask(userId: string, taskId: string) {
  const task = await findOwnedTask(userId, taskId);
  return serialize(task);
}

export async function updateTask(userId: string, taskId: string, input: UpdateTaskInput) {
  const existing = await findOwnedTask(userId, taskId);

  const update: Partial<Task> = {};

  if (input.title !== undefined) update.title = input.title;
  if (input.description !== undefined) update.description = input.description;
  if (input.priority !== undefined) update.priority = input.priority;
  if (input.due_date !== undefined)
    update.dueDate = input.due_date ? new Date(input.due_date) : null;

  if (input.status !== undefined) {
    update.status = input.status;
    if (input.status === 'completed' && existing.status !== 'completed') {
      update.completedAt = new Date();
    } else if (input.status !== 'completed' && existing.status === 'completed') {
      update.completedAt = null;
    }
  }

  if (Object.keys(update).length === 0) {
    return serialize(existing);
  }

  const [row] = await db
    .update(tasks)
    .set({ ...update, updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning();

  return serialize(row!);
}

export async function deleteTask(userId: string, taskId: string) {
  await findOwnedTask(userId, taskId); // 404 if not found/owned
  await db
    .update(tasks)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}

export async function completeTask(userId: string, taskId: string) {
  const existing = await findOwnedTask(userId, taskId);

  // idempotent
  if (existing.status === 'completed' && existing.completedAt) {
    return serialize(existing);
  }

  const [row] = await db
    .update(tasks)
    .set({
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning();

  return serialize(row!);
}

export async function reopenTask(userId: string, taskId: string) {
  await findOwnedTask(userId, taskId);

  const [row] = await db
    .update(tasks)
    .set({ status: 'pending', completedAt: null, updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning();

  return serialize(row!);
}

// ─── Create task from AI-parsed draft (M5) ─────────────────
export async function createTaskFromAi(
  userId: string,
  draft: {
    title: string;
    description: string | null;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    due_date: string | null;
  },
  metadata: {
    provider: string;
    model: string;
    confidence: number;
    raw_text: string;
  },
) {
  const [row] = await db
    .insert(tasks)
    .values({
      userId,
      title: draft.title,
      description: draft.description,
      priority: draft.priority,
      dueDate: draft.due_date ? new Date(draft.due_date) : null,
      source: 'ai_nl',
      metadata,
    })
    .returning();

  return serialize(row!);
}
