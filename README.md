# LifeOS

LifeOS is a full-stack personal productivity operating system. It combines task management, calendar, habits, notes, journaling, finance tracking, analytics, reminders, and a server-connected AI assistant in a responsive React application backed by an Express API and Supabase.

## Feature summary

- **Dashboard:** personalized greeting, task completion, upcoming events, habit progress, weekly productivity chart, recent notes, spending snapshot, quick actions, and customizable widgets.
- **Tasks:** create, read, update, delete, complete, search, filter, sort, and group tasks. Includes categories, priorities, due dates, statuses, subtasks, tags, overdue handling, and recurring tasks.
- **Calendar:** month, week, and day views; create, edit, delete, and select events; task due-date display; navigation and today actions.
- **Habits:** create habits, mark daily completion, calculate streaks, weekly progress, and consistency history.
- **Notes and journal:** create, edit, delete, search, pin, categorize notes; daily journal with mood, private reflections, and autosave.
- **Finance:** record income and expenses, categories, dates, payment methods, budgets, savings goals, balances, and charts. Amounts are user-entered personal estimates and are not banking or payment records.
- **AI assistant:** conversational assistant with history, context from the user’s real tasks/habits/events, planning and prioritization support, and provider setup instructions. It does not claim to perform actions.
- **Notifications:** in-app notification center, reminder preferences, and browser notification permission handling.
- **Analytics:** real task, habit, finance, and budget summaries across daily, weekly, and monthly views.
- **Settings:** profile editing, avatar upload/selection, timezone, date format, currency, theme, notifications, security, and account deletion.
- **Auth:** local development auth fallback or Supabase authentication with protected user-scoped data.

## Tech stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, React Router.
- Backend: Node.js, Express, Zod, Supabase client, OpenAI-compatible AI provider.
- Database: Supabase PostgreSQL with Row Level Security.
- Local development fallback: SQLite via Node’s built-in SQLite support.

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- Supabase project for production-style authentication and PostgreSQL data
- AI provider key for the assistant, optional for local productivity-only mode

## Quick start

```bash
cd /public/lifeos
npm install
cp .env.example .env
npm run dev
```

The development setup runs:

- Frontend: `http://localhost:5173`
- API: `http://localhost:4000`

Vite proxies `/api` to the Express server during development.

## Environment variables

Copy `.env.example` to `.env`.

### Required for Supabase production-style mode

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The URL and anon key are safe for browser use. The service role key must only be set on the server.

### AI assistant

```bash
AI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

The AI provider must expose an OpenAI-compatible `/chat/completions` endpoint.

### Server

```bash
PORT=4000
NODE_ENV=development
LOCAL_AUTH_SECRET=change-me-to-a-long-random-string
APP_ORIGIN=
```

`LOCAL_AUTH_SECRET` is used only when Supabase is not configured for local development.

### Frontend optional

```bash
VITE_API_BASE_URL=
```

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/migrations/20260201000000_lifeos_schema.sql` in the Supabase SQL editor.
3. Confirm the migration creates tables, foreign keys, indexes, triggers, and RLS policies.
4. Configure authentication providers, especially email/password.
5. Disable email confirmation if immediate sign-in is desired, or configure a confirmation email flow.
6. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`.
7. Set `SUPABASE_SERVICE_ROLE_KEY` on the server for account deletion and privileged maintenance.

Core tables:

- `profiles`
- `tasks`
- `subtasks`
- `events`
- `habits`
- `habit_logs`
- `notes`
- `journal_entries`
- `transactions`
- `budgets`
- `savings_goals`
- `notifications`
- `ai_conversations`
- `ai_messages`

All personal data tables include user ownership and authenticated Row Level Security policies.

## AI setup

1. Choose an OpenAI-compatible provider.
2. Set `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL`.
3. Restart the API.
4. The assistant status endpoint is `GET /api/ai/status`.
5. If no key is configured, the UI shows a friendly setup state and non-AI productivity features remain available.

## Local development fallback

If Supabase variables are absent, LifeOS uses a local SQLite fallback with local email/password auth. This is intended for local development and demos. Production should use Supabase.

## Development

```bash
npm run dev
```

This runs the API and Vite frontend concurrently.

Individual commands:

```bash
npm run dev:web
npm run dev:server
npm run typecheck
npm run build
npm run start
npm run preview
```

## Production

```bash
npm run build
npm start
```

The Express server serves the built frontend from `dist` and exposes the API under `/api`.

## API overview

- `GET /api/health`
- `GET /api/auth/config`
- Local auth routes: `/api/auth/local/signup`, `/api/auth/local/signin`, `/api/auth/local/session`, `/api/auth/local/logout`
- Local password route: `POST /api/auth/change`
- Profile: `GET /api/profile`, `PATCH /api/profile`
- Bootstrap: `GET /api/bootstrap`
- Generic data: `POST /api/data/:resource`, `PATCH /api/data/:resource/:id`, `DELETE /api/data/:resource/:id`
- AI: `GET /api/ai/status`, `POST /api/ai/conversations`, `GET /api/ai/conversations/:id/messages`, `POST /api/ai/chat`
- Account: `DELETE /api/account`, `POST /api/account/password`

## Security notes

- Server-side AI calls use server-only environment variables.
- Supabase service role key is never exposed to the frontend.
- API requests use bearer token verification.
- Personal records are user-scoped and protected by Supabase RLS in production.
- Inputs are validated with Zod.
- Destructive account deletion uses an explicit confirmation phrase.

## Deployment notes

- Build the frontend and backend as shown above.
- Provide production environment variables.
- Run the API and serve the static build.
- Configure Supabase redirect URLs for production.
- Configure AI provider credentials.
- Use HTTPS in production.

## Deploying to Netlify

The repo includes a `netlify.toml` at the project root (`/public/lifeos/netlify.toml`).

1. Create a new site on Netlify from the Git repository.
2. Set the base directory to the folder containing `package.json` (i.e. `/public/lifeos` if your repository root is the parent directory, or the repository root itself if the project is the root).
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Node version: `20`
6. Replace `https://YOUR_API_HOST` in the `/api/*` proxy redirect with your deployed API URL (e.g. Render, Railway, or Fly.io backend).
7. Deploy.

The included redirects handle:

- `/api/*` → proxy to the deployed backend (rewrite with `status = 200`).
- `/*` → SPA fallback to `/index.html`.

Note: Netlify is static hosting + serverless. The Express API itself must run continuously on a persistent host (Render, Railway, Fly.io, etc.). The Netlify deploy only hosts the frontend; the `/api` proxy points at that running backend.

## Deploying the backend to Render

The repo includes a `render.yaml` blueprint at the project root (`/public/lifeos/render.yaml`).

1. Push the repository to GitHub/GitLab.
2. In Render: New → Blueprint, select the repo.
3. Render reads `render.yaml` and creates the `lifeos-api` web service.
4. Build: `npm run build`, Start: `npm run start`, Health check: `/api/health`.
5. Set any secret environment variables when prompted (Supabase, AI, etc.).
6. Deploy.

The service binds to the port Render assigns (`PORT`, default 10000) and serves both the API and the built frontend from `dist`.

## Current limitations

- The local fallback database is SQLite for development.
- Production data and auth should use Supabase PostgreSQL.
- AI provider must be OpenAI-compatible.
- Browser notifications are best-effort and depend on browser support.
