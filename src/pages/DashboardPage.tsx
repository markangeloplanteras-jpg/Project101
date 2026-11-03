import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarDays, CheckCircle2, Plus, Sparkles, Target, TrendingUp, Wallet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { Badge, EmptyState } from '../components/ui/Small';
import { Button } from '../components/ui/Button';
import { formatDisplayDate, formatShortDate, formatTime, isSameDaySafe, toISODate } from '../lib/date';
import { currency } from '../lib/date';
import type { Task } from '../types';

export function DashboardPage() {
  const { user, profile } = useAuth();
  const { data, loading, error, refresh, updateTask } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();

  const tasks = data?.tasks ?? [];
  const events = data?.events ?? [];
  const habits = data?.habits.filter((habit) => !habit.archived) ?? [];
  const habitLogs = data?.habitLogs ?? [];
  const notes = data?.notes ?? [];
  const transactions = data?.transactions ?? [];
  const widgets = profile?.dashboard_widgets;

  const stats = useMemo(() => {
    const todayKey = toISODate(new Date());
    const openTasks = tasks.filter((task) => task.status !== 'completed');
    const todayTasks = tasks.filter((task) => task.due_date?.slice(0, 10) === todayKey && task.status !== 'completed');
    const completedToday = tasks.filter((task) => task.completed_at?.slice(0, 10) === todayKey).length;
    const completedHabitIds = habitLogs.filter((log) => log.completed_on === todayKey).map((log) => log.habit_id);
    const habitsCompleted = habits.filter((habit) => completedHabitIds.includes(habit.id)).length;
    const todayEvents = events.filter((event) => event.start_at.slice(0, 10) === todayKey).length;
    const monthKey = new Date().toISOString().slice(0, 7);
    const monthTransactions = transactions.filter((transaction) => transaction.transaction_date.slice(0, 7) === monthKey);
    const income = monthTransactions.filter((transaction) => transaction.type === 'income').reduce((sum, transaction) => sum + transaction.amount, 0);
    const expenses = monthTransactions.filter((transaction) => transaction.type === 'expense').reduce((sum, transaction) => sum + transaction.amount, 0);
    return { openTasks, todayTasks, completedToday, habitsCompleted, todayEvents, income, expenses };
  }, [tasks, events, habits, habitLogs, transactions]);

  const weeklyProductivity = useMemo(() => {
    const days: Array<{ day: string; completed: number }> = [];
    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - index);
      const key = toISODate(date);
      days.push({ day: formatShortDate(key), completed: tasks.filter((task) => task.completed_at?.slice(0, 10) === key).length });
    }
    return days;
  }, [tasks]);

  const spendingData = useMemo(() => {
    const monthKey = new Date().toISOString().slice(0, 7);
    const monthTransactions = transactions.filter((transaction) => transaction.transaction_date.slice(0, 7) === monthKey);
    const income = monthTransactions.filter((transaction) => transaction.type === 'income').reduce((sum, transaction) => sum + transaction.amount, 0);
    const expenses = monthTransactions.filter((transaction) => transaction.type === 'expense').reduce((sum, transaction) => sum + transaction.amount, 0);
    return [
      { name: 'Income', value: Number(income.toFixed(2)) },
      { name: 'Expenses', value: Number(expenses.toFixed(2)) },
    ];
  }, [transactions]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 5) return 'Up late';
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const todayEventsList = useMemo(
    () => events.filter((event) => event.start_at.slice(0, 10) === toISODate(new Date())).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()),
    [events],
  );
  const recentNotes = useMemo(() => [...notes].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 3), [notes]);
  const quickActions = [
    { label: 'New task', icon: Plus, to: '/tasks?new=1', action: () => navigate('/tasks?new=1') },
    { label: 'New note', icon: Plus, to: '/notes?new=1', action: () => navigate('/notes?new=1') },
    { label: 'Add expense', icon: Wallet, to: '/finance?new=1', action: () => navigate('/finance?new=1') },
    { label: 'New habit', icon: Target, to: '/habits?new=1', action: () => navigate('/habits?new=1') },
    { label: 'Ask assistant', icon: Sparkles, to: '/assistant', action: () => navigate('/assistant') },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-xl font-display font-bold">We couldn’t load your dashboard</h2>
        <p className="mt-2 text-sm text-muted">{error ?? 'Your workspace data is unavailable.'}</p>
        <Button variant="secondary" className="mt-6" onClick={() => void refresh()}>Retry</Button>
      </div>
    );
  }

  type DashboardWidgetKey = keyof ReturnType<typeof defaultWidgets>;
  const widget = (key: DashboardWidgetKey) => widgets?.[key];

  const completeTask = async (task: Task) => {
    const completed = task.status !== 'completed';
    await updateTask(task.id, {
      status: completed ? 'completed' : 'todo',
      completed_at: completed ? task.completed_at ?? new Date().toISOString() : null,
    });
    toast(completed ? 'Task completed.' : 'Task reopened.', 'success');
  };

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="bg-gradient-to-r from-accent-600/20 via-blue-600/10 to-transparent p-6 sm:p-8">
          <p className="text-sm font-medium text-accent-600 dark:text-accent-300">{formatDisplayDate(new Date(), profile?.date_format)}</p>
          <h2 className="mt-2 text-3xl font-display font-bold text-balance sm:text-4xl">{greeting}, {user?.full_name?.split(' ')[0] || 'friend'}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            You have <span className="font-semibold text-text">{stats.todayTasks.length}</span> task(s) due today and <span className="font-semibold text-text">{stats.todayEvents}</span> event(s) today.
          </p>
        </div>
      </section>

      {widget('quickActions') ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {quickActions.map((action) => (
            <button key={action.label} onClick={action.action} className="card card-hover flex items-center gap-3 p-4 text-left transition-all hover:border-accent-400/40 hover:shadow-glow">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500"><action.icon className="h-5 w-5" /></span>
              <span className="text-sm font-semibold">{action.label}</span>
            </button>
          ))}
        </section>
      ) : null}

      {widget('stats') ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={CheckCircle2} label="Tasks completed today" value={String(stats.completedToday)} tone="green" />
          <StatCard icon={Target} label="Habits completed" value={String(stats.habitsCompleted)} tone="accent" />
          <StatCard icon={CalendarDays} label="Events today" value={String(stats.todayEvents)} tone="blue" />
          <StatCard icon={Wallet} label="Spent this month" value={currency(stats.expenses, profile?.currency)} tone="amber" />
        </section>
      ) : null}

      {widget('taskFocus') ? (
        <section className="card card-hover p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display font-bold">Today’s focus</h3>
            <Link to="/tasks" className="text-sm font-medium text-accent-600 hover:underline">View tasks</Link>
          </div>
          {stats.todayTasks.length ? (
            <ul className="mt-4 space-y-2">
              {stats.todayTasks.slice(0, 5).map((task) => (
                <li key={task.id} className="flex items-start gap-3 rounded-xl border border-default p-3">
                  <button className="mt-0.5" onClick={() => void completeTask(task)} aria-label={`Complete ${task.title}`}>
                    {task.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <span className="mt-0.5 h-5 w-5 rounded-md border border-slate-300 dark:border-slate-600" />}
                  </button>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{task.title}</p>
                    <p className="text-xs text-muted">{task.category}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="No tasks due today" description="Enjoy the calm, or add your first task." />
          )}
        </section>
      ) : null}

      {widget('habits') ? (
        <section className="card card-hover p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display font-bold">Habit progress</h3>
            <Link to="/habits" className="text-sm font-medium text-accent-600 hover:underline">Manage</Link>
          </div>
          <div className="mt-4 space-y-3">
            {habits.slice(0, 4).map((habit) => {
              const completed = habitLogs.some((log) => log.habit_id === habit.id && log.completed_on === toISODate(new Date()));
              return (
                <div key={habit.id} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${habit.color}22` }}>
                    <Target className="h-5 w-5" style={{ color: habit.color }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{habit.name}</p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div className="h-full rounded-full" style={{ width: completed ? '100%' : '0%', backgroundColor: habit.color }} />
                    </div>
                  </div>
                  <Badge tone={completed ? 'green' : 'default'}>{completed ? 'Done' : 'Pending'}</Badge>
                </div>
              );
            })}
            {!habits.length ? <EmptyState icon={<Target className="h-6 w-6" />} title="No habits yet" description="Create a habit to build consistency." /> : null}
          </div>
        </section>
      ) : null}

      {widget('upcoming') ? (
        <section className="card card-hover p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display font-bold">Upcoming</h3>
            <Link to="/calendar" className="text-sm font-medium text-accent-600 hover:underline">Calendar</Link>
          </div>
          <div className="mt-4 space-y-2">
            {todayEventsList.slice(0, 4).map((event) => (
              <div key={event.id} className="rounded-xl border border-default p-3">
                <p className="text-sm font-semibold">{event.title}</p>
                <p className="text-xs text-muted">{formatTime(event.start_at)}</p>
              </div>
            ))}
            {!todayEventsList.length ? <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="No events today" description="Add an event to protect your time." /> : null}
          </div>
        </section>
      ) : null}

      {widget('productivity') ? (
        <section className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-bold">Weekly productivity</h3>
              <p className="text-sm text-muted">Tasks completed over the last 7 days.</p>
            </div>
            <TrendingUp className="h-5 w-5 text-accent-500" />
          </div>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyProductivity}>
                <defs>
                  <linearGradient id="productivityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7857f6" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#7857f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                <XAxis dataKey="day" stroke="rgb(var(--muted))" fontSize={12} />
                <YAxis allowDecimals={false} stroke="rgb(var(--muted))" fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="completed" stroke="#7857f6" strokeWidth={2.5} fill="url(#productivityGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        {widget('spending') ? (
          <section className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display font-bold">Spending snapshot</h3>
                <p className="text-sm text-muted">Income versus expenses this month.</p>
              </div>
              <Link to="/finance" className="text-sm font-medium text-accent-600 hover:underline">Open finance</Link>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-surface-soft p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Income</p>
                <p className="mt-1 text-2xl font-display font-bold text-emerald-500">{currency(stats.income, profile?.currency)}</p>
              </div>
              <div className="rounded-2xl bg-surface-soft p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Expenses</p>
                <p className="mt-1 text-2xl font-display font-bold text-amber-500">{currency(stats.expenses, profile?.currency)}</p>
              </div>
            </div>
            <div className="mt-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spendingData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                  <XAxis dataKey="name" stroke="rgb(var(--muted))" fontSize={12} />
                  <YAxis stroke="rgb(var(--muted))" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" name="Amount" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        ) : null}

        {widget('notes') ? (
          <section className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display font-bold">Recent notes</h3>
                <p className="text-sm text-muted">Your latest thinking.</p>
              </div>
              <Link to="/notes" className="text-sm font-medium text-accent-600 hover:underline">All notes</Link>
            </div>
            <div className="mt-4 space-y-2">
              {recentNotes.map((note) => (
                <div key={note.id} className="rounded-xl border border-default p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{note.title || 'Untitled note'}</p>
                    <Badge tone={note.category === 'Idea' ? 'accent' : 'default'}>{note.category}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{note.content || 'No content yet.'}</p>
                </div>
              ))}
              {!recentNotes.length ? <EmptyState icon={<Plus className="h-6 w-6" />} title="No notes yet" description="Capture ideas before they disappear." /> : null}
            </div>
          </section>
        ) : null}
      </div>

      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Make this space yours</h2>
          <p className="text-sm text-muted">Dashboard widgets can be customized in Settings.</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/settings')}>Customize</Button>
      </section>
    </div>
  );
}

function defaultWidgets() {
  return {
    stats: true,
    taskFocus: true,
    habits: true,
    upcoming: true,
    productivity: true,
    spending: true,
    notes: true,
    quickActions: true,
  };
}

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof CheckCircle2; label: string; value: string; tone: 'green' | 'accent' | 'blue' | 'amber' }) {
  const tones = {
    green: 'bg-emerald-500/10 text-emerald-500',
    accent: 'bg-accent-500/10 text-accent-500',
    blue: 'bg-blue-500/10 text-blue-500',
    amber: 'bg-amber-500/10 text-amber-500',
  };
  return (
    <div className="card p-4">
      <div className={`${tones[tone]} flex h-10 w-10 items-center justify-center rounded-xl`}><Icon className="h-5 w-5" /></div>
      <p className="mt-3 text-2xl font-display font-bold">{value}</p>
      <p className="mt-1 text-xs font-medium text-muted">{label}</p>
    </div>
  );
}
