import type { Profile } from '../../src/types/index.js';

type Row = Record<string, any>;

export function serializeProfile(row: Row): Profile {
  const rawWidgets = typeof row?.dashboard_widgets === 'string' ? safeJson(row.dashboard_widgets) : row?.dashboard_widgets;
  const rawNotifications = typeof row?.notification_preferences === 'string' ? safeJson(row.notification_preferences) : row?.notification_preferences;
  const widgets = rawWidgets ?? {};
  const notifications = rawNotifications ?? {};
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name ?? '',
    avatar_url: row.avatar_url ?? null,
    timezone: row.timezone ?? 'UTC',
    date_format: row.date_format ?? 'MMM d, yyyy',
    currency: row.currency ?? 'USD',
    theme: row.theme === 'light' ? 'light' : 'dark',
    week_starts_on: Number(row.week_starts_on ?? 0),
    dashboard_widgets: {
      stats: widgets.stats !== false,
      taskFocus: widgets.taskFocus !== false,
      habits: widgets.habits !== false,
      upcoming: widgets.upcoming !== false,
      productivity: widgets.productivity !== false,
      spending: widgets.spending !== false,
      notes: widgets.notes !== false,
      quickActions: widgets.quickActions !== false,
    },
    notification_preferences: {
      taskReminders: notifications.taskReminders !== false,
      eventReminders: notifications.eventReminders !== false,
      habitReminders: notifications.habitReminders !== false,
      browserNotifications: notifications.browserNotifications === true,
    },
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function safeJson(value: unknown): Record<string, any> {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === 'object' ? value : {};
}
