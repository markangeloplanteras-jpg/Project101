create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  avatar_url text,
  timezone text not null default 'UTC',
  date_format text not null default 'MMM d, yyyy',
  currency text not null default 'USD',
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  week_starts_on integer not null default 0 check (week_starts_on between 0 and 6),
  dashboard_widgets jsonb not null default '{"stats":true,"taskFocus":true,"habits":true,"upcoming":true,"productivity":true,"spending":true,"notes":true,"quickActions":true}'::jsonb,
  notification_preferences jsonb not null default '{"taskReminders":true,"eventReminders":true,"habitReminders":true,"browserNotifications":false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_lifeos_updated_at() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set updated_at = now()
  where id = new.id;
  return new;
end;
$$;

create or replace trigger trg_lifeos_profiles_updated
before update on public.profiles
for each row
execute function public.handle_lifeos_updated_at();

create or replace function auth.handle_lifeos_new_user()
returns trigger
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  insert into public.profiles (
    id, email, full_name, avatar_url, timezone, date_format, currency, theme,
    week_starts_on, dashboard_widgets, notification_preferences, created_at, updated_at
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    null,
    'UTC',
    'MMM d, yyyy',
    'USD',
    'dark',
    0,
    '{"stats":true,"taskFocus":true,"habits":true,"upcoming":true,"productivity":true,"spending":true,"notes":true,"quickActions":true}'::jsonb,
    '{"taskReminders":true,"eventReminders":true,"habitReminders":true,"browserNotifications":false}'::jsonb,
    now(),
    now()
  );
  return new;
end;
$$;

create or replace trigger trg_lifeos_auth_new_user
after insert on auth.users
for each row execute function auth.handle_lifeos_new_user();

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default 'General',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'completed')),
  due_date timestamptz,
  recurrence text not null default 'none' check (recurrence in ('none', 'daily', 'weekdays', 'weekly', 'monthly')),
  tags text[] not null default '{}',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  category text not null default 'Personal',
  color text not null default '#7857f6',
  location text not null default '',
  reminder_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  icon text not null default 'sparkles',
  color text not null default '#7857f6',
  frequency text not null default 'daily' check (frequency in ('daily', 'weekly', 'custom')),
  days_of_week integer[] not null default '{0,1,2,3,4,5,6}',
  target_per_week integer not null default 7 check (target_per_week between 1 and 7),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  completed_on date not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, habit_id, completed_on)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Untitled note',
  content text not null default '',
  category text not null default 'General',
  is_pinned boolean not null default false,
  color text not null default '#7857f6',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_date date not null,
  title text not null default '',
  content text not null default '',
  mood text check (mood in ('great', 'good', 'okay', 'low', 'awful')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null check (amount > 0),
  category text not null default 'Other',
  description text not null default '',
  transaction_date date not null,
  payment_method text not null default 'Other',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  amount_limit numeric not null check (amount_limit > 0),
  period_month text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, period_month)
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  target_amount numeric not null check (target_amount > 0),
  current_amount numeric not null default 0 check (current_amount >= 0),
  target_date date,
  color text not null default '#7857f6',
  icon text not null default 'target',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'system',
  entity_type text,
  entity_id text,
  read_at timestamptz,
  due_at timestamptz not null,
  dedupe_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New conversation',
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.subtasks enable row level security;
alter table public.events enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.notes enable row level security;
alter table public.journal_entries enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;
alter table public.notifications enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using (auth.uid() = id);
create policy profiles_insert_own on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy profiles_update_own on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy tasks_select_own on public.tasks for select to authenticated using (auth.uid() = user_id);
create policy tasks_insert_own on public.tasks for insert to authenticated with check (auth.uid() = user_id);
create policy tasks_update_own on public.tasks for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy tasks_delete_own on public.tasks for delete to authenticated using (auth.uid() = user_id);

create policy subtasks_select_own on public.subtasks for select to authenticated using (auth.uid() = user_id);
create policy subtasks_insert_own on public.subtasks for insert to authenticated with check (auth.uid() = user_id);
create policy subtasks_update_own on public.subtasks for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy subtasks_delete_own on public.subtasks for delete to authenticated using (auth.uid() = user_id);

create policy events_select_own on public.events for select to authenticated using (auth.uid() = user_id);
create policy events_insert_own on public.events for insert to authenticated with check (auth.uid() = user_id);
create policy events_update_own on public.events for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy events_delete_own on public.events for delete to authenticated using (auth.uid() = user_id);

create policy habits_select_own on public.habits for select to authenticated using (auth.uid() = user_id);
create policy habits_insert_own on public.habits for insert to authenticated with check (auth.uid() = user_id);
create policy habits_update_own on public.habits for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy habits_delete_own on public.habits for delete to authenticated using (auth.uid() = user_id);

create policy habit_logs_select_own on public.habit_logs for select to authenticated using (auth.uid() = user_id);
create policy habit_logs_insert_own on public.habit_logs for insert to authenticated with check (auth.uid() = user_id);
create policy habit_logs_update_own on public.habit_logs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy habit_logs_delete_own on public.habit_logs for delete to authenticated using (auth.uid() = user_id);

create policy notes_select_own on public.notes for select to authenticated using (auth.uid() = user_id);
create policy notes_insert_own on public.notes for insert to authenticated with check (auth.uid() = user_id);
create policy notes_update_own on public.notes for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy notes_delete_own on public.notes for delete to authenticated using (auth.uid() = user_id);

create policy journal_entries_select_own on public.journal_entries for select to authenticated using (auth.uid() = user_id);
create policy journal_entries_insert_own on public.journal_entries for insert to authenticated with check (auth.uid() = user_id);
create policy journal_entries_update_own on public.journal_entries for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy journal_entries_delete_own on public.journal_entries for delete to authenticated using (auth.uid() = user_id);

create policy transactions_select_own on public.transactions for select to authenticated using (auth.uid() = user_id);
create policy transactions_insert_own on public.transactions for insert to authenticated with check (auth.uid() = user_id);
create policy transactions_update_own on public.transactions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy transactions_delete_own on public.transactions for delete to authenticated using (auth.uid() = user_id);

create policy budgets_select_own on public.budgets for select to authenticated using (auth.uid() = user_id);
create policy budgets_insert_own on public.budgets for insert to authenticated with check (auth.uid() = user_id);
create policy budgets_update_own on public.budgets for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy budgets_delete_own on public.budgets for delete to authenticated using (auth.uid() = user_id);

create policy savings_goals_select_own on public.savings_goals for select to authenticated using (auth.uid() = user_id);
create policy savings_goals_insert_own on public.savings_goals for insert to authenticated with check (auth.uid() = user_id);
create policy savings_goals_update_own on public.savings_goals for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy savings_goals_delete_own on public.savings_goals for delete to authenticated using (auth.uid() = user_id);

create policy notifications_select_own on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy notifications_insert_own on public.notifications for insert to authenticated with check (auth.uid() = user_id);
create policy notifications_update_own on public.notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy notifications_delete_own on public.notifications for delete to authenticated using (auth.uid() = user_id);

create policy ai_conversations_select_own on public.ai_conversations for select to authenticated using (auth.uid() = user_id);
create policy ai_conversations_insert_own on public.ai_conversations for insert to authenticated with check (auth.uid() = user_id);
create policy ai_conversations_update_own on public.ai_conversations for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy ai_conversations_delete_own on public.ai_conversations for delete to authenticated using (auth.uid() = user_id);

create policy ai_messages_select_own on public.ai_messages for select to authenticated using (auth.uid() = user_id);
create policy ai_messages_insert_own on public.ai_messages for insert to authenticated with check (auth.uid() = user_id);
create policy ai_messages_update_own on public.ai_messages for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy ai_messages_delete_own on public.ai_messages for delete to authenticated using (auth.uid() = user_id);

create index if not exists tasks_user_due_idx on public.tasks(user_id, due_date);
create index if not exists tasks_user_status_idx on public.tasks(user_id, status);
create index if not exists subtasks_task_idx on public.subtasks(task_id);
create index if not exists events_user_start_idx on public.events(user_id, start_at);
create index if not exists habits_user_idx on public.habits(user_id);
create index if not exists habit_logs_habit_date_idx on public.habit_logs(habit_id, completed_on);
create index if not exists notes_user_updated_idx on public.notes(user_id, updated_at);
create index if not exists journal_user_date_idx on public.journal_entries(user_id, entry_date);
create index if not exists transactions_user_date_idx on public.transactions(user_id, transaction_date);
create index if not exists budgets_user_month_idx on public.budgets(user_id, period_month);
create index if not exists goals_user_idx on public.savings_goals(user_id);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at);
create unique index if not exists notifications_dedupe_idx on public.notifications(user_id, dedupe_key) where dedupe_key is not null;
create index if not exists conversations_user_updated_idx on public.ai_conversations(user_id, updated_at);
create index if not exists messages_conversation_idx on public.ai_messages(conversation_id, created_at);
