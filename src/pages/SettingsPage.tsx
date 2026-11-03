import { useEffect, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Inputs';
import { Badge } from '../components/ui/Small';

const TIMEZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Australia/Sydney'];
const DATE_FORMATS = ['MMM d, yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'MMM d'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY', 'BRL'];

function presetAvatar(color: string, label: string) {
  const initial = label.trim().charAt(0).toUpperCase() || 'L';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${color}"/><stop offset="100%" stop-color="#5f88ff"/></linearGradient></defs><rect width="160" height="160" fill="url(#g)"/><circle cx="80" cy="80" r="38" fill="rgba(255,255,255,0.18)"/><text x="80" y="102" font-size="52" font-family="Arial" font-weight="700" fill="#ffffff" text-anchor="middle">${initial}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function SettingsPage() {
  const { user, profile, updateProfile, updatePassword, deleteAccount } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [timezone, setTimezone] = useState(profile?.timezone ?? 'UTC');
  const [dateFormat, setDateFormat] = useState(profile?.date_format ?? 'MMM d, yyyy');
  const [currency, setCurrency] = useState(profile?.currency ?? 'USD');
  const [theme, setTheme] = useState(profile?.theme ?? 'dark');
  const [weekStartsOn, setWeekStartsOn] = useState(profile?.week_starts_on ?? 0);
  const [taskReminders, setTaskReminders] = useState(profile?.notification_preferences.taskReminders ?? true);
  const [eventReminders, setEventReminders] = useState(profile?.notification_preferences.eventReminders ?? true);
  const [habitReminders, setHabitReminders] = useState(profile?.notification_preferences.habitReminders ?? true);
  const [browserNotifications, setBrowserNotifications] = useState(profile?.notification_preferences.browserNotifications ?? false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name);
    setAvatarUrl(profile.avatar_url);
    setTimezone(profile.timezone);
    setDateFormat(profile.date_format);
    setCurrency(profile.currency);
    setTheme(profile.theme);
    setWeekStartsOn(profile.week_starts_on);
    setTaskReminders(profile.notification_preferences.taskReminders);
    setEventReminders(profile.notification_preferences.eventReminders);
    setHabitReminders(profile.notification_preferences.habitReminders);
    setBrowserNotifications(profile.notification_preferences.browserNotifications);
  }, [profile]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const result = await updateProfile({
        full_name: fullName,
        avatar_url: avatarUrl,
        timezone,
        date_format: dateFormat,
        currency,
        theme,
        week_starts_on: weekStartsOn,
        dashboard_widgets: profile?.dashboard_widgets,
        notification_preferences: { taskReminders, eventReminders, habitReminders, browserNotifications },
      });
      if (result.ok) toast('Profile saved.', 'success');
      return result;
    } finally {
      setSaving(false);
    }
  };

  const onAvatarUpload = async (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const value = String(reader.result ?? '');
      if (value.length > 2_000_000) {
        toast('Avatar image is too large. Please choose an image under 2 MB.', 'error');
        return;
      }
      const result = await updateProfile({ avatar_url: value });
      if (result.ok) toast('Avatar updated.', 'success');
    };
  };

  const changePassword = async () => {
    const result = await updatePassword(currentPassword, newPassword);
    if (result.ok) {
      toast('Password updated.', 'success');
      setCurrentPassword('');
      setNewPassword('');
    } else {
      toast(result.error ?? 'Password could not be updated.', 'error');
    }
  };

  const requestAccountDeletion = async () => {
    if (confirmDelete !== 'DELETE_MY_ACCOUNT') {
      toast('Type DELETE_MY_ACCOUNT to confirm account deletion.', 'error');
      return;
    }
    setDeleting(true);
    try {
      const result = await deleteAccount();
      if (result.ok) toast('Your account and personal data were deleted.', 'success');
      else toast(result.error ?? 'Account deletion failed.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="card p-5">
        <div className="flex items-center gap-4">
          {avatarUrl ? <img src={avatarUrl} alt={user?.full_name || 'Avatar'} className="h-16 w-16 rounded-full object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent-400 to-blue-600 text-xl font-bold text-white">{(fullName || user?.email || 'L').charAt(0).toUpperCase()}</div>}
          <div>
            <h2 className="font-display text-2xl font-bold">Profile</h2>
            <p className="text-sm text-muted">{user?.email}</p>
            <Badge tone="accent">Personal account</Badge>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </Field>
          <Field label="Timezone">
            <Select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
              {TIMEZONES.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
          </Field>
          <Field label="Date format">
            <Select value={dateFormat} onChange={(event) => setDateFormat(event.target.value)}>
              {DATE_FORMATS.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
          </Field>
          <Field label="Currency">
            <Select value={currency} onChange={(event) => setCurrency(event.target.value)}>
              {CURRENCIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
          </Field>
          <Field label="Week starts on">
            <Select value={String(weekStartsOn)} onChange={(event) => setWeekStartsOn(Number(event.target.value))}>
              {[0, 1, 2, 3, 4, 5, 6].map((day) => <option key={day} value={day}>{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]}</option>)}
            </Select>
          </Field>
          <Field label="Theme">
            <Select value={theme} onChange={(event) => setTheme(event.target.value as 'dark' | 'light')}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </Select>
          </Field>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => void saveProfile()} disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</Button>
          <label className="btn-secondary btn h-10 cursor-pointer px-4 text-sm font-semibold">
            <Camera className="h-4 w-4" /> Upload avatar
            <input type="file" accept="image/*" className="hidden" onChange={(event) => void onAvatarUpload(event.target.files?.[0])} />
          </label>
          <Select value={avatarUrl ?? presetAvatar('#7857f6', fullName)} onChange={(event) => setAvatarUrl(event.target.value)}>
            <option value="">Use initials avatar</option>
            <option value={presetAvatar('#7857f6', fullName || 'L')}>Violet</option>
            <option value={presetAvatar('#5f88ff', fullName || 'L')}>Blue</option>
            <option value={presetAvatar('#22c1a3', fullName || 'L')}>Green</option>
            <option value={presetAvatar('#ff8a5c', fullName || 'L')}>Orange</option>
            <option value={presetAvatar('#ff5c8a', fullName || 'L')}>Rose</option>
          </Select>
        </div>
      </section>

      <section className="space-y-6">
        <div className="card p-5">
          <h3 className="font-display font-bold">Notifications</h3>
          <div className="mt-4 space-y-3">
            {([
              ['taskReminders', 'Task reminders'],
              ['eventReminders', 'Event reminders'],
              ['habitReminders', 'Habit reminders'],
              ['browserNotifications', 'Browser notifications'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-xl border border-default p-3 text-sm">
                <span>{label}</span>
                <input type="checkbox" checked={key === 'taskReminders' ? taskReminders : key === 'eventReminders' ? eventReminders : key === 'habitReminders' ? habitReminders : browserNotifications} onChange={(event) => {
                  const value = event.target.checked;
                  if (key === 'taskReminders') setTaskReminders(value);
                  if (key === 'eventReminders') setEventReminders(value);
                  if (key === 'habitReminders') setHabitReminders(value);
                  if (key === 'browserNotifications') setBrowserNotifications(value);
                }} className="h-4 w-4 accent-accent-500" />
              </label>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-display font-bold">Account security</h3>
          <div className="mt-4 space-y-3">
            <Input type="password" placeholder="Current password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" />
            <Input type="password" placeholder="New password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" />
            <Button variant="secondary" onClick={() => void changePassword()} disabled={!currentPassword || !newPassword}>Update password</Button>
          </div>
        </div>
      </section>

      <section className="card border-rose-500/30 p-5 xl:col-span-2">
        <h3 className="font-display font-bold text-rose-600">Danger zone</h3>
        <p className="mt-2 text-sm text-muted">Deleting your account permanently removes your profile and personal LifeOS data. This action cannot be undone.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Input placeholder="Type DELETE_MY_ACCOUNT" value={confirmDelete} onChange={(event) => setConfirmDelete(event.target.value)} />
          <Button variant="danger" onClick={() => void requestAccountDeletion()} disabled={deleting || confirmDelete !== 'DELETE_MY_ACCOUNT'}>{deleting ? 'Deleting…' : 'Delete account'}</Button>
        </div>
      </section>
    </div>
  );
}
