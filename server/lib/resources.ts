export type ResourceName =
  | 'tasks'
  | 'subtasks'
  | 'events'
  | 'habits'
  | 'habit_logs'
  | 'notes'
  | 'journal_entries'
  | 'transactions'
  | 'budgets'
  | 'savings_goals'
  | 'notifications'
  | 'ai_conversations';

export interface ResourceDefinition {
  table: ResourceName;
  fields: readonly string[];
  jsonFields?: readonly string[];
  booleanFields?: readonly string[];
  orderBy?: { column: string; ascending: boolean };
}

export const RESOURCE_DEFINITIONS: Record<ResourceName, ResourceDefinition> = {
  tasks: {
    table: 'tasks',
    fields: [
      'title',
      'description',
      'category',
      'priority',
      'status',
      'due_date',
      'recurrence',
      'tags',
      'completed_at',
    ],
    jsonFields: ['tags'],
    orderBy: { column: 'created_at', ascending: false },
  },
  subtasks: {
    table: 'subtasks',
    fields: ['task_id', 'title', 'completed', 'position'],
    booleanFields: ['completed'],
    orderBy: { column: 'position', ascending: true },
  },
  events: {
    table: 'events',
    fields: [
      'title',
      'description',
      'start_at',
      'end_at',
      'all_day',
      'category',
      'color',
      'location',
      'reminder_minutes',
    ],
    booleanFields: ['all_day'],
    orderBy: { column: 'start_at', ascending: true },
  },
  habits: {
    table: 'habits',
    fields: ['name', 'description', 'icon', 'color', 'frequency', 'days_of_week', 'target_per_week', 'archived'],
    jsonFields: ['days_of_week'],
    booleanFields: ['archived'],
    orderBy: { column: 'created_at', ascending: true },
  },
  habit_logs: {
    table: 'habit_logs',
    fields: ['habit_id', 'completed_on', 'note'],
    orderBy: { column: 'completed_on', ascending: false },
  },
  notes: {
    table: 'notes',
    fields: ['title', 'content', 'category', 'is_pinned', 'color'],
    booleanFields: ['is_pinned'],
    orderBy: { column: 'updated_at', ascending: false },
  },
  journal_entries: {
    table: 'journal_entries',
    fields: ['entry_date', 'title', 'content', 'mood'],
    orderBy: { column: 'entry_date', ascending: false },
  },
  transactions: {
    table: 'transactions',
    fields: ['type', 'amount', 'category', 'description', 'transaction_date', 'payment_method'],
    orderBy: { column: 'transaction_date', ascending: false },
  },
  budgets: {
    table: 'budgets',
    fields: ['category', 'amount_limit', 'period_month'],
    orderBy: { column: 'period_month', ascending: false },
  },
  savings_goals: {
    table: 'savings_goals',
    fields: ['name', 'target_amount', 'current_amount', 'target_date', 'color', 'icon', 'completed'],
    booleanFields: ['completed'],
    orderBy: { column: 'created_at', ascending: false },
  },
  notifications: {
    table: 'notifications',
    fields: [
      'title',
      'message',
      'type',
      'entity_type',
      'entity_id',
      'read_at',
      'due_at',
      'dedupe_key',
    ],
    orderBy: { column: 'created_at', ascending: false },
  },
  ai_conversations: {
    table: 'ai_conversations',
    fields: ['title', 'model'],
    orderBy: { column: 'updated_at', ascending: false },
  },
};

export const isResourceName = (value: string): value is ResourceName =>
  Object.prototype.hasOwnProperty.call(RESOURCE_DEFINITIONS, value);
