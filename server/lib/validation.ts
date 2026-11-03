import { z } from 'zod';

const isoTimestamp = z
  .string()
  .min(1, 'An ISO 8601 timestamp is required.')
  .refine(
    (value) => {
      const parsed = Date.parse(value);
      return !Number.isNaN(parsed);
    },
    { message: 'Enter a valid date or timestamp.' },
  )
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'A date in YYYY-MM-DD format is required.'))
  .transform((value) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`).toISOString() : value,
  );

const nullableTimestamp = z
  .string()
  .trim()
  .min(1)
  .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isNaN(Date.parse(value)), {
    message: 'Enter a valid date or timestamp.',
  })
  .nullable()
  .optional()
  .transform((value) =>
    value === null || value === undefined || value === '' ? null : /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`).toISOString() : value,
  );

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'A date in YYYY-MM-DD format is required.' });
const timestamp = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'A valid date and time is required.',
});

export const taskCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(180),
    description: z.string().trim().max(5000).default(''),
    category: z.string().trim().min(1).max(80).default('General'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    status: z.enum(['todo', 'in_progress', 'completed']).default('todo'),
    due_date: isoTimestamp.optional(),
    recurrence: z.enum(['none', 'daily', 'weekdays', 'weekly', 'monthly']).default('none'),
    tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
    completed_at: nullableTimestamp.optional(),
  })
  .strict();

export const taskUpdateSchema = taskCreateSchema
  .partial()
  .strict()
  .refine((values) => Object.keys(values).length > 0, { message: 'Provide at least one field to update.' });

export const subtaskCreateSchema = z.object({
  task_id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  position: z.number().int().min(0).default(0),
}).strict();

export const subtaskUpdateSchema = subtaskCreateSchema
  .partial()
  .strict()
  .refine((values) => Object.keys(values).length > 0, { message: 'Provide at least one field to update.' });

export const eventCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(180),
    description: z.string().trim().max(5000).default(''),
    start_at: timestamp,
    end_at: timestamp,
    all_day: z.boolean().default(false),
    category: z.string().trim().min(1).max(80).default('Personal'),
    color: z.string().trim().min(4).max(32).default('#7857f6'),
    location: z.string().trim().max(200).default(''),
    reminder_minutes: z.number().int().min(0).max(5256000).nullable().optional(),
  })
  .strict()
  .refine((values) => Date.parse(values.end_at) > Date.parse(values.start_at), {
    message: 'The event must end after it starts.',
    path: ['end_at'],
  });

export const eventUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(180).optional(),
    description: z.string().trim().max(5000).optional(),
    start_at: timestamp.optional(),
    end_at: timestamp.optional(),
    all_day: z.boolean().optional(),
    category: z.string().trim().min(1).max(80).optional(),
    color: z.string().trim().min(4).max(32).optional(),
    location: z.string().trim().max(200).optional(),
    reminder_minutes: z.number().int().min(0).max(5256000).nullable().optional(),
  })
  .strict()
  .refine((values) => Object.keys(values).length > 0, { message: 'Provide at least one field to update.' })
  .superRefine((values, ctx) => {
    if (values.start_at && values.end_at && Date.parse(values.end_at) <= Date.parse(values.start_at)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_at'],
        message: 'The event must end after it starts.',
      });
    }
  });

export const habitCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(1000).default(''),
    icon: z.string().trim().min(2).max(40).default('sparkles'),
    color: z.string().trim().min(4).max(32).default('#7857f6'),
    frequency: z.enum(['daily', 'weekly', 'custom']),
    days_of_week: z.array(z.number().int().min(0).max(6)).max(7).default([]),
    target_per_week: z.number().int().min(1).max(7).default(7),
  })
  .strict();

export const habitUpdateSchema = habitCreateSchema
  .partial()
  .strict()
  .refine((values) => Object.keys(values).length > 0, { message: 'Provide at least one field to update.' });

export const habitLogCreateSchema = z
  .object({
    habit_id: z.string().uuid(),
    completed_on: dateOnly,
    note: z.string().trim().max(500).default(''),
  })
  .strict();

export const noteCreateSchema = z.object({
  title: z.string().trim().max(180).default('Untitled note'),
  content: z.string().trim().max(20000).default(''),
  category: z.string().trim().max(80).default('General'),
  is_pinned: z.boolean().default(false),
  color: z.string().trim().min(4).max(32).default('#7857f6'),
}).strict();

export const noteUpdateSchema = noteCreateSchema
  .partial()
  .strict()
  .refine((values) => Object.keys(values).length > 0, { message: 'Provide at least one field to update.' });

export const journalCreateSchema = z
  .object({
    entry_date: dateOnly,
    title: z.string().trim().max(180).default(''),
    content: z.string().trim().max(20000).default(''),
    mood: z.enum(['great', 'good', 'okay', 'low', 'awful']).nullable().optional(),
  })
  .strict();

export const journalUpdateSchema = journalCreateSchema
  .partial()
  .strict()
  .refine((values) => Object.keys(values).length > 0, { message: 'Provide at least one field to update.' });

export const transactionCreateSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive().max(1_000_000_000),
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().max(300).default(''),
  transaction_date: dateOnly,
  payment_method: z.string().trim().min(1).max(100).default('Other'),
}).strict();

export const transactionUpdateSchema = transactionCreateSchema
  .partial()
  .strict()
  .refine((values) => Object.keys(values).length > 0, { message: 'Provide at least one field to update.' });

export const budgetCreateSchema = z.object({
  category: z.string().trim().min(1).max(100),
  amount_limit: z.number().positive().max(1_000_000_000),
  period_month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Period must be in YYYY-MM format.' }),
}).strict();

export const budgetUpdateSchema = budgetCreateSchema
  .partial()
  .strict()
  .refine((values) => Object.keys(values).length > 0, { message: 'Provide at least one field to update.' });

export const savingsGoalCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  target_amount: z.number().positive().max(1_000_000_000),
  current_amount: z.number().min(0).max(1_000_000_000).default(0),
  target_date: nullableTimestamp,
  color: z.string().trim().min(4).max(32).default('#7857f6'),
  icon: z.string().trim().min(2).max(40).default('target'),
  completed: z.boolean().default(false),
}).strict();

export const savingsGoalUpdateSchema = savingsGoalCreateSchema
  .partial()
  .strict()
  .refine((values) => Object.keys(values).length > 0, { message: 'Provide at least one field to update.' });

export const notificationCreateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  message: z.string().trim().max(500),
  type: z.enum(['task', 'event', 'habit', 'system', 'finance']).default('system'),
  entity_type: z.string().trim().max(80).nullable().optional(),
  entity_id: z.string().trim().max(80).nullable().optional(),
  due_at: timestamp,
  dedupe_key: z.string().trim().max(200).nullable().optional(),
}).strict();

export const notificationUpdateSchema = notificationCreateSchema
  .partial()
  .strict()
  .refine((values) => Object.keys(values).length > 0, { message: 'Provide at least one field to update.' });

export const aiConversationCreateSchema = z.object({
  title: z.string().trim().max(120).default('New conversation'),
}).strict();

export const aiMessageCreateSchema = z.object({
  conversation_id: z.string().uuid(),
  message: z.string().trim().min(1).max(12000),
}).strict();

export const aiChatSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(12000),
  context: z.object({
    tasksDueToday: z.number().int().min(0).max(1000).default(0),
    completedThisWeek: z.number().int().min(0).max(1000).default(0),
    habits: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
    eventsToday: z.array(z.string().trim().min(1).max(180)).max(20).default([]),
    topPriorities: z.array(z.string().trim().min(1).max(180)).max(20).default([]),
  }).strict().default({
    tasksDueToday: 0,
    completedThisWeek: 0,
    habits: [],
    eventsToday: [],
    topPriorities: [],
  }),
}).strict();

export const profileUpdateSchema = z
  .object({
    full_name: z.string().trim().max(80).optional(),
    avatar_url: z.string().trim().max(2000).nullable().optional(),
    timezone: z.string().trim().min(2).max(80).optional(),
    date_format: z.string().trim().min(2).max(40).optional(),
    currency: z.string().trim().regex(/^[A-Z]{3}$/).optional(),
    theme: z.enum(['dark', 'light']).optional(),
    week_starts_on: z.number().int().min(0).max(6).optional(),
    dashboard_widgets: z.record(z.string().trim().min(1).max(60), z.boolean()).optional(),
    notification_preferences: z
      .object({
        taskReminders: z.boolean().optional(),
        eventReminders: z.boolean().optional(),
        habitReminders: z.boolean().optional(),
        browserNotifications: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine((values) => Object.keys(values).length > 0, { message: 'Provide at least one field to update.' });

export type TaskCreate = z.infer<typeof taskCreateSchema>;
export type TaskUpdate = z.infer<typeof taskUpdateSchema>;
export type EventCreate = z.infer<typeof eventCreateSchema>;
export type EventUpdate = z.infer<typeof eventUpdateSchema>;
export type HabitCreate = z.infer<typeof habitCreateSchema>;
export type HabitUpdate = z.infer<typeof habitUpdateSchema>;
export type HabitLogCreate = z.infer<typeof habitLogCreateSchema>;
export type NoteCreate = z.infer<typeof noteCreateSchema>;
export type NoteUpdate = z.infer<typeof noteUpdateSchema>;
export type JournalCreate = z.infer<typeof journalCreateSchema>;
export type JournalUpdate = z.infer<typeof journalUpdateSchema>;
export type TransactionCreate = z.infer<typeof transactionCreateSchema>;
export type TransactionUpdate = z.infer<typeof transactionUpdateSchema>;
export type BudgetCreate = z.infer<typeof budgetCreateSchema>;
export type BudgetUpdate = z.infer<typeof budgetUpdateSchema>;
export type SavingsGoalCreate = z.infer<typeof savingsGoalCreateSchema>;
export type SavingsGoalUpdate = z.infer<typeof savingsGoalUpdateSchema>;
export type NotificationCreate = z.infer<typeof notificationCreateSchema>;
export type NotificationUpdate = z.infer<typeof notificationUpdateSchema>;
export type AIChat = z.infer<typeof aiChatSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
