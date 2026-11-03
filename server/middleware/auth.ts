import type { NextFunction, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import {
  authenticateLocalUser,
  getLocalUser,
  verifyLocalToken,
} from '../lib/localAuth.js';

export interface AuthContext {
  userId: string;
  email: string;
  full_name?: string;
  mode: 'supabase' | 'local';
  accessToken?: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 40 ? token : null;
}

async function resolveSupabaseToken(token: string): Promise<AuthContext | null> {
  const client = createClient(config.supabase.url, config.supabase.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return {
    userId: data.user.id,
    email: data.user.email ?? '',
    mode: 'supabase',
    accessToken: token,
  };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: { message: 'Authentication is required.', code: 'AUTH_REQUIRED' } });
    return;
  }

  if (config.local.enabled) {
    const user = verifyLocalToken(token);
    if (!user) {
      res.status(401).json({ error: { message: 'Your session is no longer valid.', code: 'SESSION_INVALID' } });
      return;
    }
    req.auth = { userId: user.id, email: user.email, full_name: user.full_name, mode: 'local' };
    next();
    return;
  }

  const context = await resolveSupabaseToken(token);
  if (!context) {
    res.status(401).json({ error: { message: 'Your session is no longer valid.', code: 'SESSION_INVALID' } });
    return;
  }
  req.auth = context;
  next();
}

export function requireLocalAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: { message: 'Authentication is required.', code: 'AUTH_REQUIRED' } });
    return;
  }
  const user = verifyLocalToken(token);
  if (!user) {
    res.status(401).json({ error: { message: 'Your session is no longer valid.', code: 'SESSION_INVALID' } });
    return;
  }
  req.auth = { userId: user.id, email: user.email, full_name: user.full_name, mode: 'local' };
  next();
}

export async function getLocalUserForCurrentSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.auth) {
    res.status(401).json({ error: { message: 'Authentication is required.', code: 'AUTH_REQUIRED' } });
    return;
  }
  const user = getLocalUser(req.auth.userId);
  if (!user) {
    res.status(401).json({ error: { message: 'Your account was deleted.', code: 'ACCOUNT_MISSING' } });
    return;
  }
  req.auth = { userId: user.id, email: user.email, full_name: user.full_name, mode: 'local' };
  next();
}

export function optionalAuthContext(req: Request, res: Response, next: NextFunction): void {
  req.auth = undefined;
  next();
}
