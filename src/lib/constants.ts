export const TASK_CATEGORIES = [
  'General',
  'Work',
  'Personal',
  'Health',
  'Finance',
  'Errands',
  'Home',
  'Learning',
  'Other',
] as const;

export const EVENT_CATEGORIES = ['Personal', 'Work', 'Family', 'Health', 'Social', 'Other'] as const;

export const NOTE_CATEGORIES = ['General', 'Personal', 'Work', 'Idea', 'Journal'] as const;

export const EXPENSE_CATEGORIES = [
  'Housing',
  'Food',
  'Transport',
  'Utilities',
  'Insurance',
  'Healthcare',
  'Entertainment',
  'Shopping',
  'Education',
  'Savings',
  'Other',
] as const;

export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investments', 'Business', 'Gifts', 'Other'] as const;

export const HABIT_COLORS = ['#7857f6', '#5f88ff', '#22c1a3', '#ff8a5c', '#ff5c8a', '#f5c04c', '#34a8ff', '#9d6cff'];
export const EVENT_COLORS = ['#7857f6', '#5f88ff', '#22c1a3', '#ff8a5c', '#ff5c8a', '#f5c04c', '#34a8ff', '#9d6cff'];
export const NOTE_COLORS = ['#7857f6', '#5f88ff', '#22c1a3', '#ff8a5c', '#ff5c8a', '#f5c04c', '#34a8ff', '#9d6cff'];

export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const TASK_STATUSES = ['todo', 'in_progress', 'completed'] as const;
export const RECURRENCES = ['none', 'daily', 'weekdays', 'weekly', 'monthly'] as const;
export const MOODS = ['great', 'good', 'okay', 'low', 'awful'] as const;
export const NOTIFICATION_TYPES = ['task', 'event', 'habit', 'system', 'finance'] as const;

export const DEFAULT_DASHBOARD_WIDGETS = {
  stats: true,
  taskFocus: true,
  habits: true,
  upcoming: true,
  productivity: true,
  spending: true,
  notes: true,
  quickActions: true,
};
