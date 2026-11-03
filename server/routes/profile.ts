import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDataStore } from '../lib/dataStore.js';
import { profileUpdateSchema } from '../lib/validation.js';
import { serializeProfile } from '../lib/profile.js';

export const profileRouter = Router();

profileRouter.get('/', requireAuth, async (req, res, next: NextFunction) => {
  try {
    const store = getDataStore(req.auth!);
    const row = await store.getProfile(req.auth!.userId);
    return res.json({ data: serializeProfile(row) });
  } catch (error) {
    return next(error);
  }
});

profileRouter.patch('/', requireAuth, async (req, res, next: NextFunction) => {
  try {
    const parsed = profileUpdateSchema.parse(req.body);
    const store = getDataStore(req.auth!);
    const row = await store.updateProfile(req.auth!.userId, parsed as Record<string, any>);
    return res.json({ data: serializeProfile(row) });
  } catch (error) {
    return next(error);
  }
});
