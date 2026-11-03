import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null;

const tokenKey = 'lifeos.local.token';

export function getLocalToken(): string | null {
  try {
    return localStorage.getItem(tokenKey);
  } catch {
    return null;
  }
}

export function setLocalToken(token: string | null) {
  try {
    if (token) localStorage.setItem(tokenKey, token);
    else localStorage.removeItem(tokenKey);
  } catch {
    /* Storage may be unavailable in private browsing modes. */
  }
}

export async function getAuthToken(): Promise<string | null> {
  if (!supabase) return getLocalToken();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? getLocalToken();
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function requestApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const raw = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = raw?.error;
    throw new ApiError(response.status, error?.message || 'LifeOS could not complete this action.', error?.code);
  }
  return raw as T;
}

export const api = {
  get: async <T>(path: string) => requestApi<T>(path),
  post: async <T>(path: string, body?: unknown) => requestApi<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: async <T>(path: string, body?: unknown) => requestApi<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: async <T>(path: string) => requestApi<T>(path, { method: 'DELETE' }),
};

export interface AIStatusResponse {
  data: {
    configured: boolean;
    model: string;
    provider: string | null;
    baseUrl: string | null;
  };
}

export interface AIConversationResponse {
  data: { id: string; title: string; model: string | null; created_at: string; updated_at: string };
}

export interface AIConversationMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export const authApi = {
  config: () => api.get<{ mode: 'local' | 'supabase'; authMode: 'local' | 'supabase'; aiConfigured: AIStatusResponse['data'] }>('/api/auth/config'),
  localSignup: (email: string, password: string, fullName: string) =>
    api.post<{ user: { id: string; email: string; full_name?: string }; token: string; profile: never }>('/api/auth/local/signup', { email, password, full_name: fullName }),
  localSignin: (email: string, password: string) =>
    api.post<{ user: { id: string; email: string; full_name?: string }; token: string; profile: never }>('/api/auth/local/signin', { email, password }),
  localSession: () => api.get<{ user: { id: string; email: string; full_name?: string }; profile: never }>('/api/auth/local/session'),
  localLogout: () => api.post<{ ok: boolean }>('/api/auth/local/logout'),
  changeLocalPassword: (currentPassword: string, newPassword: string) =>
    api.post<{ ok: boolean }>('/api/auth/change', { currentPassword, newPassword }),
};

export interface BootstrapResponse {
  data: import('../types').BootstrapData;
}

export const bootstrapApi = {
  get: () => api.get<BootstrapResponse>('/api/bootstrap'),
};

export interface ProfileResponse {
  data: import('../types').Profile;
}

export const profileApi = {
  get: () => api.get<ProfileResponse>('/api/profile'),
  update: (values: Record<string, unknown>) => api.patch<ProfileResponse>('/api/profile', values),
};

export const dataApi = {
  create: async <T>(resource: string, values: Record<string, unknown>): Promise<T> => (await api.post<{ data: T }>(`/api/data/${resource}`, values)).data,
  update: async <T>(resource: string, id: string, values: Record<string, unknown>): Promise<T> => (await api.patch<{ data: T }>(`/api/data/${resource}/${id}`, values)).data,
  remove: async (resource: string, id: string) => (await api.delete<{ data: { id: string } }>(`/api/data/${resource}/${id}`)).data,
};

export const aiApi = {
  status: () => api.get<AIStatusResponse>('/api/ai/status'),
  createConversation: (title: string) => api.post<AIConversationResponse>('/api/ai/conversations', { title }),
  getMessages: (conversationId: string) => api.get<{ data: AIConversationMessage[] }>(`/api/ai/conversations/${conversationId}/messages`).then((response) => response.data),
  chat: (conversationId: string | null, message: string, context: Record<string, unknown>) =>
    api.post<{
      data: {
        conversation: AIConversationResponse['data'];
        userMessage: AIConversationMessage;
        assistantMessage: AIConversationMessage;
      };
    }>('/api/ai/chat', {
      conversationId,
      message,
      context,
    }),
};

export const accountApi = {
  delete: () => api.delete<{ ok: boolean }>('/api/account'),
  changePassword: (currentPassword: string, newPassword: string) => api.post<{ ok: boolean }>('/api/account/password', { currentPassword, newPassword }),
};
