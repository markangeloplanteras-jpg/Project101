import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Profile, User } from '../types';
import { supabase } from '../lib/supabase';
import { authApi, accountApi, getLocalToken, profileApi } from '../lib/api';
import { setLocalToken } from '../lib/api';

export type AuthMode = 'local' | 'supabase';

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  token: string | null;
  mode: AuthMode;
  ready: boolean;
  signInLocal: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUpLocal: (email: string, password: string, fullName: string) => Promise<{ ok: boolean; error?: string }>;
  signInWithEmail: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ ok: boolean; error?: string }>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  updateProfile: (values: Partial<Profile>) => Promise<{ ok: boolean; error?: string }>;
  deleteAccount: () => Promise<{ ok: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [mode, setMode] = useState<AuthMode>('local');
  const [ready, setReady] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const status = await authApi.config();
      if (!mounted) return;
      setMode(status.authMode);
      if (status.authMode === 'local') {
        const storedToken = getLocalToken();
        if (storedToken) {
          const response = await authApi.localSession();
          if (mounted && response.user) {
            setToken(storedToken);
            setUser({ id: response.user.id, email: response.user.email, full_name: response.user.full_name });
            setProfile(response.profile);
          }
        }
      } else if (supabase) {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data.session?.user;
        if (mounted && sessionUser) {
          setToken(data.session?.access_token ?? null);
          setUser({
            id: sessionUser.id,
            email: sessionUser.email ?? '',
            full_name: (sessionUser.user_metadata?.full_name as string) || sessionUser.email?.split('@')[0] || '',
          });
          const profileResponse = await profileApi.get();
          if (mounted) setProfile(profileResponse.data);
        }
      }
      if (mounted) setReady(true);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (mode !== 'supabase' || !supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mountedRef.current) return;
      const sessionUser = session?.user;
      if (sessionUser) {
        setToken(session.access_token);
        setUser({
          id: sessionUser.id,
          email: sessionUser.email ?? '',
          full_name: (sessionUser.user_metadata?.full_name as string) || sessionUser.email?.split('@')[0] || '',
        });
        setMode('supabase');
      } else {
        setUser(null);
        setProfile(null);
        setToken(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [mode]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', profile?.theme !== 'light');
  }, [profile?.theme]);

  const signInLocal = useCallback(async (email: string, password: string) => {
    const response = await authApi.localSignin(email, password);
    setLocalToken(response.token);
    setToken(response.token);
    setUser({ id: response.user.id, email: response.user.email, full_name: response.user.full_name });
    setProfile(response.profile);
    return { ok: true };
  }, []);

  const signUpLocal = useCallback(async (email: string, password: string, fullName: string) => {
    const response = await authApi.localSignup(email, password, fullName);
    setLocalToken(response.token);
    setToken(response.token);
    setUser({ id: response.user.id, email: response.user.email, full_name: response.user.full_name });
    setProfile(response.profile);
    return { ok: true };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) return { ok: false, error: 'Authentication is not configured.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { ok: false, error: error.message } : { ok: true };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, fullName: string) => {
    if (!supabase) return { ok: false, error: 'Authentication is not configured.' };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { ok: false, error: error.message };
    if (data.session) {
      setToken(data.session.access_token);
      setUser({ id: data.session.user.id, email: data.session.user.email ?? '', full_name: fullName });
      const profileResponse = await profileApi.get();
      setProfile(profileResponse.data);
    }
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    setLocalToken(null);
    setToken(null);
    setUser(null);
    setProfile(null);
    if (supabase) await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (mode === 'local') {
      return { ok: true, error: 'Local preview accounts use the password settings in your profile instead of email reset links.' };
    }
    if (!supabase) return { ok: false, error: 'Authentication is not configured.' };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  }, [mode]);

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (mode === 'local') {
      const response = await authApi.changeLocalPassword(currentPassword, newPassword);
      if (!response.ok) return { ok: false, error: 'Your current password is incorrect.' };
      return { ok: true };
    }
    if (!supabase) return { ok: false, error: 'Authentication is not configured.' };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error ? { ok: false, error: error.message } : { ok: true };
  }, [mode]);

  const updateProfile = useCallback(async (values: Partial<Profile>) => {
    const response = await profileApi.update({
      full_name: values.full_name ?? profile?.full_name,
      avatar_url: values.avatar_url ?? profile?.avatar_url,
      timezone: values.timezone ?? profile?.timezone,
      date_format: values.date_format ?? profile?.date_format,
      currency: values.currency ?? profile?.currency,
      theme: values.theme ?? profile?.theme,
      week_starts_on: values.week_starts_on ?? profile?.week_starts_on,
      dashboard_widgets: values.dashboard_widgets ?? profile?.dashboard_widgets,
      notification_preferences: values.notification_preferences ?? profile?.notification_preferences,
    });
    setProfile(response.data);
    return { ok: true };
  }, [profile]);

  const deleteAccount = useCallback(async () => {
    const response = await accountApi.delete();
    if (!response.ok) return { ok: false, error: 'Account deletion could not be completed.' };
    await signOut();
    return { ok: true };
  }, [signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      token,
      mode,
      ready,
      signInLocal,
      signUpLocal,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      resetPassword,
      updatePassword,
      updateProfile,
      deleteAccount,
    }),
    [user, profile, token, mode, ready, signInLocal, signUpLocal, signInWithEmail, signUpWithEmail, signOut, resetPassword, updatePassword, updateProfile, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
