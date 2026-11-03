import { useMemo, useState } from 'react';
import { Plus, Target, Trash2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { Badge, EmptyState } from '../components/ui/Small';
import { Button } from '../components/ui/Button';
import { Field, Input, Select, Textarea } from '../components/ui/Inputs';
import { Modal } from '../components/ui/Modal';
import { HABIT_COLORS } from '../lib/constants';
import { toISODate } from '../lib/date';
import type { Habit } from '../types';

const HABIT_ICONS: Record<string, typeof Target> = {
  sparkles: Target,
  dumbbell: Target,
  book: Target,
  heart: Target,
  brain: Target,
  leaf: Target,
  run: Target,
  meditate: Target,
};

export function HabitsPage() {
  const { data, loading, error, refresh, createHabit, updateHabit, deleteHabit, createHabitLog, deleteHabitLog } = useData();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [deleting, setDeleting] = useState<Habit | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [draft, setDraft] = useState({ name: '', description: '', icon: 'sparkles', color: HABIT_COLORS[0], frequency: 'daily' as Habit['frequency'], days_of_week: [0, 1, 2, 3, 4, 5, 6], target_per_week: 7 });
  const [saving, setSaving] = useState(false);

  const habits = (data?.habits ?? []).filter((habit) => !habit.archived);
  const logs = data?.habitLogs ?? [];
  const todayKey = toISODate(new Date());

  const habitStats = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const log of logs) {
      const set = map.get(log.habit_id) ?? new Set<string>();
      set.add(log.completed_on);
      map.set(log.habit_id, set);
    }
    return map;
  }, [logs]);

  const streaks = useMemo(() => {
    const stats = new Map<string, number>();
    for (const habit of habits) {
      let streak = 0;
      for (let offset = 0; offset < 365; offset += 1) {
        const date = new Date();
        date.setDate(date.getDate() - offset);
        const key = toISODate(date);
        if (habit.frequency === 'daily') {
          if (habitStats.get(habit.id)?.has(key)) streak += 1;
          else break;
        } else if (habit.frequency === 'weekly') {
          const start = new Date(date.getFullYear(), date.getMonth(), 1);
          const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
          const logsThatWeek = logs.filter((log) => log.habit_id === habit.id && log.completed_on >= toISODate(start) && log.completed_on < toISODate(end));
          if (logsThatWeek.length > 0) streak += 1;
          else break;
        } else if (habit.frequency === 'custom') {
          const completed = habit.days_of_week?.includes(date.getDay()) ?? false;
          if (completed && habitStats.get(habit.id)?.has(key)) streak += 1;
          else break;
        } else {
          break;
        }
      }
      stats.set(habit.id, streak);
    }
    return stats;
  }, [habits, logs, habitStats]);

  const toggleHabit = async (habit: Habit) => {
    const exists = logs.some((log) => log.habit_id === habit.id && log.completed_on === todayKey);
    if (exists) {
      const log = logs.find((item) => item.habit_id === habit.id && item.completed_on === todayKey);
      if (log) await deleteHabitLog(log.id);
      return;
    }
    await createHabitLog(habit.id, todayKey);
  };

  const saveHabit = async () => {
    if (!draft.name.trim()) {
      toast('Habit name is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const values = {
        name: draft.name.trim(),
        description: draft.description,
        icon: draft.icon,
        color: draft.color,
        frequency: draft.frequency,
        days_of_week: draft.frequency === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : draft.frequency === 'weekly' ? [0] : draft.days_of_week,
        target_per_week: draft.frequency === 'daily' ? 7 : draft.frequency === 'weekly' ? 1 : draft.target_per_week,
      };
      if (editing) {
        await updateHabit(editing.id, { ...values, archived: editing.archived });
        toast('Habit updated.', 'success');
      } else {
        await createHabit(values as Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'archived'>);
        toast('Habit created.', 'success');
      }
      setModalOpen(false);
      setEditing(null);
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Habit could not be saved.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setPendingDelete(true);
    try {
      await deleteHabit(deleting.id);
      toast('Habit deleted.', 'success');
      setDeleting(null);
    } finally {
      setPendingDelete(false);
    }
  };

  if (loading) return <div className="card h-96 animate-pulse rounded-2xl" />;
  if (error || !data) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-xl font-display font-bold">Habits could not load</h2>
        <p className="mt-2 text-sm text-muted">{error ?? 'Your habits are unavailable.'}</p>
        <Button variant="secondary" className="mt-6" onClick={() => void refresh()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Habits</h2>
          <p className="text-sm text-muted">Daily completion, streaks, and weekly progress.</p>
        </div>
        <Button variant="primary" onClick={() => { setEditing(null); setDraft({ name: '', description: '', icon: 'sparkles', color: HABIT_COLORS[0], frequency: 'daily', days_of_week: [0, 1, 2, 3, 4, 5, 6], target_per_week: 7 }); setModalOpen(true); }}><Plus className="h-4 w-4" /> New habit</Button>
      </div>

      {habits.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {habits.map((habit) => {
            const completedToday = habitStats.get(habit.id)?.has(todayKey) ?? false;
            const Icon = HABIT_ICONS[habit.icon] ?? Target;
            const weekLogs = logs.filter((log) => log.habit_id === habit.id && log.completed_on >= toISODate(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)) && log.completed_on <= toISODate(new Date()));
            const weekProgress = Math.min(100, Math.round((weekLogs.length / habit.target_per_week) * 100));
            return (
              <div key={habit.id} className="card card-hover p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${habit.color}22` }}>
                      <Icon className="h-5 w-5" style={{ color: habit.color }} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-display font-bold">{habit.name}</h3>
                      <p className="text-xs capitalize text-muted">{habit.frequency}</p>
                    </div>
                  </div>
                  <button className="icon-btn text-rose-500" onClick={() => { setDeleting(habit); setPendingDelete(true); }} aria-label={`Delete ${habit.name}`}><Trash2 className="h-4 w-4" /></button>
                </div>
                <p className="mt-3 line-clamp-2 min-h-10 text-sm text-muted">{habit.description || 'Build consistency with small, repeatable actions.'}</p>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Current streak</span>
                    <span className="font-bold text-text">{streaks.get(habit.id) ?? 0} days</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className="h-full rounded-full" style={{ width: `${weekProgress}%`, backgroundColor: habit.color }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted">
                    <span>Weekly progress</span>
                    <span>{weekLogs.length}/{habit.target_per_week}</span>
                  </div>
                </div>
                <Button variant={completedToday ? 'secondary' : 'primary'} className="mt-5 w-full" onClick={() => void toggleHabit(habit)}>
                  {completedToday ? 'Completed today' : 'Mark complete'}
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<Target className="h-6 w-6" />} title="No habits yet" description="Create your first habit and start tracking consistency." action={<Button variant="primary" onClick={() => { setEditing(null); setModalOpen(true); }}><Plus className="h-4 w-4" /> New habit</Button>} />
      )}

      <Modal open={modalOpen} title={editing ? 'Edit habit' : 'New habit'} onClose={() => setModalOpen(false)} widthClass="max-w-2xl">
        <div className="space-y-4">
          <Field label="Habit name">
            <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Morning meditation" />
          </Field>
          <Field label="Description">
            <Textarea rows={2} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Frequency">
              <Select value={draft.frequency} onChange={(event) => setDraft((current) => ({ ...current, frequency: event.target.value as Habit['frequency'] }))}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom</option>
              </Select>
            </Field>
            <Field label="Color">
              <div className="flex gap-2">
                {HABIT_COLORS.map((color) => (
                  <button key={color} type="button" onClick={() => setDraft((current) => ({ ...current, color }))} className={`h-8 w-8 rounded-full border ${draft.color === color ? 'ring-2 ring-accent-500' : 'border-default'}`} style={{ backgroundColor: color }} aria-label={`Choose color ${color}`} />
                ))}
              </div>
            </Field>
          </div>
          {draft.frequency === 'custom' ? (
            <Field label="Days of week">
              <div className="flex flex-wrap gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <button key={day} type="button" onClick={() => setDraft((current) => ({ ...current, days_of_week: current.days_of_week.includes(index) ? current.days_of_week.filter((value) => value !== index) : [...current.days_of_week, index].sort() }))} className={`btn h-9 rounded-xl border px-3 text-sm ${draft.days_of_week.includes(index) ? 'border-accent-500/40 bg-accent-500/10 text-accent-600' : 'border-default text-muted'}`}>{day}</button>
                ))}
              </div>
            </Field>
          ) : null}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => void saveHabit()} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save habit' : 'Create habit'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={pendingDelete} title="Delete habit" onClose={() => setPendingDelete(false)} widthClass="max-w-md">
        <p className="text-sm text-muted">Delete this habit and its completion history?</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setPendingDelete(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => void confirmDelete()} disabled={pendingDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
