import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { getDb, getLocalProfile, StoreError } from './localDb.js';

export interface LocalAuthUser {
  id: string;
  email: string;
  full_name?: string;
}

interface LocalUserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

const DEFAULT_WIDGETS = JSON.stringify({
  stats: true,
  taskFocus: true,
  habits: true,
  upcoming: true,
  productivity: true,
  spending: true,
  notes: true,
  quickActions: true,
});

const DEFAULT_NOTIFICATIONS = JSON.stringify({
  taskReminders: true,
  eventReminders: true,
  habitReminders: true,
  browserNotifications: false,
});

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function createLocalUser(email: string, password: string, fullName: string): Promise<LocalAuthUser> {
  const normalizedEmail = normalizeEmail(email);
  const existing = getDb().prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    throw new StoreError(409, 'An account with this email already exists.', 'EMAIL_IN_USE');
  }
  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);
  const timestamp = new Date().toISOString();

  try {
    getDb()
      .prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
      .run(id, normalizedEmail, passwordHash, timestamp);
    getDb()
      .prepare(
        `INSERT INTO profiles
         (id, email, full_name, avatar_url, timezone, date_format, currency, theme, week_starts_on,
          dashboard_widgets, notification_preferences, created_at, updated_at)
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        normalizedEmail,
        fullName.trim(),
        'UTC',
        'MMM d, yyyy',
        'USD',
        'dark',
        0,
        DEFAULT_WIDGETS,
        DEFAULT_NOTIFICATIONS,
        timestamp,
        timestamp,
      );
  } catch (error) {
    throw new StoreError(500, 'The account could not be created.', 'SIGNUP_FAILED');
  }

  return { id, email: normalizedEmail, full_name: fullName.trim() };
}

export async function authenticateLocalUser(email: string, password: string): Promise<LocalAuthUser> {
  const normalizedEmail = normalizeEmail(email);
  const user = getDb().prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as
    | LocalUserRow
    | undefined;
  if (!user) {
    throw new StoreError(401, 'Incorrect email or password.', 'INVALID_CREDENTIALS');
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new StoreError(401, 'Incorrect email or password.', 'INVALID_CREDENTIALS');
  }
  const profile = getLocalProfile(user.id);
  return { id: user.id, email: user.email, full_name: profile?.full_name };
}

export function signLocalToken(user: LocalAuthUser): string {
  return jwt.sign(
    { sub: user.id, email: user.email, mode: 'local' },
    config.local.authSecret,
    { expiresIn: '7d', issuer: 'lifeos-local', audience: 'lifeos-web' },
  );
}

export function verifyLocalToken(token: string): LocalAuthUser | null {
  try {
    const payload = jwt.verify(token, config.local.authSecret, {
      issuer: 'lifeos-local',
      audience: 'lifeos-web',
    }) as jwt.JwtPayload & { mode?: string; email?: string };
    if (payload.mode !== 'local' || !payload.sub || !payload.email) return null;
    const user = getDb()
      .prepare('SELECT id, email FROM users WHERE id = ?')
      .get(payload.sub) as Pick<LocalUserRow, 'id' | 'email'> | undefined;
    if (!user) return null;
    const profile = getLocalProfile(user.id);
    return { id: user.id, email: user.email, full_name: profile?.full_name };
  } catch {
    return null;
  }
}

export async function changeLocalPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = getDb().prepare('SELECT * FROM users WHERE id = ?').get(userId) as LocalUserRow | undefined;
  if (!user) throw new StoreError(401, 'Your session is no longer valid.', 'SESSION_INVALID');
  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw new StoreError(400, 'Your current password is incorrect.', 'INVALID_PASSWORD');
  const hash = await bcrypt.hash(newPassword, 12);
  getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
}

export function getLocalUser(userId: string): LocalAuthUser | null {
  const user = getDb().prepare('SELECT id, email FROM users WHERE id = ?').get(userId) as
    | Pick<LocalUserRow, 'id' | 'email'>
    | undefined;
  if (!user) return null;
  const profile = getLocalProfile(user.id);
  return { id: user.id, email: user.email, full_name: profile?.full_name };
}
