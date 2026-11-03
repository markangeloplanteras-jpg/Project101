import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { getDb } from './lib/localDb.js';
import { requireAuth } from './middleware/auth.js';
import { getDataStore } from './lib/dataStore.js';
import { StoreError } from './lib/localDb.js';
import { AIServiceError } from './services/ai';
import { ZodError } from 'zod';
import { authRouter, passwordRouter } from './routes/auth';
import { accountRouter } from './routes/account';
import { profileRouter } from './routes/profile';
import dataRouter from './routes/data';
import aiRouter from './routes/ai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.disable('x-powered-by');
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed =
        !origin ||
        config.appOrigins.includes(origin) ||
        config.appOrigins.some((allowedOrigin) => origin.startsWith(`${allowedOrigin}/`)) ||
        ['localhost:5173', 'localhost:4000', 'localhost'].includes(origin);
      callback(null, allowed);
    },
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['content-type', 'authorization', 'x-client-info'],
  }),
);

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  ...(config.supabase.url ? [`${config.supabase.url}*`] : []),
  ...config.appOrigins,
  'https://api.openai.com',
];
if (config.isProduction) {
  csp.push("object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'");
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", ...(config.supabase.url ? [`${config.supabase.url}*`] : []), ...config.appOrigins, 'https://api.openai.com'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'lifeos-api',
    timestamp: new Date().toISOString(),
    supabase: config.supabase.configured,
    ai: config.ai.configured,
  });
});

app.use('/api/auth', authRouter);
app.use('/api/account', accountRouter);
app.use('/api/profile', profileRouter);
app.use('/api/data', dataRouter);
app.use('/api/ai', aiRouter);

app.get('/api/bootstrap', requireAuth, async (req, res, next) => {
  try {
    const store = getDataStore(req.auth!);
    const data = await store.getBootstrap(req.auth!.userId);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: { message: 'Not found.', code: 'NOT_FOUND' } });
});

app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = error?.status || error?.statusCode || 500;
  const code = error?.code || 'INTERNAL_ERROR';
  const message = error instanceof ZodError ? error.issues[0]?.message || 'The submitted data is invalid.' : error?.message || 'LifeOS could not process the request.';
  if (status >= 500) console.error('[LifeOS API Error]', error);
  return res.status(status).json({ error: { message, code } });
});

if (config.local.enabled) {
  getDb();
}

const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`[LifeOS] API listening on http://localhost:${config.port}`);
});

export { app, server };
