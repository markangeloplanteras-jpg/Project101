import { useEffect, useMemo, useState } from 'react';
import { Pin, PinOff, Plus, Search, Trash2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { Badge, EmptyState } from '../components/ui/Small';
import { Button } from '../components/ui/Button';
import { Field, Input, Select, Textarea } from '../components/ui/Inputs';
import { Modal } from '../components/ui/Modal';
import { NOTE_CATEGORIES } from '../lib/constants';
import type { Note } from '../types';

interface NoteDraft {
  title: string;
  content: string;
  category: string;
  color: string;
  is_pinned: boolean;
}

export function NotesPage() {
  const { data, loading, error, refresh, createNote, updateNote, deleteNote } = useData();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NoteDraft>({ title: '', content: '', category: 'General', color: '#7857f6', is_pinned: false });
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Note | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);

  const notes = data?.notes ?? [];
  const selected = notes.find((note) => note.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) {
      setDraft({ title: selected.title, content: selected.content, category: selected.category, color: selected.color, is_pinned: selected.is_pinned });
      setSavedAt(selected.updated_at);
    }
  }, [selected]);

  const visibleNotes = useMemo(() => {
    return [...notes]
      .filter((note) => !pinnedOnly || note.is_pinned)
      .filter((note) => category === 'all' || note.category === category)
      .filter((note) => !query || note.title.toLowerCase().includes(query.toLowerCase()) || note.content.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || b.updated_at.localeCompare(a.updated_at));
  }, [notes, query, category, pinnedOnly]);

  const startNew = async () => {
    const note = await createNote({ title: '', content: '', category: 'General', is_pinned: false, color: '#7857f6' });
    setSelectedId(note.id);
    setDraft({ title: note.title, content: note.content, category: note.category, color: note.color, is_pinned: note.is_pinned });
    setSavedAt(note.updated_at);
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updateNote(selected.id, { ...draft, title: draft.title || 'Untitled note' });
      setSelectedId(updated.id);
      setSavedAt(updated.updated_at);
      toast('Note saved.', 'success');
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Note could not be saved.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (note: Note) => {
    const updated = await updateNote(note.id, { is_pinned: !note.is_pinned });
    setSelectedId(updated.id);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setPendingDelete(true);
    try {
      await deleteNote(deleting.id);
      setSelectedId(null);
      toast('Note deleted.', 'success');
      setDeleting(null);
    } finally {
      setPendingDelete(false);
    }
  };

  if (loading) return <div className="card h-96 animate-pulse rounded-2xl" />;
  if (error || !data) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-xl font-display font-bold">Notes could not load</h2>
        <p className="mt-2 text-sm text-muted">{error ?? 'Your notes are unavailable.'}</p>
        <Button variant="secondary" className="mt-6" onClick={() => void refresh()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold">Notes</h2>
          <Button variant="primary" size="sm" onClick={() => void startNew()}><Plus className="h-4 w-4" /> New</Button>
        </div>
        <div className="card p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" placeholder="Search notes" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <Select className="mt-3" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {NOTE_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pinnedOnly} onChange={(event) => setPinnedOnly(event.target.checked)} /> Pinned only
          </label>
        </div>
        <div className="space-y-2">
          {visibleNotes.map((note) => (
            <button key={note.id} onClick={() => setSelectedId(note.id)} className={`card card-hover w-full p-4 text-left ${selectedId === note.id ? 'border-accent-400/50' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{note.title || 'Untitled note'}</p>
                {note.is_pinned ? <Pin className="h-4 w-4 text-accent-500" /> : null}
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{note.content || 'No content yet.'}</p>
              <p className="mt-2 text-xs text-muted">{note.category}</p>
            </button>
          ))}
          {!visibleNotes.length ? <EmptyState icon={<Search className="h-6 w-6" />} title="No notes found" description="Create a note or adjust your filters." /> : null}
        </div>
      </div>

      <div className="card min-h-[28rem] p-5">
        {selected ? (
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Note title" />
                <p className="mt-1 text-xs text-muted">Saved {savedAt ? new Date(savedAt).toLocaleString() : '—'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => void togglePin(selected)}>{selected.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}</Button>
                <Button variant="ghost" size="sm" className="text-rose-500" onClick={() => setDeleting(selected)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>
                {NOTE_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </Select>
              <Input type="color" value={draft.color} onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))} className="h-10 p-1" />
            </div>
            <Textarea rows={14} value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} placeholder="Start writing…" className="mt-4" />
            <div className="mt-4 flex justify-end">
              <Button variant="primary" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Save note'}</Button>
            </div>
          </div>
        ) : (
          <EmptyState icon={<Plus className="h-6 w-6" />} title="Select a note" description="Choose a note from the list or create a new one." />
        )}
      </div>

      <Modal open={pendingDelete} title="Delete note" onClose={() => setPendingDelete(false)} widthClass="max-w-md">
        <p className="text-sm text-muted">Delete “{deleting?.title || 'this note'}” permanently?</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setPendingDelete(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => void confirmDelete()} disabled={pendingDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
