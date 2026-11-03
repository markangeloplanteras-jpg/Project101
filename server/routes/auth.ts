import { Router, type NextFunction } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { requireLocalAuth } from '../middleware/auth.js';
import {
  authenticateLocalUser,
  createLocalUser,
  signLocalToken,
} from '../lib/localAuth.js';
import { getLocalProfile } from '../lib/localDb.js';
import { serializeProfile } from '../lib/profile.js';

export const authRouter = Router();
export const passwordRouter = Router();

const localSignupSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(100),
  full_name: z.string().trim().max(80).default(''),
}).strict();

const localSigninSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(100),
}).strict();

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(100),
  newPassword: z.string().min(8).max(100),
}).strict();

authRouter.get('/config', (_req, res) => {
  res.json({
    mode: config.local.enabled ? 'local' : 'supabase',
    authMode: config.local.enabled ? 'local' : 'supabase',
    aiConfigured: {
      configured: config.ai.configured,
      model: config.ai.model,
      provider: config.ai.configured ? 'openai-compatible' : null,
    },
  });
});

if (config.local.enabled) {
  authRouter.post('/local/signup', async (req, res, next: NextFunction) => {
    try {
      const parsed = localSignupSchema.parse(req.body);
      if (!/[A-Za-z]/.test(parsed.password) || !/[0-9]/.test(parsed.password)) {
        return res
          .status(400)
          .json({ error: { message: 'Password must include at least one letter and one number.', code: 'INVALID_PASSWORD' } });
      }
      const user = await createLocalUser(parsed.email, parsed.password, parsed.full_name);
      const token = signLocalToken(user);
      const profile = serializeProfile(getLocalProfile(user.id) as never);
      return res.status(201).json({ user, token, profile });
    } catch (error) {
      return next(error);
    }
  });

  authRouter.post('/local/signin', async (req, res, next: NextFunction) => {
    try {
      const parsed = localSigninSchema.parse(req.body);
      const user = await authenticateLocalUser(parsed.email, parsed.password);
      const token = signLocalToken(user);
      const profile = serializeProfile(getLocalProfile(user.id) as never);
      return res.json({ user, token, profile });
    } catch (error) {
      return next(error);
    }
  });

  authRouter.get('/local/session', requireLocalAuth, (req, res) => {
    const user = req.auth;
    if (!user) {
      return res.status(401).json({ error: { message: 'Your session is no longer valid.', code: 'SESSION_INVALID' } });
    }
    const profile = serializeProfile(getLocalProfile(user.userId) as never);
    return res.json({ user, profile });
  });

  authRouter.post('/local/logout', (_req, res) => {
    return res.json({ ok: true });
  });
}

passwordRouter.post('/change', requireLocalAuth, async (req, res, next: NextFunction) => {
  const parsed = passwordChangeSchema.parse(req.body);
  const auth = req.auth;
  if (!auth) {
    return res.status(401).json({ error: { message: 'Authentication is required.', code: 'AUTH_REQUIRED' } });
  }
  try {
    const { changeLocalPassword } = await import('../lib/localAuth.js');
    await changeLocalPassword(auth.userId, parsed.currentPassword, parsed.newPassword);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

export default { authRouter, passwordRouter };
