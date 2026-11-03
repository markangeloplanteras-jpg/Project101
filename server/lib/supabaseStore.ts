import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { StoreError } from './localDb.js';
import { RESOURCE_DEFINITIONS, type ResourceName } from './resources.js';

export function createScopedSupabaseClient(accessToken: string): SupabaseClient {
  if (!config.supabase.configured) {
    throw new StoreError(503, 'Supabase is not configured.', 'SUPABASE_NOT_CONFIGURED');
  }
  return createClient(config.supabase.url, config.supabase.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

export function createAdminSupabaseClient(): SupabaseClient | null {
  if (!config.supabase.configured || !config.supabase.serviceRoleKey) return null;
  return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

type Row = Record<string, any>;

function translateSupabaseError(error: { code?: string; message?: string; details?: string }): StoreError {
  if (error.code === '23505') {
    return new StoreError(409, 'This record already exists.', 'DUPLICATE');
  }
  if (error.code === '42501' || error.code === 'PGRST301') {
    return new StoreError(403, 'You do not have permission to perform this action.', 'FORBIDDEN');
  }
  if (error.code === 'PGRST116') {
    return new StoreError(404, 'Record not found.', 'NOT_FOUND');
  }
  if (error.code === '23503') {
    return new StoreError(400, 'A related record does not exist.', 'INVALID_REFERENCE');
  }
  if (error.code === '23514') {
    return new StoreError(400, 'The record contains an invalid value.', 'INVALID_VALUE');
  }
  console.error('[supabase]', error.message, error.details);
  return new StoreError(500, 'The database operation could not be completed.', 'DATABASE_ERROR');
}

export class SupabaseStore {
  private client: SupabaseClient;

  constructor(accessToken: string) {
    this.client = createScopedSupabaseClient(accessToken);
  }

  private async fetchRows(table: ResourceName, order?: { column: string; ascending: boolean }): Promise<Row[]> {
    const definition = RESOURCE_DEFINITIONS[table];
    let query = this.client.from(definition.table).select('*').limit(10000);
    if (order) query = query.order(order.column, { ascending: order.ascending });
    const { data, error } = await query;
    if (error) throw translateSupabaseError(error);
    return data ?? [];
  }

  async getProfile(userId: string): Promise<Row> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw translateSupabaseError(error);
    if (!data) {
      throw new StoreError(
        404,
        'Your profile has not been provisioned yet. Check that the LifeOS SQL migration has been applied.',
        'PROFILE_NOT_FOUND',
      );
    }
    return data;
  }

  async updateProfile(userId: string, values: Row): Promise<Row> {
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
    const payload = Object.fromEntries(
      Object.entries(values).filter(([key, value]) => allowed.includes(key) && value !== undefined),
    );
    const { data, error } = await this.client
      .from('profiles')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('*')
      .single();
    if (error) throw translateSupabaseError(error);
    return data;
  }

  async getBootstrap(userId: string) {
    const [
      profile,
      tasks,
      subtasks,
      events,
      habits,
      habitLogs,
      notes,
      journalEntries,
      transactions,
      budgets,
      savingsGoals,
      notifications,
      aiConversations,
    ] = await Promise.all([
      this.getProfile(userId),
      this.fetchRows('tasks', RESOURCE_DEFINITIONS.tasks.orderBy),
      this.fetchRows('subtasks', RESOURCE_DEFINITIONS.subtasks.orderBy),
      this.fetchRows('events', RESOURCE_DEFINITIONS.events.orderBy),
      this.fetchRows('habits', RESOURCE_DEFINITIONS.habits.orderBy),
      this.fetchRows('habit_logs', RESOURCE_DEFINITIONS.habit_logs.orderBy),
      this.fetchRows('notes', RESOURCE_DEFINITIONS.notes.orderBy),
      this.fetchRows('journal_entries', RESOURCE_DEFINITIONS.journal_entries.orderBy),
      this.fetchRows('transactions', RESOURCE_DEFINITIONS.transactions.orderBy),
      this.fetchRows('budgets', RESOURCE_DEFINITIONS.budgets.orderBy),
      this.fetchRows('savings_goals', RESOURCE_DEFINITIONS.savings_goals.orderBy),
      this.fetchRows('notifications', RESOURCE_DEFINITIONS.notifications.orderBy),
      this.fetchRows('ai_conversations', RESOURCE_DEFINITIONS.ai_conversations.orderBy),
    ]);

    return {
      profile,
      tasks,
      subtasks,
      events,
      habits,
      habitLogs,
      notes,
      journalEntries,
      transactions,
      budgets,
      savingsGoals,
      notifications,
      aiConversations,
    };
  }

  async createResource(resource: ResourceName, userId: string, values: Row): Promise<Row> {
    const definition = RESOURCE_DEFINITIONS[resource];
    const { data, error } = await this.client
      .from(definition.table)
      .insert({ ...values, user_id: userId })
      .select('*')
      .single();
    if (error) throw translateSupabaseError(error);
    return data;
  }

  async updateResource(resource: ResourceName, id: string, userId: string, values: Row): Promise<Row> {
    const definition = RESOURCE_DEFINITIONS[resource];
    const payload = Object.fromEntries(
      Object.entries(values).filter(([key, value]) => definition.fields.includes(key) && value !== undefined),
    );
    const { data, error } = await this.client
      .from(definition.table)
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw translateSupabaseError(error);
    return data;
  }

  async deleteResource(resource: ResourceName, id: string, userId: string): Promise<void> {
    const definition = RESOURCE_DEFINITIONS[resource];
    const { error, count } = await this.client
      .from(definition.table)
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw translateSupabaseError(error);
    if (count === 0) throw new StoreError(404, 'Record not found.', 'NOT_FOUND');
  }

  async getConversation(userId: string, conversationId: string): Promise<Record<string, any> | null> {
    const { data, error } = await this.client
      .from('ai_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw translateSupabaseError(error);
    return data ?? null;
  }

  async getMessages(userId: string, conversationId: string): Promise<Row[]> {
    const { data: conversation, error: conversationError } = await this.client
      .from('ai_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();
    if (conversationError) throw translateSupabaseError(conversationError);
    if (!conversation) throw new StoreError(404, 'Conversation not found.', 'NOT_FOUND');
    const { data, error } = await this.client
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) throw translateSupabaseError(error);
    return data ?? [];
  }

  async addMessage(
    userId: string,
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
  ): Promise<Row> {
    const { data, error } = await this.client
      .from('ai_messages')
      .insert({ user_id: userId, conversation_id: conversationId, role, content })
      .select('*')
      .single();
    if (error) throw translateSupabaseError(error);
    await this.client
      .from('ai_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)
      .eq('user_id', userId);
    return data;
  }

  async touchConversation(userId: string, conversationId: string, title?: string): Promise<void> {
    const payload: Row = { updated_at: new Date().toISOString() };
    if (title) payload.title = title;
    const { error } = await this.client
      .from('ai_conversations')
      .update(payload)
      .eq('id', conversationId)
      .eq('user_id', userId);
    if (error) throw translateSupabaseError(error);
  }

  async deleteAccount(userId: string): Promise<void> {
    const admin = createAdminSupabaseClient();
    if (!admin) {
      throw new StoreError(
        503,
        'Account deletion requires SUPABASE_SERVICE_ROLE_KEY on the server. Add it to your environment, then try again.',
        'ADMIN_KEY_REQUIRED',
      );
    }
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      throw new StoreError(500, 'The account could not be deleted. Please try again.', 'ACCOUNT_DELETE_FAILED');
    }
  }
}
