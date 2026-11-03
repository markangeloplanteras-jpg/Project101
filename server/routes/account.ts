import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { StoreError, deleteLocalUser } from '../lib/localDb.js';
import { changeLocalPassword } from '../lib/localAuth.js';
import { SupabaseStore } from '../lib/supabaseStore.js';

export const accountRouter = Router();

const deleteAccountSchema = z.object({ confirmation: z.literal('DELETE_MY_ACCOUNT') }).strict();

accountRouter.delete('/', requireAuth, async (req, res, next: NextFunction) => {
  const auth = req.auth;
  if (!auth) {
    return res.status(401).json({ error: { message: 'Authentication is required.', code: 'AUTH_REQUIRED' } });
  }
  try {
    if (auth.mode === 'local') {
      deleteLocalUser(auth.userId);
      return res.json({ ok: true });
    }
    const store = new SupabaseStore(auth.accessToken!);
    await store.deleteAccount(auth.userId);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

accountRouter.post('/password', requireAuth, async (req, res, next: NextFunction) => {
  const auth = req.auth;
  const parsed = z
    .object({
      currentPassword: z.string().min(1).max(100),
      newPassword: z.string().min(8).max(100),
    })
    .strict()
    .parse(req.body);

  if (!auth) {
    return res.status(401).json({ error: { message: 'Authentication is required.', code: 'AUTH_REQUIRED' } });
  }
  if (auth.mode !== 'local') {
    return res.status(501).json({ error: { message: 'Use the password settings from your authentication provider for this account.', code: 'LOCAL_PASSWORD_UNSUPPORTED' } });
  }
  try {
    await changeLocalPassword(auth.userId, parsed.currentPassword, parsed.newPassword);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});
