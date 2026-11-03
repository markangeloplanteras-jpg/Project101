import { createContext, useCallback, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { AIMessage, AppNotification, AIConversation, Budget, BootstrapData, CalendarEvent, Habit, HabitLog, JournalEntry, Note, SavingsGoal, Subtask, Task, Transaction } from '../types';
import { bootstrapApi, dataApi } from '../lib/api';
import { useAuth } from './AuthContext';

interface DataContextValue {
  data: BootstrapData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setSubtasks: React.Dispatch<React.SetStateAction<Subtask[]>>;
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>;
  setHabitLogs: React.Dispatch<React.SetStateAction<HabitLog[]>>;
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  setJournalEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setBudgets: React.Dispatch<React.SetStateAction<Budget[]>>;
  setSavingsGoals: React.Dispatch<React.SetStateAction<SavingsGoal[]>>;
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  setAiConversations: React.Dispatch<React.SetStateAction<AIConversation[]>>;
  setProfile: React.Dispatch<React.SetStateAction<BootstrapData['profile'] | null>>;
  createTask: (values: Omit<Task, 'user_id' | 'id' | 'created_at' | 'updated_at' | 'completed_at'>) => Promise<Task>;
  updateTask: (id: string, values: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  createSubtask: (taskId: string, title: string, position: number) => Promise<Subtask>;
  updateSubtask: (id: string, values: Partial<Subtask>) => Promise<Subtask>;
  deleteSubtask: (id: string) => Promise<void>;
  createEvent: (values: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<CalendarEvent>;
  updateEvent: (id: string, values: Partial<CalendarEvent>) => Promise<CalendarEvent>;
  deleteEvent: (id: string) => Promise<void>;
  createHabit: (values: Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'archived'>) => Promise<Habit>;
  updateHabit: (id: string, values: Partial<Habit>) => Promise<Habit>;
  deleteHabit: (id: string) => Promise<void>;
  createHabitLog: (habitId: string, completedOn: string, note?: string) => Promise<HabitLog>;
  deleteHabitLog: (id: string) => Promise<void>;
  createNote: (values: Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Note>;
  updateNote: (id: string, values: Partial<Note>) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
  createJournal: (values: Omit<JournalEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<JournalEntry>;
  updateJournal: (id: string, values: Partial<JournalEntry>) => Promise<JournalEntry>;
  deleteJournal: (id: string) => Promise<void>;
  createTransaction: (values: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Transaction>;
  updateTransaction: (id: string, values: Partial<Transaction>) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  createBudget: (values: Omit<Budget, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Budget>;
  updateBudget: (id: string, values: Partial<Budget>) => Promise<Budget>;
  deleteBudget: (id: string) => Promise<void>;
  createSavingsGoal: (values: Omit<SavingsGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<SavingsGoal>;
  updateSavingsGoal: (id: string, values: Partial<SavingsGoal>) => Promise<SavingsGoal>;
  deleteSavingsGoal: (id: string) => Promise<void>;
  createNotification: (values: Omit<AppNotification, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'read_at'>) => Promise<AppNotification>;
  updateNotification: (id: string, values: Partial<AppNotification>) => Promise<AppNotification>;
  deleteNotification: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

const withId = <T extends { id: string }>(items: T[], item: T) => [item, ...items.filter((entry) => entry.id !== item.id)];

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setTasks: Dispatch<SetStateAction<Task[]>> = (updater) =>
    setData((current) => (current ? { ...current, tasks: typeof updater === 'function' ? updater(current.tasks) : updater } : current));
  const setSubtasks: Dispatch<SetStateAction<Subtask[]>> = (updater) =>
    setData((current) => (current ? { ...current, subtasks: typeof updater === 'function' ? updater(current.subtasks) : updater } : current));
  const setEvents: Dispatch<SetStateAction<CalendarEvent[]>> = (updater) =>
    setData((current) => (current ? { ...current, events: typeof updater === 'function' ? updater(current.events) : updater } : current));
  const setHabits: Dispatch<SetStateAction<Habit[]>> = (updater) =>
    setData((current) => (current ? { ...current, habits: typeof updater === 'function' ? updater(current.habits) : updater } : current));
  const setHabitLogs: Dispatch<SetStateAction<HabitLog[]>> = (updater) =>
    setData((current) => (current ? { ...current, habitLogs: typeof updater === 'function' ? updater(current.habitLogs) : updater } : current));
  const setNotes: Dispatch<SetStateAction<Note[]>> = (updater) =>
    setData((current) => (current ? { ...current, notes: typeof updater === 'function' ? updater(current.notes) : updater } : current));
  const setJournalEntries: Dispatch<SetStateAction<JournalEntry[]>> = (updater) =>
    setData((current) => (current ? { ...current, journalEntries: typeof updater === 'function' ? updater(current.journalEntries) : updater } : current));
  const setTransactions: Dispatch<SetStateAction<Transaction[]>> = (updater) =>
    setData((current) => (current ? { ...current, transactions: typeof updater === 'function' ? updater(current.transactions) : updater } : current));
  const setBudgets: Dispatch<SetStateAction<Budget[]>> = (updater) =>
    setData((current) => (current ? { ...current, budgets: typeof updater === 'function' ? updater(current.budgets) : updater } : current));
  const setSavingsGoals: Dispatch<SetStateAction<SavingsGoal[]>> = (updater) =>
    setData((current) => (current ? { ...current, savingsGoals: typeof updater === 'function' ? updater(current.savingsGoals) : updater } : current));
  const setNotifications: Dispatch<SetStateAction<AppNotification[]>> = (updater) =>
    setData((current) => (current ? { ...current, notifications: typeof updater === 'function' ? updater(current.notifications) : updater } : current));
  const setAiConversations: Dispatch<SetStateAction<AIConversation[]>> = (updater) =>
    setData((current) => (current ? { ...current, aiConversations: typeof updater === 'function' ? updater(current.aiConversations) : updater } : current));
  const setProfile: Dispatch<SetStateAction<BootstrapData['profile'] | null>> = (updater) =>
    setData((current) => (current ? { ...current, profile: (typeof updater === 'function' ? updater(current.profile) : updater) as BootstrapData['profile'] } : current));

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await bootstrapApi.get();
      setData(response.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Your data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void refresh();
  }, [user, refresh]);

  const value: DataContextValue = {
    data,
    loading,
    error,
    refresh,
    setTasks: (updater) =>
      setData((current) => (current ? { ...current, tasks: typeof updater === 'function' ? updater(current.tasks) : updater } : current)),
    setSubtasks: (updater) =>
      setData((current) => (current ? { ...current, subtasks: typeof updater === 'function' ? updater(current.subtasks) : updater } : current)),
    setEvents: (updater) =>
      setData((current) => (current ? { ...current, events: typeof updater === 'function' ? updater(current.events) : updater } : current)),
    setHabits: (updater) =>
      setData((current) => (current ? { ...current, habits: typeof updater === 'function' ? updater(current.habits) : updater } : current)),
    setHabitLogs: (updater) =>
      setData((current) => (current ? { ...current, habitLogs: typeof updater === 'function' ? updater(current.habitLogs) : updater } : current)),
    setNotes: (updater) =>
      setData((current) => (current ? { ...current, notes: typeof updater === 'function' ? updater(current.notes) : updater } : current)),
    setJournalEntries: (updater) =>
      setData((current) => (current ? { ...current, journalEntries: typeof updater === 'function' ? updater(current.journalEntries) : updater } : current)),
    setTransactions: (updater) =>
      setData((current) => (current ? { ...current, transactions: typeof updater === 'function' ? updater(current.transactions) : updater } : current)),
    setBudgets: (updater) =>
      setData((current) => (current ? { ...current, budgets: typeof updater === 'function' ? updater(current.budgets) : updater } : current)),
    setSavingsGoals: (updater) =>
      setData((current) => (current ? { ...current, savingsGoals: typeof updater === 'function' ? updater(current.savingsGoals) : updater } : current)),
    setNotifications: (updater) =>
      setData((current) => (current ? { ...current, notifications: typeof updater === 'function' ? updater(current.notifications) : updater } : current)),
    setAiConversations: (updater) =>
      setData((current) => (current ? { ...current, aiConversations: typeof updater === 'function' ? updater(current.aiConversations) : updater } : current)),
    setProfile: (updater) =>
      setData((current) => (current ? { ...current, profile: (typeof updater === 'function' ? updater(current.profile) : updater) as BootstrapData['profile'] } : current)),
    createTask: async (values) => {
      const task = await dataApi.create<Task>('tasks', values);
      setTasks((current) => (task ? [task, ...current.filter((item) => item.id !== task.id)] : current));
      return task;
    },
    updateTask: async (id, values) => {
      const task = await dataApi.update<Task>('tasks', id, values);
      setTasks((current) => current.map((item) => (item.id === id ? task : item)));
      return task;
    },
    deleteTask: async (id) => {
      await dataApi.remove('tasks', id);
      setTasks((current) => current.filter((item) => item.id !== id));
    },
    createSubtask: async (taskId, title, position) => {
      const subtask = await dataApi.create<Subtask>('subtasks', { task_id: taskId, title, position, completed: false });
      setSubtasks((current) => [...current, subtask]);
      return subtask;
    },
    updateSubtask: async (id, values) => {
      const subtask = await dataApi.update<Subtask>('subtasks', id, values);
      setSubtasks((current) => current.map((item) => (item.id === id ? subtask : item)));
      return subtask;
    },
    deleteSubtask: async (id) => {
      await dataApi.remove('subtasks', id);
      setSubtasks((current) => current.filter((item) => item.id !== id));
    },
    createEvent: async (values) => {
      const event = await dataApi.create<CalendarEvent>('events', values);
      setEvents((current) => [...current, event]);
      return event;
    },
    updateEvent: async (id, values) => {
      const event = await dataApi.update<CalendarEvent>('events', id, values);
      setEvents((current) => current.map((item) => (item.id === id ? event : item)));
      return event;
    },
    deleteEvent: async (id) => {
      await dataApi.remove('events', id);
      setEvents((current) => current.filter((item) => item.id !== id));
    },
    createHabit: async (values) => {
      const habit = await dataApi.create<Habit>('habits', values);
      setHabits((current) => [...current, habit]);
      return habit;
    },
    updateHabit: async (id, values) => {
      const habit = await dataApi.update<Habit>('habits', id, values);
      setHabits((current) => current.map((item) => (item.id === id ? habit : item)));
      return habit;
    },
    deleteHabit: async (id) => {
      await dataApi.remove('habits', id);
      setHabits((current) => current.filter((item) => item.id !== id));
    },
    createHabitLog: async (habitId, completedOn, note = '') => {
      const log = await dataApi.create<HabitLog>('habit_logs', { habit_id: habitId, completed_on: completedOn, note });
      setHabitLogs((current) => [log, ...current.filter((item) => item.id !== log.id)]);
      return log;
    },
    deleteHabitLog: async (id) => {
      await dataApi.remove('habit_logs', id);
      setHabitLogs((current) => current.filter((item) => item.id !== id));
    },
    createNote: async (values) => {
      const note = await dataApi.create<Note>('notes', values);
      setNotes((current) => [note, ...current.filter((item) => item.id !== note.id)]);
      return note;
    },
    updateNote: async (id, values) => {
      const note = await dataApi.update<Note>('notes', id, values);
      setNotes((current) => current.map((item) => (item.id === id ? note : item)));
      return note;
    },
    deleteNote: async (id) => {
      await dataApi.remove('notes', id);
      setNotes((current) => current.filter((item) => item.id !== id));
    },
    createJournal: async (values) => {
      const entry = await dataApi.create<JournalEntry>('journal_entries', values);
      setJournalEntries((current) => [entry, ...current.filter((item) => item.id !== entry.id)]);
      return entry;
    },
    updateJournal: async (id, values) => {
      const entry = await dataApi.update<JournalEntry>('journal_entries', id, values);
      setJournalEntries((current) => current.map((item) => (item.id === id ? entry : item)));
      return entry;
    },
    deleteJournal: async (id) => {
      await dataApi.remove('journal_entries', id);
      setJournalEntries((current) => current.filter((item) => item.id !== id));
    },
    createTransaction: async (values) => {
      const transaction = await dataApi.create<Transaction>('transactions', values);
      setTransactions((current) => [transaction, ...current.filter((item) => item.id !== transaction.id)]);
      return transaction;
    },
    updateTransaction: async (id, values) => {
      const transaction = await dataApi.update<Transaction>('transactions', id, values);
      setTransactions((current) => current.map((item) => (item.id === id ? transaction : item)));
      return transaction;
    },
    deleteTransaction: async (id) => {
      await dataApi.remove('transactions', id);
      setTransactions((current) => current.filter((item) => item.id !== id));
    },
    createBudget: async (values) => {
      const budget = await dataApi.create<Budget>('budgets', values);
      setBudgets((current) => [budget, ...current.filter((item) => item.id !== budget.id)]);
      return budget;
    },
    updateBudget: async (id, values) => {
      const budget = await dataApi.update<Budget>('budgets', id, values);
      setBudgets((current) => current.map((item) => (item.id === id ? budget : item)));
      return budget;
    },
    deleteBudget: async (id) => {
      await dataApi.remove('budgets', id);
      setBudgets((current) => current.filter((item) => item.id !== id));
    },
    createSavingsGoal: async (values) => {
      const goal = await dataApi.create<SavingsGoal>('savings_goals', values);
      setSavingsGoals((current) => [goal, ...current.filter((item) => item.id !== goal.id)]);
      return goal;
    },
    updateSavingsGoal: async (id, values) => {
      const goal = await dataApi.update<SavingsGoal>('savings_goals', id, values);
      setSavingsGoals((current) => current.map((item) => (item.id === id ? goal : item)));
      return goal;
    },
    deleteSavingsGoal: async (id) => {
      await dataApi.remove('savings_goals', id);
      setSavingsGoals((current) => current.filter((item) => item.id !== id));
    },
    createNotification: async (values) => {
      const notification = await dataApi.create<AppNotification>('notifications', values);
      setNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)]);
      return notification;
    },
    updateNotification: async (id, values) => {
      const notification = await dataApi.update<AppNotification>('notifications', id, values);
      setNotifications((current) => current.map((item) => (item.id === id ? notification : item)));
      return notification;
    },
    deleteNotification: async (id) => {
      await dataApi.remove('notifications', id);
      setNotifications((current) => current.filter((item) => item.id !== id));
    },
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}
