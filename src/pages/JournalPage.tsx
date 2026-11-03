import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { Field, Select, Textarea } from '../components/ui/Inputs';
import { Modal } from '../components/ui/Modal';
import { MOODS } from '../lib/constants';
import { fromISODate, toISODate } from '../lib/date';
import type { JournalEntry, Mood } from '../types';

export function JournalPage() {
  const { data, loading, error, refresh, createJournal, updateJournal, deleteJournal } = useData();
  const { toast } = useToast();
  const [cursor, setCursor] = useState(() => new Date());
  const [draft, setDraft] = useState({ title: '', content: '', mood: null as Mood | null });
  const [saved, setSaved] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<JournalEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);

  const selectedDate = toISODate(cursor);
  const entries = data?.journalEntries ?? [];
  const entry = entries.find((item) => item.entry_date === selectedDate) ?? null;

  useEffect(() => {
    setDraft({ title: entry?.title ?? '', content: entry?.content ?? '', mood: entry?.mood ?? null });
    setSaved(Boolean(entry));
    setSaveError(null);
  }, [selectedDate, entry]);

  const autosave = async () => {
    if (!draft.title.trim() && !draft.content.trim() && !draft.mood) {
      setSaved(true);
      return;
    }
    const values = { entry_date: selectedDate, title: draft.title, content: draft.content, mood: draft.mood };
    try {
      if (entry) {
        const updated = await updateJournal(entry.id, values);
        setSaved(true);
        setSaveError(null);
        return updated;
      }
      const created = await createJournal(values);
      setSaved(true);
      setSaveError(null);
      return created;
    } catch (caught) {
      setSaved(false);
      setSaveError(caught instanceof Error ? caught.message : 'Journal entry could not be saved.');
      return null;
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void autosave(), 700);
    return () => window.clearTimeout(timer);
  }, [draft, selectedDate]);

  const saveNow = async () => {
    const savedEntry = await autosave();
    if (savedEntry) setSaved(true);
  };

  const changeMood = (mood: Mood) => {
    setDraft((current) => ({ ...current, mood }));
    setSaved(false);
  };

  const entriesList = useMemo(() => [...entries].sort((a, b) => b.entry_date.localeCompare(a.entry_date)), [entries]);

  const confirmDelete = async () => {
    if (!deleting) return;
    setPendingDelete(true);
    try {
      await deleteJournal(deleting.id);
      setDeleting(null);
      toast('Journal entry deleted.', 'success');
    } finally {
      setPendingDelete(false);
    }
  };

  if (loading) return <div className="card h-96 animate-pulse rounded-2xl" />;
  if (error || !data) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-xl font-display font-bold">Journal could not load</h2>
        <p className="mt-2 text-sm text-muted">{error ?? 'Your journal is unavailable.'}</p>
        <Button variant="secondary" className="mt-6" onClick={() => void refresh()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold">Journal</h2>
            <p className="text-sm text-muted">Private reflections and mood check-ins.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setCursor((current) => new Date(current.getTime() - 86_400_000))}><ChevronLeft className="h-4 w-4" /> Prev</Button>
            <Button variant="secondary" size="sm" onClick={() => setCursor(new Date())}>Today</Button>
            <Button variant="secondary" size="sm" onClick={() => setCursor((current) => new Date(current.getTime() + 86_400_000))}><ChevronRight className="h-4 w-4" /> Next</Button>
          </div>
        </div>
        <div className="mt-5">
          <Field label="Mood">
            <div className="flex flex-wrap gap-2">
              {MOODS.map((mood) => (
                <button key={mood} type="button" onClick={() => changeMood(mood)} className={`btn h-10 rounded-xl border px-4 text-sm font-semibold ${draft.mood === mood ? 'border-accent-500/40 bg-accent-500/10 text-accent-600' : 'border-default text-muted'}`}>
                  {mood}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Reflection">
            <Textarea rows={12} value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} placeholder="How are you feeling? What mattered today?" />
          </Field>
          <Field label="Title">
            <input className="field" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder={`Journal — ${selectedDate}`} />
          </Field>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-muted">Private · autosaves as you type</p>
            <Button variant="primary" size="sm" onClick={() => void saveNow()} disabled={saveError !== null}>Save now</Button>
          </div>
          {saveError ? <p className="error-text mt-3">{saveError}</p> : null}
          <p className="mt-2 text-xs text-muted">Saved status: {saved ? 'Saved' : 'Saving…'}</p>
        </div>
      </div>

      <aside className="card p-4">
        <h3 className="font-display font-bold">Entries</h3>
        <div className="mt-3 space-y-2">
          {entriesList.slice(0, 12).map((entry) => (
            <button key={entry.id} onClick={() => setCursor(fromISODate(entry.entry_date))} className={`w-full rounded-xl border p-3 text-left ${entry.entry_date === selectedDate ? 'border-accent-400/50 bg-accent-500/5' : 'border-default'}`}>
              <p className="text-sm font-semibold">{entry.entry_date}</p>
              <p className="line-clamp-2 text-xs text-muted">{entry.content || 'No reflection yet.'}</p>
            </button>
          ))}
          {!entriesList.length ? <p className="text-sm text-muted">No entries yet.</p> : null}
        </div>
        {entry ? (
          <Button variant="danger" size="sm" className="mt-4" onClick={() => setDeleting(entry)}><Trash2 className="h-4 w-4" /> Delete entry</Button>
        ) : null}
      </aside>

      <Modal open={pendingDelete} title="Delete journal entry" onClose={() => setPendingDelete(false)} widthClass="max-w-md">
        <p className="text-sm text-muted">Delete the journal entry for {deleting?.entry_date}?</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setPendingDelete(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => void confirmDelete()} disabled={pendingDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
