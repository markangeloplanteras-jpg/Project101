import { useMemo, useState } from 'react';
import { Bell, BellRing, CheckCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/Small';
import { Badge } from '../components/ui/Small';
import { cn } from '../lib/cn';
import type { AppNotification } from '../types';

export function NotificationsPage() {
  const { data, loading, error, refresh, updateNotification, deleteNotification } = useData();
  const { profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => (typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'));

  const notifications = data?.notifications ?? [];
  const preferences = profile?.notification_preferences;

  const unread = useMemo(() => notifications.filter((notification) => !notification.read_at), [notifications]);
  const sorted = useMemo(() => [...notifications].sort((a, b) => b.created_at.localeCompare(a.created_at)), [notifications]);

  const markRead = async (notification: AppNotification) => {
    const updated = await updateNotification(notification.id, { read_at: new Date().toISOString() });
    return updated;
  };

  const markAllRead = async () => {
    for (const notification of unread) {
      await updateNotification(notification.id, { read_at: new Date().toISOString() });
    }
    toast('All notifications marked as read.', 'success');
  };

  const clearAll = async () => {
    for (const notification of notifications) {
      await deleteNotification(notification.id);
    }
    toast('Notifications cleared.', 'success');
  };

  const requestBrowserPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast('This browser does not support web notifications.', 'info');
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const updatePreference = async (key: 'taskReminders' | 'eventReminders' | 'habitReminders', value: boolean) => {
    if (!profile) return;
    await updateProfile({ notification_preferences: { ...profile.notification_preferences, [key]: value } });
  };

  if (loading) return <div className="card h-96 animate-pulse rounded-2xl" />;
  if (error || !data) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-xl font-display font-bold">Notifications could not load</h2>
        <p className="mt-2 text-sm text-muted">{error ?? 'Your notifications are unavailable.'}</p>
        <Button variant="secondary" className="mt-6" onClick={() => void refresh()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold">Notifications</h2>
            <p className="text-sm text-muted">In-app reminders and updates from LifeOS.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => void markAllRead()} disabled={!unread.length}><CheckCheck className="h-4 w-4" /> Mark all read</Button>
            <Button variant="ghost" size="sm" className="text-rose-500" onClick={() => void clearAll()} disabled={!notifications.length}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {sorted.map((notification) => (
            <div key={notification.id} className={cn('rounded-2xl border p-4', notification.read_at ? 'border-default bg-surface/60' : 'border-accent-400/40 bg-accent-500/5')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{notification.title}</p>
                  <p className="mt-1 text-sm text-muted">{notification.message}</p>
                  <p className="mt-2 text-xs text-muted">{new Date(notification.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={notification.type === 'task' ? 'accent' : notification.type === 'event' ? 'blue' : notification.type === 'habit' ? 'green' : notification.type === 'finance' ? 'amber' : 'default'}>{notification.type}</Badge>
                  {!notification.read_at ? <Button variant="ghost" size="sm" onClick={() => void markRead(notification)}>Mark read</Button> : null}
                  <Button variant="ghost" size="sm" className="text-rose-500" onClick={() => deleteNotification(notification.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          ))}
          {!sorted.length ? <EmptyState icon={<Bell className="h-6 w-6" />} title="No notifications yet" description="Task, event, habit, and finance reminders will appear here." /> : null}
        </div>
      </section>

      <aside className="space-y-6">
        <section className="card p-5">
          <h3 className="font-display font-bold">Browser notifications</h3>
          <p className="mt-2 text-sm text-muted">Permission is requested only when you enable it. LifeOS shows in-app reminders while the app is open; browser delivery depends on browser support and settings.</p>
          <div className="mt-4 flex items-center gap-3">
            <span className={cn('badge', permission === 'granted' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : permission === 'denied' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-slate-500/10 text-slate-600 dark:text-slate-300')}>
              {permission}
            </span>
            {permission !== 'denied' ? <Button variant="secondary" size="sm" onClick={() => void requestBrowserPermission()}>Enable</Button> : null}
          </div>
          <div className="mt-5 space-y-3">
            {([
              ['taskReminders', 'Task reminders'],
              ['eventReminders', 'Event reminders'],
              ['habitReminders', 'Habit reminders'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-xl border border-default p-3 text-sm">
                <span>{label}</span>
                <input type="checkbox" checked={preferences?.[key]} onChange={(event) => void updatePreference(key, event.target.checked)} className="h-4 w-4 accent-accent-500" />
              </label>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h3 className="font-display font-bold">Reminder status</h3>
          <p className="mt-2 text-sm text-muted">You have {unread.length} unread notification(s).</p>
          {unread.length ? <Badge tone="accent"><BellRing className="h-3.5 w-3.5" /> Needs attention</Badge> : <Badge tone="green">All caught up</Badge>}
        </section>
      </aside>
    </div>
  );
}
