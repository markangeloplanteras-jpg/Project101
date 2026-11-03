import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarRange, CheckCircle2, Coins, HeartPulse } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { Badge, EmptyState } from '../components/ui/Small';
import { Button } from '../components/ui/Button';
import { toISODate } from '../lib/date';
import { currency } from '../lib/date';
import type { Task } from '../types';

type RangeKey = 'daily' | 'weekly' | 'monthly';

export function AnalyticsPage() {
  const { data, loading, error, refresh } = useData();
  const [range, setRange] = useState<RangeKey>('weekly');
  const tasks = data?.tasks ?? [];
  const habits = data?.habits.filter((habit) => !habit.archived) ?? [];
  const habitLogs = data?.habitLogs ?? [];
  const transactions = data?.transactions ?? [];
  const budgets = data?.budgets ?? [];

  const taskCompletion = useMemo(() => {
    const todayKey = toISODate(new Date());
    if (range === 'daily') {
      const days: Array<{ day: string; completed: number }> = [];
      for (let index = 13; index >= 0; index -= 1) {
        const date = new Date();
        date.setDate(date.getDate() - index);
        const key = toISODate(date);
        days.push({ day: key.slice(5), completed: tasks.filter((task) => task.completed_at?.slice(0, 10) === key).length });
      }
      return days;
    }
    if (range === 'weekly') {
      const days: Array<{ day: string; completed: number }> = [];
      for (let index = 6; index >= 0; index -= 1) {
        const date = new Date();
        date.setDate(date.getDate() - index);
        const key = toISODate(date);
        days.push({ day: key.slice(5), completed: tasks.filter((task) => task.completed_at?.slice(0, 10) === key).length });
      }
      return days;
    }
    const monthKey = new Date().toISOString().slice(0, 7);
    const completed = tasks.filter((task) => task.completed_at?.slice(0, 10).startsWith(monthKey)).length;
    return [{ day: 'This month', completed }];
  }, [tasks, range]);

  const habitConsistency = useMemo(() => {
    const activeHabits = habits.slice(0, 8);
    const logsByHabit = new Map<string, Set<string>>();
    for (const log of habitLogs) {
      const set = logsByHabit.get(log.habit_id) ?? new Set<string>();
      set.add(log.completed_on);
      logsByHabit.set(log.habit_id, set);
    }
    const todayKey = toISODate(new Date());
    const values = activeHabits.map((habit) => ({
      habit: habit.name.length > 14 ? `${habit.name.slice(0, 13)}…` : habit.name,
      completion: logsByHabit.get(habit.id)?.has(todayKey) ? 100 : 0,
    }));
    const average = values.length ? Math.round(values.reduce((sum, item) => sum + item.completion, 0) / values.length) : 0;
    return { values, average };
  }, [habits, habitLogs]);

  const financeSummary = useMemo(() => {
    const monthKey = new Date().toISOString().slice(0, 7);
    const monthTransactions = transactions.filter((transaction) => transaction.transaction_date.slice(0, 7) === monthKey);
    const income = monthTransactions.filter((transaction) => transaction.type === 'income').reduce((sum, transaction) => sum + transaction.amount, 0);
    const expenses = monthTransactions.filter((transaction) => transaction.type === 'expense').reduce((sum, transaction) => sum + transaction.amount, 0);
    const weekAgo = Date.now() - 7 * 86_400_000;
    const weekTransactions = transactions.filter((transaction) => new Date(transaction.transaction_date).getTime() >= weekAgo);
    const weeklyExpenses = weekTransactions.filter((transaction) => transaction.type === 'expense').reduce((sum, transaction) => sum + transaction.amount, 0);
    return { income, expenses, weeklyExpenses };
  }, [transactions]);

  const budgetSummary = useMemo(() => budgets.map((budget) => {
    const spent = transactions.filter((transaction) => transaction.type === 'expense' && transaction.category === budget.category && transaction.transaction_date.slice(0, 7) === new Date().toISOString().slice(0, 7)).reduce((sum, transaction) => sum + transaction.amount, 0);
    return { category: budget.category, spent, limit: budget.amount_limit, progress: Math.min(100, (spent / budget.amount_limit) * 100) };
  }), [budgets, transactions]);

  if (loading) return <div className="card h-96 animate-pulse rounded-2xl" />;
  if (error || !data) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-xl font-display font-bold">Analytics could not load</h2>
        <p className="mt-2 text-sm text-muted">{error ?? 'Your analytics are unavailable.'}</p>
        <Button variant="secondary" className="mt-6" onClick={() => void refresh()}>Retry</Button>
      </div>
    );
  }

  const completionRate = taskCompletion[taskCompletion.length - 1]?.completed ?? 0;
  const completedTaskIds = new Set(tasks.filter((task) => task.status === 'completed').map((task) => task.id));
  const completionPercentage = tasks.length ? Math.round((completedTaskIds.size / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Analytics</h2>
          <p className="text-sm text-muted">Real productivity and finance summaries from your data.</p>
        </div>
        <div className="flex rounded-xl border border-default bg-surface p-1">
          {(['daily', 'weekly', 'monthly'] as RangeKey[]).map((item) => (
            <button key={item} onClick={() => setRange(item)} className={`btn h-8 rounded-lg px-3 text-xs font-semibold capitalize ${range === item ? 'bg-accent-500 text-white' : 'text-muted'}`}>{item}</button>
          ))}
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500"><CheckCircle2 className="h-5 w-5" /></span><div><p className="text-xs text-muted">Completed tasks</p><p className="text-2xl font-display font-bold">{completionPercentage}%</p></div></div>
          <p className="mt-2 text-sm text-muted">Based on {tasks.length} task(s) in your workspace.</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500"><HeartPulse className="h-5 w-5" /></span><div><p className="text-xs text-muted">Average habit completion</p><p className="text-2xl font-display font-bold">{habitConsistency.average}%</p></div></div>
          <p className="mt-2 text-sm text-muted">Today across your active habits.</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500"><Coins className="h-5 w-5" /></span><div><p className="text-xs text-muted">Monthly expenses</p><p className="text-2xl font-display font-bold">{currency(financeSummary.expenses, data.profile.currency)}</p></div></div>
          <p className="mt-2 text-sm text-muted">User-entered estimates.</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500"><CheckCircle2 className="h-5 w-5" /></span><div><p className="text-xs text-muted">Income this month</p><p className="text-2xl font-display font-bold">{currency(financeSummary.income, data.profile.currency)}</p></div></div>
          <p className="mt-2 text-sm text-muted">Income vs expenses trend.</p>
        </div>
      </section>

      <section className="card p-5">
        <h3 className="font-display font-bold">Task completion</h3>
        <p className="text-sm text-muted">Completed task count for the selected period.</p>
        <div className="mt-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={taskCompletion}>
              <defs><linearGradient id="taskGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7857f6" stopOpacity={0.45} /><stop offset="100%" stopColor="#7857f6" stopOpacity={0.02} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
              <XAxis dataKey="day" stroke="rgb(var(--muted))" fontSize={12} />
              <YAxis allowDecimals={false} stroke="rgb(var(--muted))" fontSize={12} />
              <Tooltip />
              <Area type="monotone" dataKey="completed" stroke="#7857f6" strokeWidth={2.5} fill="url(#taskGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <h3 className="font-display font-bold">Habit consistency</h3>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={habitConsistency.values}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                <XAxis dataKey="habit" stroke="rgb(var(--muted))" fontSize={11} interval={0} />
                <YAxis allowDecimals={false} stroke="rgb(var(--muted))" fontSize={12} />
                <Tooltip />
                <Bar dataKey="completion" name="Completion" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card p-5">
          <h3 className="font-display font-bold">Budget progress</h3>
          <div className="mt-4 space-y-3">
            {budgetSummary.map((budget) => (
              <div key={budget.category} className="rounded-xl border border-default p-3">
                <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{budget.category}</p><Badge tone={budget.progress > 90 ? 'red' : 'green'}>{Math.round(budget.progress)}%</Badge></div>
                <p className="mt-1 text-xs text-muted">{currency(budget.spent, data.profile.currency)} of {currency(budget.limit, data.profile.currency)}</p>
              </div>
            ))}
            {!budgetSummary.length ? <EmptyState icon={<CalendarRange className="h-6 w-6" />} title="No budgets yet" description="Create budgets to track spending." /> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
