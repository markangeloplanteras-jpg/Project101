import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  CheckSquare2,
  Coins,
  LifeBuoy,
  LayoutDashboard,
  Menu,
  NotebookPen,
  Settings,
  Sparkles,
  Target,
  X,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Avatar, Badge } from '../ui/Small';
import { cn } from '../../lib/cn';
import { useToast } from '../../contexts/ToastContext';

const desktopItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Workspace' },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare2, group: 'Workspace' },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays, group: 'Workspace' },
  { to: '/habits', label: 'Habits', icon: Target, group: 'Workspace' },
  { to: '/notes', label: 'Notes', icon: NotebookPen, group: 'Workspace' },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, group: 'Insights' },
  { to: '/finance', label: 'Finance', icon: Coins, group: 'Insights' },
  { to: '/assistant', label: 'Assistant', icon: Sparkles, group: 'Insights' },
  { to: '/notifications', label: 'Notifications', icon: Bell, group: 'Insights' },
  { to: '/settings', label: 'Settings', icon: Settings, group: 'System' },
];

const mobilePrimary = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare2 },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/habits', label: 'Habits', icon: Target },
  { to: '/assistant', label: 'AI', icon: Sparkles },
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, signOut } = useAuth();
  const { data } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const { createNotification } = useData();
  const { profile } = useAuth();

  useEffect(() => {
    const taskPreference = profile?.notification_preferences.taskReminders;
    const eventPreference = profile?.notification_preferences.eventReminders;
    const todayKey = new Date().toISOString().slice(0, 10);
    const existingKeys = new Set((data?.notifications ?? []).map((notification) => notification.dedupe_key).filter((key): key is string => Boolean(key)));
    const dueTasks = (data?.tasks ?? []).filter((task) => task.status !== 'completed' && task.due_date?.slice(0, 10) === todayKey);
    for (const task of dueTasks) {
      const dedupeKey = `task-due-${task.id}-${todayKey}`;
      if (!taskPreference || existingKeys.has(dedupeKey)) continue;
      createNotification({
        title: 'Task due today',
        message: task.title,
        type: 'task',
        entity_type: 'tasks',
        entity_id: task.id,
        due_at: new Date().toISOString(),
        dedupe_key: dedupeKey,
      }).then((notification) => {
        existingKeys.add(dedupeKey);
        if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState === 'visible') {
          new Notification(notification.title, { body: notification.message });
        }
      }).catch(() => undefined);
    }

    const upcomingEvents = (data?.events ?? []).filter((event) => {
      const start = new Date(event.start_at);
      const now = new Date();
      const startTime = event.all_day ? new Date(`${event.start_at.slice(0, 10)}T00:00:00`) : start;
      const dueInMinutes = (startTime.getTime() - now.getTime()) / 60_000;
      const reminderMinutes = event.reminder_minutes ?? 0;
      const isToday = event.start_at.slice(0, 10) === todayKey;
      return eventPreference && isToday && dueInMinutes >= 0 && dueInMinutes <= reminderMinutes;
    });
    for (const event of upcomingEvents) {
      const dedupeKey = `event-reminder-${event.id}-${event.start_at}`;
      if (existingKeys.has(dedupeKey)) continue;
      createNotification({
        title: 'Event reminder',
        message: event.title,
        type: 'event',
        entity_type: 'events',
        entity_id: event.id,
        due_at: event.start_at,
        dedupe_key: dedupeKey,
      }).then(() => {
        existingKeys.add(dedupeKey);
      }).catch(() => undefined);
    }
  }, [data, createNotification, profile]);


  const unread = data?.notifications.filter((notification) => !notification.read_at) ?? [];

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-400 to-blue-600 text-white shadow-glow">
          <LifeBuoy className="h-5 w-5" />
        </div>
        <div className={cn('min-w-0 transition-opacity', collapsed && 'opacity-0')}>
          <p className="truncate text-base font-display font-bold">LifeOS</p>
          <p className="text-[11px] text-muted">Personal OS</p>
        </div>
        <button className="icon-btn ml-auto lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
          <X className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {['Workspace', 'Insights', 'System'].map((group) => (
          <div key={group} className="mb-5">
            <p className={cn('px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400', collapsed && 'hidden')}>{group}</p>
            <div className="space-y-1">
              {desktopItems
                .filter((item) => item.group === group)
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => cn('nav-item', isActive && 'nav-item-active')}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="h-4.5 w-4.5" />
                    <span className={cn('truncate', collapsed && 'sr-only')}>{item.label}</span>
                  </NavLink>
                ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-default p-3">
        <button className="btn-secondary h-10 w-full justify-start" onClick={() => setCollapsed((current) => !current)}>
          <span className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            <Menu className="h-4 w-4" />
            <span className={cn('text-sm', collapsed && 'hidden')}>Collapse</span>
          </span>
        </button>
      </div>
    </div>
  );

  const sidebar = (
    <aside className={cn('fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-default bg-surface/90 backdrop-blur-xl lg:flex', collapsed ? 'w-20' : 'w-64')}>
      {sidebarContent}
    </aside>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent-500/[0.04] via-transparent to-transparent dark:from-accent-500/[0.03]">
      {sidebar}
      {mobileOpen ? <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-slate-950/60" onClick={() => setMobileOpen(false)} /><aside className="absolute inset-y-0 left-0 w-80 border-r border-default bg-surface">{sidebarContent}</aside></div> : null}
      <div className={cn('relative min-h-screen transition-all duration-300', collapsed ? 'lg:pl-20' : 'lg:pl-64')}>
        <header className="sticky top-0 z-40 border-b border-default bg-canvas/80 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button className="icon-btn lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-display font-bold">{pageTitle(location.pathname)}</h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative" ref={menuRef}>
                <button className="icon-btn" onClick={() => setMenuOpen((current) => !current)} aria-label="Account menu">
                  <Avatar name={user?.full_name || user?.email || 'L'} size="sm" />
                </button>
                {menuOpen ? (
                  <div className="popover absolute right-0 mt-2 w-56 p-1.5">
                    <div className="px-3 py-2">
                      <p className="truncate text-sm font-semibold">{user?.full_name || user?.email}</p>
                      <p className="truncate text-xs text-muted">{user?.email}</p>
                    </div>
                    <button className="menu-item" onClick={() => { setMenuOpen(false); navigate('/settings'); }}>Profile and settings</button>
                    <button className="menu-item" onClick={() => { setMenuOpen(false); navigate('/notifications'); }}>Notifications</button>
                    <button
                      className="menu-item text-rose-600"
                      onClick={async () => {
                        setMenuOpen(false);
                        await signOut();
                        toast('You have been signed out.', 'info');
                        navigate('/login');
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>
        <main className={cn('mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-8')}>{children}</main>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-default bg-surface/90 backdrop-blur-xl lg:hidden">
        <div className="safe-bottom mx-auto flex max-w-5xl items-end justify-between px-2 py-2">
          {mobilePrimary.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => cn('nav-item flex-1 flex-col items-center gap-1 py-2 text-[10px]', isActive && 'nav-item-active')}>
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function pageTitle(path: string) {
  if (path.startsWith('/tasks')) return 'Tasks';
  if (path.startsWith('/calendar')) return 'Calendar';
  if (path.startsWith('/habits')) return 'Habits';
  if (path.startsWith('/notes')) return 'Notes';
  if (path.startsWith('/finance')) return 'Finance';
  if (path.startsWith('/assistant')) return 'Assistant';
  if (path.startsWith('/analytics')) return 'Analytics';
  if (path.startsWith('/notifications')) return 'Notifications';
  if (path.startsWith('/settings')) return 'Settings';
  return 'Dashboard';
}
