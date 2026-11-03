import 'dotenv/config';
import path from 'node:path';

const bool = (value: string | undefined) => value?.toLowerCase() === 'true';
const trim = (value: string | undefined) => value?.trim() || '';

const supabaseUrl = trim(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
const supabaseAnonKey = trim(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);
const supabaseServiceRoleKey = trim(process.env.SUPABASE_SERVICE_ROLE_KEY);

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  appOrigins: trim(process.env.APP_ORIGIN)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    serviceRoleKey: supabaseServiceRoleKey,
    configured: Boolean(supabaseUrl && supabaseAnonKey),
  },
  ai: {
    apiKey: trim(process.env.AI_API_KEY),
    baseUrl: (trim(process.env.AI_BASE_URL) || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: trim(process.env.AI_MODEL) || 'gpt-4o-mini',
    get configured() {
      return Boolean(this.apiKey);
    },
  },
  local: {
    authSecret:
      trim(process.env.LOCAL_AUTH_SECRET) ||
      (process.env.NODE_ENV === 'production' ? '' : 'lifeos-local-development-secret-do-not-use-in-production'),
    dbPath: path.resolve(process.cwd(), trim(process.env.LOCAL_DB_PATH) || 'data/lifeos.db'),
    enabled: !(supabaseUrl && supabaseAnonKey),
  },
  isProduction: process.env.NODE_ENV === 'production',
  trustProxy: bool(process.env.TRUST_PROXY),
};

if (config.isProduction && config.local.enabled && !config.local.authSecret) {
  throw new Error(
    'Missing LOCAL_AUTH_SECRET. Set up Supabase (recommended) or provide a long random LOCAL_AUTH_SECRET for local auth.',
  );
}

if (config.local.enabled) {
  console.warn(
    '[LifeOS] Supabase is not configured. Using the local SQLite development fallback.\n' +
      '         Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for production auth and data.',
  );
}
