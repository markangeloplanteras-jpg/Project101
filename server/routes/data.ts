import { Router, type NextFunction, type Request, type Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { getDataStore, type DataStore } from '../lib/dataStore.js';
import { RESOURCE_DEFINITIONS, type ResourceName } from '../lib/resources.js';
import {
  taskCreateSchema,
  taskUpdateSchema,
  subtaskCreateSchema,
  subtaskUpdateSchema,
  eventCreateSchema,
  eventUpdateSchema,
  habitCreateSchema,
  habitUpdateSchema,
  habitLogCreateSchema,
  noteCreateSchema,
  noteUpdateSchema,
  journalCreateSchema,
  journalUpdateSchema,
  transactionCreateSchema,
  transactionUpdateSchema,
  budgetCreateSchema,
  budgetUpdateSchema,
  savingsGoalCreateSchema,
  savingsGoalUpdateSchema,
  notificationCreateSchema,
  notificationUpdateSchema,
  aiConversationCreateSchema,
} from '../lib/validation.js';

export const dataRouter = Router();

const createSchemas: Record<ResourceName, ZodTypeAny> = {
  tasks: taskCreateSchema,
  subtasks: subtaskCreateSchema,
  events: eventCreateSchema,
  habits: habitCreateSchema,
  habit_logs: habitLogCreateSchema,
  notes: noteCreateSchema,
  journal_entries: journalCreateSchema,
  transactions: transactionCreateSchema,
  budgets: budgetCreateSchema,
  savings_goals: savingsGoalCreateSchema,
  notifications: notificationCreateSchema,
  ai_conversations: aiConversationCreateSchema,
};

const updateSchemas: Record<ResourceName, ZodTypeAny> = {
  tasks: taskUpdateSchema,
  subtasks: subtaskUpdateSchema,
  events: eventUpdateSchema,
  habits: habitUpdateSchema,
  habit_logs: habitLogCreateSchema as unknown as ZodTypeAny,
  notes: noteUpdateSchema,
  journal_entries: journalUpdateSchema,
  transactions: transactionUpdateSchema,
  budgets: budgetUpdateSchema,
  savings_goals: savingsGoalUpdateSchema,
  notifications: notificationUpdateSchema,
  ai_conversations: aiConversationCreateSchema.partial().strict(),
};

function parseOrError(schema: ZodTypeAny, body: unknown) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const first = result.error.issues[0];
    const error = new Error(first?.message || 'The submitted data is invalid.') as Error & {
      status?: number;
      code?: string;
    };
    error.status = 400;
    error.code = first?.code === 'too_small' ? 'INVALID_VALUE' : 'VALIDATION_ERROR';
    throw error;
  }
  return result.data;
}

async function handleCreate(req: Request, res: Response, resource: ResourceName) {
  const ctx = req.auth;
  if (!ctx) {
    return res.status(401).json({ error: { message: 'Authentication is required.', code: 'AUTH_REQUIRED' } });
  }
  const store = getDataStore(ctx);
  const parsed = parseOrError(createSchemas[resource], req.body);
  const data = await store.createResource(resource, ctx.userId, parsed as Record<string, unknown>);
  return res.status(201).json({ data });
}

async function handleUpdate(req: Request, res: Response, resource: ResourceName, id: string) {
  const ctx = req.auth;
  if (!ctx) {
    return res.status(401).json({ error: { message: 'Authentication is required.', code: 'AUTH_REQUIRED' } });
  }
  const store = getDataStore(ctx);
  if (resource === 'tasks') {
    const parsed = taskUpdateSchema.parse(req.body);
    const completedAt = parsed.status === 'completed' ? parsed.completed_at ?? new Date().toISOString() : parsed.completed_at ?? null;
    const { completed_at, ...values } = parsed;
    const data = await store.updateResource('tasks', id, ctx.userId, { ...values, status: parsed.status, completed_at: completedAt });
    return res.json({ data });
  }
  const parsed = parseOrError(updateSchemas[resource], req.body);
  const data = await store.updateResource(resource, id, ctx.userId, parsed as Record<string, unknown>);
  return res.json({ data });
}

dataRouter.post('/:resource', requireAuth, async (req, res, next: NextFunction) => {
  try {
    const resource = req.params.resource as ResourceName;
    if (!RESOURCE_DEFINITIONS[resource]) {
      return res.status(404).json({ error: { message: 'Unknown data resource.', code: 'NOT_FOUND' } });
    }
    return await handleCreate(req, res, resource);
  } catch (error) {
    return next(error);
  }
});

dataRouter.patch('/:resource/:id', requireAuth, async (req, res, next: NextFunction) => {
  try {
    const resource = req.params.resource as ResourceName;
    const id = req.params.id;
    if (!RESOURCE_DEFINITIONS[resource]) {
      return res.status(404).json({ error: { message: 'Unknown data resource.', code: 'NOT_FOUND' } });
    }
    if (!id) {
      return res.status(400).json({ error: { message: 'Record id is required.', code: 'VALIDATION_ERROR' } });
    }
    return await handleUpdate(req, res, resource, id);
  } catch (error) {
    return next(error);
  }
});

dataRouter.delete('/:resource/:id', requireAuth, async (req, res, next: NextFunction) => {
  try {
    const resource = req.params.resource as ResourceName;
    const id = req.params.id;
    const ctx = req.auth;
    if (!ctx) {
      return res.status(401).json({ error: { message: 'Authentication is required.', code: 'AUTH_REQUIRED' } });
    }
    const store = getDataStore(ctx);
    await store.deleteResource(resource, id, ctx.userId);
    return res.json({ data: { id } });
  } catch (error) {
    return next(error);
  }
});

export default dataRouter;
