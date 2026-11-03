import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ChevronDown, Plus, Search, Trash2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { Badge, EmptyState } from '../components/ui/Small';
import { Button } from '../components/ui/Button';
import { Field, Input, Select, Textarea } from '../components/ui/Inputs';
import { Modal } from '../components/ui/Modal';
import { TASK_CATEGORIES, PRIORITIES, RECURRENCES } from '../lib/constants';
import { toISODate } from '../lib/date';
import type { Task, TaskPriority, TaskStatus } from '../types';

type TaskView = 'today' | 'upcoming' | 'all' | 'completed';

const VIEWS: Array<{ key: TaskView; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
];

export function TasksPage() {
  const { data, loading, error, refresh, updateTask, deleteTask } = useData();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<TaskView>('today');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [priority, setPriority] = useState<'all' | TaskPriority>('all');
  const [sort, setSort] = useState<'due' | 'priority' | 'created'>('due');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);

  const tasks = data?.tasks ?? [];

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setModalOpen(true);
      setEditing(null);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const visibleTasks = useMemo(() => {
    const todayKey = toISODate(new Date());
    const filtered = tasks.filter((task) => {
      const matchesQuery = !query || task.title.toLowerCase().includes(query.toLowerCase()) || task.description.toLowerCase().includes(query.toLowerCase()) || task.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()));
      const matchesCategory = category === 'all' || task.category === category;
      const matchesPriority = priority === 'all' || task.priority === priority;
      if (view === 'today') {
        if (task.status === 'completed') return false;
        if (!task.due_date) return false;
        if (task.due_date < `${todayKey}T00:00:00.000Z`) return true;
        if (task.due_date.slice(0, 10) === todayKey) return true;
        return false;
      }
      if (view === 'upcoming') {
        if (task.status === 'completed' || !task.due_date) return false;
        return task.due_date.slice(0, 10) > todayKey;
      }
      if (view === 'completed') return task.status === 'completed';
      return true;
    });

    const sorted = [...filtered];
    if (sort === 'priority') {
      const rank = { urgent: 0, high: 1, medium: 2, low: 3 };
      sorted.sort((a, b) => (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3) || new Date(b.due_date ?? 0).getTime() - new Date(a.due_date ?? 0).getTime());
    } else if (sort === 'created') {
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    } else {
      sorted.sort((a, b) => new Date(a.due_date ?? new Date().toISOString()).getTime() - new Date(b.due_date ?? new Date().toISOString()).getTime());
    }
    return sorted;
  }, [tasks, view, query, category, priority, sort]);

  const completeTask = async (task: Task) => {
    const completed = task.status !== 'completed';
    await updateTask(task.id, { status: completed ? 'completed' : 'todo', completed_at: completed ? task.completed_at ?? new Date().toISOString() : null });
    toast(completed ? 'Task completed.' : 'Task reopened.', 'success');
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setPendingDelete(true);
    try {
      await deleteTask(deleting.id);
      toast('Task deleted.', 'success');
      setDeleting(null);
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Task could not be deleted.', 'error');
    } finally {
      setPendingDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-44 animate-pulse rounded-xl" />
        <div className="card h-96 animate-pulse rounded-2xl" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-xl font-display font-bold">Tasks could not load</h2>
        <p className="mt-2 text-sm text-muted">{error ?? 'Your tasks are unavailable.'}</p>
        <Button variant="secondary" className="mt-6" onClick={() => void refresh()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {VIEWS.map((item) => (
            <button key={item.key} onClick={() => setView(item.key)} className={`btn h-9 rounded-xl border px-4 text-sm font-semibold ${view === item.key ? 'border-accent-500/40 bg-accent-500/10 text-accent-600 dark:text-accent-300' : 'border-default bg-surface text-muted hover:text-text'}`}>
              {item.label}
            </button>
          ))}
        </div>
        <Button variant="primary" onClick={() => { setEditing(null); setModalOpen(true); }}><Plus className="h-4 w-4" /> New task</Button>
      </div>

      <div className="card p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" placeholder="Search tasks, descriptions, tags" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <Select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {TASK_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </Select>
          <Select value={priority} onChange={(event) => setPriority(event.target.value as 'all' | TaskPriority)}>
            <option value="all">All priorities</option>
            {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority[0].toUpperCase() + priority.slice(1)}</option>)}
          </Select>
          <Select value={sort} onChange={(event) => setSort(event.target.value as 'due' | 'priority' | 'created')}>
            <option value="due">Sort: due date</option>
            <option value="priority">Sort: priority</option>
            <option value="created">Sort: newest</option>
          </Select>
        </div>
      </div>

      {visibleTasks.length ? (
        <div className="space-y-3">
          {visibleTasks.map((task) => {
            const subtasks = data?.subtasks.filter((subtask) => subtask.task_id === task.id) ?? [];
            const completedSubtasks = subtasks.filter((subtask) => subtask.completed).length;
            return (
              <div key={task.id} className="card card-hover flex items-start gap-4 p-4">
                <button onClick={() => void completeTask(task)} className="mt-0.5" aria-label={`Complete ${task.title}`}>
                  {task.status === 'completed' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <span className="mt-0.5 h-5 w-5 rounded-lg border border-slate-300 dark:border-slate-600" />}
                </button>
                <button className="min-w-0 flex-1 text-left" onClick={() => { setEditing(task); setModalOpen(true); }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`font-semibold ${task.status === 'completed' ? 'line-through text-muted' : ''}`}>{task.title}</p>
                    <Badge tone={task.priority === 'urgent' || task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'amber' : 'default'}>{task.priority}</Badge>
                    <Badge>{task.category}</Badge>
                    {task.due_date ? <Badge tone={task.due_date.slice(0, 10) < toISODate(new Date()) && task.status !== 'completed' ? 'red' : 'blue'}>Due {task.due_date.slice(0, 10)}</Badge> : <Badge>Due soon</Badge>}
                  </div>
                  {task.description ? <p className="mt-1 line-clamp-2 text-sm text-muted">{task.description}</p> : null}
                  {task.tags.length ? <p className="mt-1 text-xs text-muted">#{task.tags.join(' · #')}</p> : null}
                  {subtasks.length ? <p className="mt-1 text-xs text-muted">{completedSubtasks}/{subtasks.length} subtasks</p> : null}
                </button>
                <div className="flex items-center gap-1">
                  <button className="icon-btn" onClick={() => { setEditing(task); setModalOpen(true); }} aria-label={`Edit ${task.title}`}>Edit</button>
                  <button className="icon-btn text-rose-500" onClick={() => { setDeleting(task); setPendingDelete(true); }} aria-label={`Delete ${task.title}`}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="No tasks match" description="Adjust filters or create a task." action={<Button variant="primary" onClick={() => { setEditing(null); setModalOpen(true); }}><Plus className="h-4 w-4" /> New task</Button>} />
      )}

      <TaskModal open={modalOpen} task={editing} onClose={() => setModalOpen(false)} onSaved={() => setModalOpen(false)} />

      <Modal open={pendingDelete} title="Delete task" onClose={() => setPendingDelete(false)} widthClass="max-w-md">
        <p className="text-sm text-muted">Delete “{deleting?.title}” permanently? This will also remove its subtasks.</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setPendingDelete(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => void confirmDelete()} disabled={pendingDelete}>{pendingDelete ? 'Deleting…' : 'Delete'}</Button>
        </div>
      </Modal>
    </div>
  );
}

interface TaskDraft {
  id?: string;
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  recurrence: Task['recurrence'];
  tags: string[];
  subtasks: Array<{ id?: string; title: string; completed: boolean; position: number }>;
}

function TaskModal({ open, task, onClose, onSaved }: { open: boolean; task: Task | null; onClose: () => void; onSaved: () => void }) {
  const { createTask, updateTask, createSubtask, updateSubtask, deleteSubtask, data } = useData();
  const { toast } = useToast();
  const [draft, setDraft] = useState<TaskDraft>({ title: '', description: '', category: 'General', priority: 'medium', status: 'todo', dueDate: toISODate(new Date()), recurrence: 'none', tags: [], subtasks: [] });
  const [newSubtask, setNewSubtask] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft({
      id: task?.id,
      title: task?.title ?? '',
      description: task?.description ?? '',
      category: task?.category ?? 'General',
      priority: task?.priority ?? 'medium',
      status: task?.status ?? 'todo',
      dueDate: task?.due_date ? task.due_date.slice(0, 10) : toISODate(new Date()),
      recurrence: task?.recurrence ?? 'none',
      tags: task?.tags ?? [],
      subtasks: (task?.subtasks ?? []).map((subtask) => ({ id: subtask.id, title: subtask.title, completed: subtask.completed, position: subtask.position })),
    });
  }, [open, task]);

  const set = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const save = async () => {
    if (!draft.title.trim()) {
      toast('Task title is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (task) {
        const saved = await updateTask(task.id, {
          title: draft.title.trim(),
          description: draft.description,
          category: draft.category,
          priority: draft.priority,
          status: draft.status,
          due_date: `${draft.dueDate}T00:00:00.000Z`,
          recurrence: draft.recurrence,
          tags: draft.tags,
          completed_at: draft.status === 'completed' ? task.completed_at ?? new Date().toISOString() : null,
        } as Partial<Task>);
        const existing = task.subtasks ?? [];
        const localIds = new Set(draft.subtasks.map((subtask) => subtask.id).filter(Boolean));
        for (const subtask of draft.subtasks) {
          if (subtask.id && existing.some((item) => item.id === subtask.id)) {
            await updateSubtask(subtask.id, { title: subtask.title, completed: subtask.completed, position: subtask.position });
          } else if (subtask.title.trim()) {
            await createSubtask(saved.id, subtask.title.trim(), subtask.position);
          }
        }
        for (const subtask of existing) {
          if (!localIds.has(subtask.id) && !draft.subtasks.some((item) => item.id === subtask.id)) await deleteSubtask(subtask.id);
        }
        toast('Task updated.', 'success');
        onSaved();
      } else {
        const created = await createTask({
          title: draft.title.trim(),
          description: draft.description,
          category: draft.category,
          priority: draft.priority,
          status: draft.status,
          due_date: `${draft.dueDate}T00:00:00.000Z`,
          recurrence: draft.recurrence,
          tags: draft.tags,
          completed_at: draft.status === 'completed' ? new Date().toISOString() : null,
        } as never);
        for (const subtask of draft.subtasks) {
          if (subtask.title.trim()) await createSubtask(created.id, subtask.title.trim(), subtask.position);
        }
        toast('Task created.', 'success');
        onSaved();
      }
      onClose();
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Task could not be saved.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const allSubtasks = task ? data?.subtasks.filter((subtask) => subtask.task_id === task.id) ?? [] : [];
  const localById = new Map(draft.subtasks.map((subtask) => [subtask.id ?? `draft-${subtask.title}`, subtask]));

  return (
    <Modal open={open} title={task ? 'Edit task' : 'New task'} onClose={onClose} widthClass="max-w-3xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <Input value={draft.title} onChange={(event) => set('title', event.target.value)} placeholder="e.g. Prepare quarterly review" autoFocus />
        </Field>
        <Field label="Category">
          <Select value={draft.category} onChange={(event) => set('category', event.target.value)}>
            {TASK_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </Select>
        </Field>
        <Field label="Description">
          <Textarea rows={3} value={draft.description} onChange={(event) => set('description', event.target.value)} placeholder="Add context, links, or acceptance criteria." />
        </Field>
        <Field label="Due date">
          <Input type="date" value={draft.dueDate} onChange={(event) => set('dueDate', event.target.value)} />
        </Field>
        <Field label="Priority">
          <Select value={draft.priority} onChange={(event) => set('priority', event.target.value as TaskPriority)}>
            {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={draft.status} onChange={(event) => set('status', event.target.value as TaskStatus)}>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </Select>
        </Field>
        <Field label="Recurrence">
          <Select value={draft.recurrence} onChange={(event) => set('recurrence', event.target.value as Task['recurrence'])}>
            {RECURRENCES.map((recurrence) => <option key={recurrence} value={recurrence}>{recurrence}</option>)}
          </Select>
        </Field>
        <Field label="Tags" hint="Separate tags with commas.">
          <Input value={draft.tags.join(', ')} onChange={(event) => set('tags', event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))} placeholder="work, planning" />
        </Field>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-display font-semibold">Subtasks</h4>
          <div className="flex gap-2">
            <Input className="h-9 w-56" placeholder="New subtask" value={newSubtask} onChange={(event) => setNewSubtask(event.target.value)} />
            <Button variant="secondary" size="sm" onClick={() => { if (newSubtask.trim()) { setDraft((current) => ({ ...current, subtasks: [...current.subtasks, { title: newSubtask.trim(), completed: false, position: current.subtasks.length }] })); setNewSubtask(''); } }}>Add</Button>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {draft.subtasks.map((subtask, index) => (
            <div key={subtask.id ?? `draft-${index}`} className="flex items-center gap-2">
              <input type="checkbox" checked={subtask.completed} onChange={(event) => setDraft((current) => ({ ...current, subtasks: current.subtasks.map((item, itemIndex) => itemIndex === index ? { ...item, completed: event.target.checked } : item) }))} />
              <Input value={subtask.title} onChange={(event) => setDraft((current) => ({ ...current, subtasks: current.subtasks.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) }))} />
              <Button variant="ghost" size="sm" onClick={() => setDraft((current) => ({ ...current, subtasks: current.subtasks.filter((_, itemIndex) => itemIndex !== index) }))} aria-label="Remove subtask">Remove</Button>
            </div>
          ))}
          {allSubtasks.length > draft.subtasks.length ? (
            <p className="text-xs text-muted">Existing subtasks not shown here may require direct management.</p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : task ? 'Save task' : 'Create task'}</Button>
      </div>
    </Modal>
  );
}
