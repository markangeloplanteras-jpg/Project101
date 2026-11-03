import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import type { ResourceDefinition, ResourceName } from './resources.js';
import { RESOURCE_DEFINITIONS } from './resources.js';

export class StoreError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = 'STORE_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let database: DatabaseSync | null = null;

const now = () => new Date().toISOString();

const BOOLEAN_FIELDS = new Set([
  'completed',
  'archived',
  'is_pinned',
  'all_day',
]);

const JSON_FIELDS = new Set(['tags', 'days_of_week', 'dashboard_widgets', 'notification_preferences']);
const NUMBER_FIELDS = new Set([
  'amount',
  'amount_limit',
  'target_amount',
  'current_amount',
  'target_per_week',
  'reminder_minutes',
  'week_starts_on',
]);

function ensureDirectory(filePath: string) {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

export function getDb(): DatabaseSync {
  if (database) return database;
  ensureDirectory(config.local.dbPath);
  database = new DatabaseSync(config.local.dbPath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      full_name TEXT NOT NULL DEFAULT '',
      avatar_url TEXT,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      date_format TEXT NOT NULL DEFAULT 'MMM d, yyyy',
      currency TEXT NOT NULL DEFAULT 'USD',
      theme TEXT NOT NULL DEFAULT 'dark',
      week_starts_on INTEGER NOT NULL DEFAULT 0,
      dashboard_widgets TEXT NOT NULL DEFAULT '{}',
      notification_preferences TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'General',
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'todo',
      due_date TEXT,
      recurrence TEXT NOT NULL DEFAULT 'none',
      tags TEXT NOT NULL DEFAULT '[]',
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      all_day INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'Personal',
      color TEXT NOT NULL DEFAULT '#7857f6',
      location TEXT NOT NULL DEFAULT '',
      reminder_minutes INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT 'sparkles',
      color TEXT NOT NULL DEFAULT '#7857f6',
      frequency TEXT NOT NULL DEFAULT 'daily',
      days_of_week TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
      target_per_week INTEGER NOT NULL DEFAULT 7,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      completed_on TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, habit_id, completed_on)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'Untitled note',
      content TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'General',
      is_pinned INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '#7857f6',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      entry_date TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      mood TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, entry_date)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      category TEXT NOT NULL DEFAULT 'Other',
      description TEXT NOT NULL DEFAULT '',
      transaction_date TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Other',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      amount_limit REAL NOT NULL CHECK(amount_limit > 0),
      period_month TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, category, period_month)
    );

    CREATE TABLE IF NOT EXISTS savings_goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL CHECK(target_amount > 0),
      current_amount REAL NOT NULL DEFAULT 0 CHECK(current_amount >= 0),
      target_date TEXT,
      color TEXT NOT NULL DEFAULT '#7857f6',
      icon TEXT NOT NULL DEFAULT 'target',
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'system',
      entity_type TEXT,
      entity_id TEXT,
      read_at TEXT,
      due_at TEXT NOT NULL,
      dedupe_key TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'New conversation',
      model TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      conversation_id TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON tasks(user_id, due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
    CREATE INDEX IF NOT EXISTS idx_events_user_start ON events(user_id, start_at);
    CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
    CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date ON habit_logs(habit_id, completed_on);
    CREATE INDEX IF NOT EXISTS idx_notes_user_updated ON notes(user_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journal_entries(user_id, entry_date);
    CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date);
    CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, period_month);
    CREATE INDEX IF NOT EXISTS idx_goals_user ON savings_goals(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe ON notifications(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON ai_conversations(user_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON ai_messages(conversation_id, created_at);
  `);
  return database;
}

type Row = Record<string, any>;

export function mapRow(row: Row): Row {
  if (!row) return row;
  const result: Row = { ...row };
  for (const [key, value] of Object.entries(result)) {
    if (JSON_FIELDS.has(key) && typeof value === 'string') {
      try {
        result[key] = JSON.parse(value);
      } catch {
        result[key] = key === 'days_of_week' ? [] : {};
      }
    } else if (BOOLEAN_FIELDS.has(key) && (value === 0 || value === 1)) {
      result[key] = Boolean(value);
    } else if (NUMBER_FIELDS.has(key) && value !== null && value !== undefined) {
      result[key] = Number(value);
    }
  }
  return result;
}

function serializeValue(key: string, value: unknown): unknown {
  if (value === undefined) return null;
  if (JSON_FIELDS.has(key)) return JSON.stringify(value ?? (key === 'days_of_week' ? [] : {}));
  if (BOOLEAN_FIELDS.has(key)) return value ? 1 : 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

function selectAll(table: string, userId: string, definition?: ResourceDefinition): Row[] {
  const order = definition?.orderBy;
  const sql = `SELECT * FROM ${table} WHERE ${
    table === 'profiles' ? 'id' : 'user_id'
  } = ?${order ? ` ORDER BY ${order.column} ${order.ascending ? 'ASC' : 'DESC'}` : ''}`;
  const rows = getDb().prepare(sql).all(userId) as Row[];
  return rows.map(mapRow);
}

export function getLocalProfile(userId: string): Row | null {
  const row = getDb().prepare('SELECT * FROM profiles WHERE id = ?').get(userId) as Row | undefined;
  return row ? mapRow(row) : null;
}

export function getLocalBootstrap(userId: string) {
  const profile = getLocalProfile(userId);
  if (!profile) throw new StoreError(404, 'Profile not found', 'PROFILE_NOT_FOUND');
  const get = (resource: ResourceName) =>
    selectAll(RESOURCE_DEFINITIONS[resource].table, userId, RESOURCE_DEFINITIONS[resource]);
  return {
    profile,
    tasks: get('tasks'),
    subtasks: get('subtasks'),
    events: get('events'),
    habits: get('habits'),
    habitLogs: get('habit_logs'),
    notes: get('notes'),
    journalEntries: get('journal_entries'),
    transactions: get('transactions'),
    budgets: get('budgets'),
    savingsGoals: get('savings_goals'),
    notifications: get('notifications'),
    aiConversations: get('ai_conversations'),
  };
}

export function updateLocalProfile(userId: string, values: Row): Row {
  const allowed = [
    'full_name',
    'avatar_url',
    'timezone',
    'date_format',
    'currency',
    'theme',
    'week_starts_on',
    'dashboard_widgets',
    'notification_preferences',
  ];
  const entries = Object.entries(values).filter(([key, value]) => allowed.includes(key) && value !== undefined);
  if (!entries.length) return getLocalProfile(userId) as Row;
  const sets = entries.map(([key]) => `${key} = ?`).join(', ');
  const params = entries.map(([key, value]) => serializeValue(key, value));
  getDb()
    .prepare(`UPDATE profiles SET ${sets}, updated_at = ? WHERE id = ?`)
    .run(...(params as never[]), now(), userId);
  const profile = getLocalProfile(userId);
  if (!profile) throw new StoreError(404, 'Profile not found', 'PROFILE_NOT_FOUND');
  return profile;
}

export function resourceIsOwned(resource: ResourceName, id: string, userId: string): boolean {
  const definition = RESOURCE_DEFINITIONS[resource];
  const row = getDb()
    .prepare(`SELECT id FROM ${definition.table} WHERE id = ? AND user_id = ?`)
    .get(id, userId);
  return Boolean(row);
}

export function createLocalResource(resource: ResourceName, userId: string, values: Row): Row {
  const definition = RESOURCE_DEFINITIONS[resource];
  const id = crypto.randomUUID();
  const createdAt = now();
  const payload: Row = {
    id,
    user_id: userId,
    ...values,
    created_at: createdAt,
    updated_at: createdAt,
  };
  const columns = Object.keys(payload).filter((key) => payload[key] !== undefined);
  const placeholders = columns.map(() => '?').join(', ');
  try {
    getDb()
      .prepare(
        `INSERT INTO ${definition.table} (${columns.join(', ')}) VALUES (${placeholders})`,
      )
      .run(...(columns.map((key) => serializeValue(key, payload[key])) as never[]));
  } catch (error) {
    throw translateSqliteError(error);
  }
  const row = getDb()
    .prepare(`SELECT * FROM ${definition.table} WHERE id = ? AND user_id = ?`)
    .get(id, userId) as Row;
  return mapRow(row);
}

export function updateLocalResource(
  resource: ResourceName,
  id: string,
  userId: string,
  values: Row,
): Row {
  const definition = RESOURCE_DEFINITIONS[resource];
  if (!resourceIsOwned(resource, id, userId)) {
    throw new StoreError(404, 'Record not found', 'NOT_FOUND');
  }
  const entries = Object.entries(values).filter(
    ([key, value]) => definition.fields.includes(key) && value !== undefined,
  );
  if (entries.length) {
    const sets = entries.map(([key]) => `${key} = ?`).join(', ');
    const params = entries.map(([key, value]) => serializeValue(key, value));
    try {
      getDb()
        .prepare(`UPDATE ${definition.table} SET ${sets}, updated_at = ? WHERE id = ? AND user_id = ?`)
        .run(...(params as never[]), now(), id, userId);
    } catch (error) {
      throw translateSqliteError(error);
    }
  }
  const row = getDb()
    .prepare(`SELECT * FROM ${definition.table} WHERE id = ? AND user_id = ?`)
    .get(id, userId) as Row;
  return mapRow(row);
}

export function deleteLocalResource(resource: ResourceName, id: string, userId: string): void {
  const definition = RESOURCE_DEFINITIONS[resource];
  const result = getDb()
    .prepare(`DELETE FROM ${definition.table} WHERE id = ? AND user_id = ?`)
    .run(id, userId);
  if (Number(result.changes) === 0) {
    throw new StoreError(404, 'Record not found', 'NOT_FOUND');
  }
}

export function getLocalMessages(userId: string, conversationId: string): Row[] {
  const conversation = getDb()
    .prepare('SELECT id FROM ai_conversations WHERE id = ? AND user_id = ?')
    .get(conversationId, userId);
  if (!conversation) throw new StoreError(404, 'Conversation not found', 'NOT_FOUND');
  const rows = getDb()
    .prepare('SELECT * FROM ai_messages WHERE conversation_id = ? AND user_id = ? ORDER BY created_at ASC')
    .all(conversationId, userId) as Row[];
  return rows.map(mapRow);
}

export function addLocalMessage(
  userId: string,
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
): Row {
  const owned = getDb()
    .prepare('SELECT id FROM ai_conversations WHERE id = ? AND user_id = ?')
    .get(conversationId, userId);
  if (!owned) throw new StoreError(404, 'Conversation not found', 'NOT_FOUND');
  const id = crypto.randomUUID();
  const createdAt = now();
  getDb()
    .prepare(
      'INSERT INTO ai_messages (id, user_id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(id, userId, conversationId, role, content, createdAt);
  getDb().prepare('UPDATE ai_conversations SET updated_at = ? WHERE id = ?').run(createdAt, conversationId);
  const row = getDb().prepare('SELECT * FROM ai_messages WHERE id = ?').get(id) as Row;
  return mapRow(row);
}

export function touchLocalConversation(userId: string, conversationId: string, title?: string): void {
  if (title) {
    getDb()
      .prepare('UPDATE ai_conversations SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?')
      .run(title, now(), conversationId, userId);
  } else {
    getDb()
      .prepare('UPDATE ai_conversations SET updated_at = ? WHERE id = ? AND user_id = ?')
      .run(now(), conversationId, userId);
  }
}

export function deleteLocalUser(userId: string): void {
  getDb().prepare('DELETE FROM users WHERE id = ?').run(userId);
}

function translateSqliteError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('UNIQUE constraint failed')) {
    if (message.includes('habit_logs')) {
      return new StoreError(409, 'This habit is already completed for that date.', 'DUPLICATE');
    }
    if (message.includes('journal_entries')) {
      return new StoreError(409, 'A journal entry already exists for this date.', 'DUPLICATE');
    }
    if (message.includes('budgets')) {
      return new StoreError(409, 'A budget for this category and month already exists.', 'DUPLICATE');
    }
    if (message.includes('notifications')) {
      return new StoreError(409, 'Notification already exists.', 'DUPLICATE');
    }
    return new StoreError(409, 'This record already exists.', 'DUPLICATE');
  }
  if (message.includes('FOREIGN KEY constraint failed')) {
    return new StoreError(400, 'A related record does not exist.', 'INVALID_REFERENCE');
  }
  if (message.includes('CHECK constraint failed')) {
    return new StoreError(400, 'The record contains an invalid value.', 'INVALID_VALUE');
  }
  return new StoreError(500, 'The database operation could not be completed.', 'DATABASE_ERROR');
}
