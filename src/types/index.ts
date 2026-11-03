export type Theme = 'dark' | 'light';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type Recurrence = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';
export type Mood = 'great' | 'good' | 'okay' | 'low' | 'awful';
export type TransactionType = 'income' | 'expense';
export type HabitFrequency = 'daily' | 'weekly' | 'custom';

export interface DashboardPreferences {
  stats: boolean;
  taskFocus: boolean;
  habits: boolean;
  upcoming: boolean;
  productivity: boolean;
  spending: boolean;
  notes: boolean;
  quickActions: boolean;
}

export interface NotificationPreferences {
  taskReminders: boolean;
  eventReminders: boolean;
  habitReminders: boolean;
  browserNotifications: boolean;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  timezone: string;
  date_format: string;
  currency: string;
  theme: Theme;
  week_starts_on: number;
  dashboard_widgets: DashboardPreferences;
  notification_preferences: NotificationPreferences;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
}

export interface Task {
  id: string;
  user_id?: string;
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  recurrence: Recurrence;
  tags: string[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  subtasks?: Subtask[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  category: string;
  color: string;
  location: string;
  reminder_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface Habit {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  days_of_week: number[];
  target_per_week: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  completed_on: string;
  note: string;
  created_at: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  entry_date: string;
  title: string;
  content: string;
  mood: Mood | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  transaction_date: string;
  payment_method: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  category: string;
  amount_limit: number;
  period_month: string;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  color: string;
  icon: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export type NotificationType = 'task' | 'event' | 'habit' | 'system' | 'finance';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  due_at: string;
  dedupe_key: string | null;
  created_at: string;
}

export interface AIConversation {
  id: string;
  title: string;
  model: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface BootstrapData {
  profile: Profile;
  tasks: Task[];
  subtasks: Subtask[];
  events: CalendarEvent[];
  habits: Habit[];
  habitLogs: HabitLog[];
  notes: Note[];
  journalEntries: JournalEntry[];
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  notifications: AppNotification[];
  aiConversations: AIConversation[];
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
}

export interface AIStatus {
  configured: boolean;
  model?: string;
  provider?: string;
  message?: string;
}

export interface AssistantContext {
  tasksDueToday: number;
  completedThisWeek: number;
  habits: string[];
  eventsToday: string[];
  topPriorities: string[];
}

export type EntityName =
  | 'tasks'
  | 'subtasks'
  | 'events'
  | 'habits'
  | 'habit_logs'
  | 'notes'
  | 'journal_entries'
  | 'transactions'
  | 'budgets'
  | 'savings_goals'
  | 'notifications'
  | 'ai_conversations';
