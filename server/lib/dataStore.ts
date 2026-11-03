import { config } from '../config.js';
import type { AuthContext } from '../middleware/auth.js';
import { StoreError } from './localDb.js';
import {
  addLocalMessage,
  createLocalResource,
  deleteLocalResource,
  deleteLocalUser,
  getDb,
  getLocalBootstrap,
  getLocalMessages,
  getLocalProfile,
  touchLocalConversation,
  updateLocalProfile,
  updateLocalResource,
} from './localDb.js';
import { SupabaseStore } from './supabaseStore.js';
import type { ResourceName } from './resources.js';

export interface DataStore {
  getProfile(userId: string): Promise<Record<string, any>>;
  updateProfile(userId: string, values: Record<string, any>): Promise<Record<string, any>>;
  getBootstrap(userId: string): Promise<Record<string, any>>;
  createResource(resource: ResourceName, userId: string, values: Record<string, any>): Promise<Record<string, any>>;
  updateResource(resource: ResourceName, id: string, userId: string, values: Record<string, any>): Promise<Record<string, any>>;
  deleteResource(resource: ResourceName, id: string, userId: string): Promise<void>;
  getMessages(userId: string, conversationId: string): Promise<Array<Record<string, any>>>;
  getConversation(userId: string, conversationId: string): Promise<Record<string, any> | null>;
  addMessage(userId: string, conversationId: string, role: 'user' | 'assistant', content: string): Promise<Record<string, any>>;
  touchConversation(userId: string, conversationId: string, title?: string): Promise<void>;
  deleteAccount(userId: string): Promise<void>;
}

export function getDataStore(auth: AuthContext): DataStore {
  if (config.local.enabled) {
    const userId = auth.userId;
    return {
      getProfile: async () => {
        const row = getLocalProfile(userId);
        if (!row) throw new StoreError(404, 'Profile not found.', 'PROFILE_NOT_FOUND');
        return row;
      },
      updateProfile: async (userId, values) => {
        const row = updateLocalProfile(userId, values);
        if (!row) throw new StoreError(404, 'Profile not found.', 'PROFILE_NOT_FOUND');
        return row;
      },
      getBootstrap: async () => getLocalBootstrap(userId),
      createResource: async (resource, createUserId, values) => {
        if (createUserId !== userId) throw new StoreError(403, 'You cannot create records for another user.', 'FORBIDDEN');
        return createLocalResource(resource, userId, values);
      },
      updateResource: async (resource, id, updateUserId, values) => {
        if (updateUserId !== userId) throw new StoreError(403, 'You cannot update records for another user.', 'FORBIDDEN');
        return updateLocalResource(resource, id, updateUserId, values);
      },
      deleteResource: async (resource, id, deleteUserId) => {
        if (deleteUserId !== userId) throw new StoreError(403, 'You cannot delete records for another user.', 'FORBIDDEN');
        deleteLocalResource(resource, id, deleteUserId);
      },
      getMessages: async (userId, conversationId) => getLocalMessages(userId, conversationId),
      getConversation: async (_userId, conversationId) => {
        const row = getDb()
          .prepare('SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?')
          .get(conversationId, userId);
        return (row ?? null) as Record<string, any> | null;
      },
      addMessage: async (userId, conversationId, role, content) => addLocalMessage(userId, conversationId, role, content),
      touchConversation: async (userId, conversationId, title) => touchLocalConversation(userId, conversationId, title),
      deleteAccount: async () => deleteLocalUser(userId),
    };
  }

  const store = new SupabaseStore(auth.accessToken!);
  return {
    getProfile: (userId) => store.getProfile(userId),
    updateProfile: (userId, values) => store.updateProfile(userId, values),
    getBootstrap: (userId) => store.getBootstrap(userId),
    createResource: (resource, userId, values) => store.createResource(resource, userId, values),
    updateResource: (resource, id, userId, values) => store.updateResource(resource, id, userId, values),
    deleteResource: (resource, id, userId) => store.deleteResource(resource, id, userId),
    getMessages: (userId, conversationId) => store.getMessages(userId, conversationId),
    getConversation: (userId, conversationId) =>
      store.getConversation(userId, conversationId),
    addMessage: (userId, conversationId, role, content) => store.addMessage(userId, conversationId, role, content),
    touchConversation: (userId, conversationId, title) => store.touchConversation(userId, conversationId, title),
    deleteAccount: (userId) => store.deleteAccount(userId),
  };
}
