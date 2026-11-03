import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { Badge, EmptyState } from '../components/ui/Small';
import { Button } from '../components/ui/Button';
import { Field, Input, Select, Textarea } from '../components/ui/Inputs';
import { Modal } from '../components/ui/Modal';
import { EVENT_CATEGORIES } from '../lib/constants';
import { addDays, format, isSameDay, subDays } from 'date-fns';
import { monthMatrix, toISODate, weekDays } from '../lib/date';
import type { CalendarEvent } from '../types';

type CalendarView = 'month' | 'week' | 'day';

function localInputValue(value: string) {
  const date = new Date(value);
  const pad = (number: number) => `${number}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toEventValues(draft: { title: string; description: string; startLocal: string; endLocal: string; allDay: boolean; category: string; color: string; location: string; reminder_minutes: number | null }) {
  const start = draft.allDay ? new Date(`${draft.startLocal.slice(0, 10)}T00:00:00`) : new Date(draft.startLocal);
  const end = draft.allDay ? new Date(`${draft.endLocal.slice(0, 10)}T00:00:00`) : new Date(draft.endLocal);
  return {
    title: draft.title.trim(),
    description: draft.description,
    start_at: start.toISOString(),
    end_at: new Date(end.getTime() > start.getTime() ? end : new Date(start.getTime() + 3_600_000)).toISOString(),
    all_day: draft.allDay,
    category: draft.category,
    color: draft.color,
    location: draft.location,
    reminder_minutes: draft.reminder_minutes,
  };
}

export function CalendarPage() {
  const { data, loading, error, refresh, updateEvent, deleteEvent, createEvent } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [view, setView] = useState<CalendarView>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [deleting, setDeleting] = useState<CalendarEvent | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [draft, setDraft] = useState<EventDraft>({
    title: '',
    description: '',
    startLocal: '2000-01-01T09:00',
    endLocal: '2000-01-01T12:00',
    allDay: false,
    category: 'Personal',
    color: '#7857f6',
    location: '',
    reminder_minutes: 30,
  });

  const events = data?.events ?? [];
  const tasks = data?.tasks ?? [];

  const monthDays = useMemo(() => monthMatrix(cursor.getFullYear(), cursor.getMonth(), data?.profile?.week_starts_on ?? 0), [cursor, data?.profile?.week_starts_on]);
  const weekDaysList = useMemo(() => {
    const start = weekDays(cursor, data?.profile?.week_starts_on ?? 0)[0];
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [cursor, data?.profile?.week_starts_on]);
  const dayEvents = useMemo(() => {
    const key = toISODate(cursor);
    return events.filter((event) => event.start_at.slice(0, 10) === key).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, [events, cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = event.start_at.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
    return map;
  }, [events]);

  const goToday = () => setCursor(new Date());
  const goPrevious = () => {
    const weekStartsOn = data?.profile?.week_starts_on ?? 0;
    if (view === 'month') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
    if (view === 'week') setCursor(addDays(weekDays(cursor, weekStartsOn)[0], -7));
    if (view === 'day') setCursor(subDays(cursor, 1));
  };
  const goNext = () => {
    const weekStartsOn = data?.profile?.week_starts_on ?? 0;
    if (view === 'month') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
    if (view === 'week') setCursor(addDays(weekDays(cursor, weekStartsOn)[0], 7));
    if (view === 'day') setCursor(addDays(cursor, 1));
  };

  const openCreate = () => {
    const start = new Date();
    const end = new Date(start.getTime() + 3_600_000);
    setEditing(null);
    setModalOpen(true);
    setDraft({
      title: '',
      description: '',
      startLocal: localInputValue(start.toISOString()),
      endLocal: localInputValue(end.toISOString()),
      allDay: false,
      category: 'Personal',
      color: '#7857f6',
      location: '',
      reminder_minutes: 30,
    });
  };

  const openEdit = (event: CalendarEvent) => {
    setEditing(event);
    setDraft({
      title: event.title,
      description: event.description,
      startLocal: localInputValue(event.start_at),
      endLocal: localInputValue(event.end_at),
      allDay: event.all_day,
      category: event.category,
      color: event.color,
      location: event.location,
      reminder_minutes: event.reminder_minutes,
    });
    setModalOpen(true);
  };

  const saveEvent = async () => {
    if (!draft.title.trim()) {
      toast('Event title is required.', 'error');
      return;
    }
    const values = toEventValues(draft);
    try {
      if (editing) {
        await updateEvent(editing.id, values);
        toast('Event updated.', 'success');
      } else {
        await createEvent(values);
        toast('Event created.', 'success');
      }
      setModalOpen(false);
      setEditing(null);
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Event could not be saved.', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setPendingDelete(true);
    try {
      await deleteEvent(deleting.id);
      toast('Event deleted.', 'success');
      setDeleting(null);
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Event could not be deleted.', 'error');
    } finally {
      setPendingDelete(false);
    }
  };

  const dueTaskForEvent = (event: CalendarEvent) => tasks.filter((task) => task.due_date?.slice(0, 10) === event.start_at.slice(0, 10) && task.status !== 'completed').slice(0, 3);

  if (loading) {
    return <div className="card h-96 animate-pulse rounded-2xl" />;
  }
  if (error || !data) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-xl font-display font-bold">Calendar could not load</h2>
        <p className="mt-2 text-sm text-muted">{error ?? 'Your calendar is unavailable.'}</p>
        <Button variant="secondary" className="mt-6" onClick={() => void refresh()}>Retry</Button>
      </div>
    );
  }

  const todayKey = toISODate(new Date());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Calendar</h2>
          <p className="text-sm text-muted">Month, week, and day views with tasks and events.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-default bg-surface p-1">
            {(['month', 'week', 'day'] as CalendarView[]).map((item) => (
              <button key={item} onClick={() => setView(item)} className={`btn h-8 rounded-lg px-3 text-xs font-semibold capitalize ${view === item ? 'bg-accent-500 text-white' : 'text-muted'}`}>{item}</button>
            ))}
          </div>
          <Button variant="primary" onClick={openCreate}><Plus className="h-4 w-4" /> Add event</Button>
        </div>
      </div>

      <div className="card p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-display font-bold capitalize">{view} view</h3>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={goPrevious} aria-label="Previous period"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="secondary" size="sm" onClick={goToday}>Today</Button>
            <Button variant="secondary" size="sm" onClick={goNext} aria-label="Next period"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        {view === 'month' ? (
          <div className="grid gap-2 sm:grid-cols-7">
            {weekDaysList.slice(0, 7).map((day) => <div key={toISODate(day)} className="rounded-xl bg-surface-soft p-2 text-center text-xs font-semibold text-muted">{format(day, 'EEE')}</div>)}
            {monthDays.map((day) => {
              const key = toISODate(day);
              const dayEventsList = eventsByDay.get(key) ?? [];
              const inMonth = day.getMonth() === cursor.getMonth();
              return (
                <button key={key} onClick={() => { setCursor(day); setView('day'); }} className={`min-h-[108px] rounded-xl border p-2 text-left transition hover:border-accent-400/40 ${inMonth ? 'border-default bg-surface' : 'border-transparent bg-slate-50 dark:bg-white/[0.01]'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSameDay(day, new Date()) ? 'text-accent-600 dark:text-accent-300' : 'text-muted'}`}>{format(day, 'd')}</span>
                  </div>
                  <div className="mt-1 space-y-1">
                    {dayEventsList.slice(0, 2).map((item) => (
                      <span
                        key={item.id}
                        onClick={() => openEdit(item)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(keyEvent) => {
                          if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                            keyEvent.preventDefault();
                            openEdit(item);
                          }
                        }}
                        className="block w-full cursor-pointer truncate rounded-md bg-accent-500/10 px-2 py-1 text-left text-[11px] font-medium text-accent-700 dark:text-accent-200"
                      >
                        {item.all_day ? 'All day · ' : ''}{item.title}
                      </span>
                    ))}
                    {dayEventsList.length > 2 ? <span className="px-2 text-[10px] text-muted">+{dayEventsList.length - 2} more</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        {view === 'week' ? (
          <div className="grid gap-3 sm:grid-cols-7">
            {weekDaysList.map((day) => (
              <div key={toISODate(day)} className="min-h-[260px] rounded-2xl border border-default p-3">
                <p className={`text-xs font-bold ${isSameDay(day, new Date()) ? 'text-accent-600 dark:text-accent-300' : 'text-muted'}`}>{format(day, 'EEE, MMM d')}</p>
                <div className="mt-2 space-y-2">
                  {(eventsByDay.get(toISODate(day)) ?? []).map((event) => (
                    <button key={event.id} onClick={() => openEdit(event)} className="block w-full rounded-xl border border-default p-2 text-left text-xs">
                      <span className="font-semibold">{event.all_day ? 'All day' : format(new Date(event.start_at), 'h:mm a')}</span>
                      <span className="mt-1 block truncate font-medium">{event.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {view === 'day' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{format(cursor, 'EEEE, MMMM d, yyyy')}</h4>
              <Badge tone="accent">{dayEvents.length} event(s)</Badge>
            </div>
            {dayEvents.length ? (
              <div className="space-y-2">
                {dayEvents.map((event) => (
                  <button key={event.id} onClick={() => openEdit(event)} className="flex w-full items-center gap-3 rounded-2xl border border-default p-3 text-left hover:border-accent-400/40">
                    <span className="h-10 w-1 rounded-full" style={{ backgroundColor: event.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{event.title}</p>
                      <p className="text-xs text-muted">{event.all_day ? 'All day' : `${format(new Date(event.start_at), 'p')} – ${format(new Date(event.end_at), 'p')}`}</p>
                    </div>
                    <Badge>{event.category}</Badge>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="No events scheduled" description="Add an event to your day." />
            )}
          </div>
        ) : null}
      </div>

      {view === 'day' ? (
        <section className="card p-5">
          <h3 className="font-display font-bold">Tasks due</h3>
          <div className="mt-3 space-y-2">
            {tasks.filter((task) => task.due_date?.slice(0, 10) === todayKey && task.status !== 'completed').map((task) => (
              <div key={task.id} className="rounded-xl border border-default p-3">
                <p className="text-sm font-semibold">{task.title}</p>
                <p className="text-xs text-muted">{task.category}</p>
              </div>
            ))}
            {!tasks.some((task) => task.due_date?.slice(0, 10) === todayKey && task.status !== 'completed') ? <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="No tasks due today" /> : null}
          </div>
        </section>
      ) : null}

      <EventModal open={modalOpen} event={editing} draft={draft} setDraft={setDraft} onClose={() => setModalOpen(false)} onSave={() => void saveEvent()} saving={false} />

      <Modal open={pendingDelete} title="Delete event" onClose={() => setPendingDelete(false)} widthClass="max-w-md">
        <p className="text-sm text-muted">Delete “{deleting?.title}” permanently?</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setPendingDelete(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => void confirmDelete()} disabled={pendingDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}

interface EventDraft {
  title: string;
  description: string;
  startLocal: string;
  endLocal: string;
  allDay: boolean;
  category: string;
  color: string;
  location: string;
  reminder_minutes: number | null;
}

function EventModal({ open, event, draft, setDraft, onClose, onSave, saving }: {
  open: boolean;
  event: CalendarEvent | null;
  draft: EventDraft;
  setDraft: Dispatch<SetStateAction<EventDraft>>;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Modal open={open} title={event ? 'Edit event' : 'New event'} onClose={onClose} widthClass="max-w-2xl">
      <div className="grid gap-4">
        <Field label="Title">
          <Input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Design review" autoFocus />
        </Field>
        <Field label="Description">
          <Textarea rows={3} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start">
            <Input type="datetime-local" value={draft.startLocal} onChange={(event) => setDraft((current) => ({ ...current, startLocal: event.target.value }))} />
          </Field>
          <Field label="End">
            <Input type="datetime-local" value={draft.endLocal} onChange={(event) => setDraft((current) => ({ ...current, endLocal: event.target.value }))} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Category">
            <Select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>
              {EVENT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </Select>
          </Field>
          <Field label="Color">
            <Input type="color" value={draft.color} onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))} className="h-10 p-1" />
          </Field>
          <Field label="Reminder minutes">
            <Input type="number" min={0} max={5256000} value={draft.reminder_minutes ?? ''} onChange={(event) => setDraft((current) => ({ ...current, reminder_minutes: event.target.value ? Number(event.target.value) : null }))} />
          </Field>
        </div>
        <Field label="Location">
          <Input value={draft.location} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.allDay} onChange={(event) => setDraft((current) => ({ ...current, allDay: event.target.checked }))} />
          All day
        </label>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : event ? 'Save event' : 'Create event'}</Button>
        </div>
      </div>
    </Modal>
  );
}
