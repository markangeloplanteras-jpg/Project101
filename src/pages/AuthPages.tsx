import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, LifeBuoy, Lock, Mail, Sparkles, UserRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Field, Input, Textarea } from '../components/ui/Inputs';
import { useToast } from '../contexts/ToastContext';

function AuthShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4 py-10 sm:px-6">
      <div className="auth-orb left-[-10%] top-[-10%] h-[28rem] w-[28rem] bg-accent-500/20" />
      <div className="auth-orb right-[-8%] bottom-[-12%] h-[26rem] w-[26rem] bg-blue-500/20" />
      <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-default bg-surface shadow-2xl lg:grid-cols-2">
        <div className="hidden bg-gradient-to-br from-accent-600 via-indigo-700 to-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><LifeBuoy className="h-6 w-6" /></div>
            <p className="font-display text-2xl font-bold">LifeOS</p>
          </div>
          <div>
            <p className="text-3xl font-display font-bold leading-tight">Your personal productivity operating system.</p>
            <p className="mt-4 text-white/75">Tasks, calendar, habits, notes, journal, finance, analytics and an AI copilot in one calm workspace.</p>
          </div>
          <div className="space-y-3 text-sm text-white/80">
            {['Plan the day without clutter', 'Build durable habits', 'Understand your energy', 'Reflect without friction'].map((item) => (
              <p key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" />{item}</p>
            ))}
          </div>
        </div>
        <div className="p-6 sm:p-10">
          <div className="mx-auto max-w-md">
            <h1 className="text-3xl font-display font-bold">{title}</h1>
            <p className="mt-2 text-sm text-muted">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, invalid, ...props }: { value: string; onChange: (value: string) => void; invalid?: boolean } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} invalid={invalid} {...props} />
      <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted" onClick={() => setVisible((current) => !current)} aria-label={visible ? 'Hide password' : 'Show password'}>
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function LoginPage() {
  const { signInLocal, signInWithEmail, mode } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(undefined);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setPending(true);
    try {
      const result = mode === 'local' ? await signInLocal(email, password) : await signInWithEmail(email, password);
      if (!result.ok) throw new Error(result.error || 'Sign in failed.');
      toast('Welcome back to LifeOS.', 'success');
      navigate('/dashboard');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign in failed.');
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your private LifeOS workspace.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
          </div>
        </Field>
        <Field label="Password" error={error}>
          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
        </Field>
        <Button type="submit" variant="primary" className="w-full" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</Button>
        <div className="flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="text-accent-600 hover:underline">Forgot password?</Link>
          <Link to="/signup" className="text-accent-600 hover:underline">Create account</Link>
        </div>
      </form>
    </AuthShell>
  );
}

export function SignupPage() {
  const { signUpLocal, signUpWithEmail, mode } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(undefined);
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Full name, email, and password are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setPending(true);
    try {
      const result = mode === 'local' ? await signUpLocal(email, password, fullName) : await signUpWithEmail(email, password, fullName);
      if (!result.ok) throw new Error(result.error || 'Account creation failed.');
      toast('Your LifeOS account was created.', 'success');
      navigate('/dashboard');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Account creation failed.');
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell title="Create your LifeOS" subtitle="Start your private productivity operating system.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Full name">
          <div className="relative">
            <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Alex Morgan" autoComplete="name" />
          </div>
        </Field>
        <Field label="Email">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
          </div>
        </Field>
        <Field label="Password" error={error}>
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
        </Field>
        <Field label="Confirm password">
          <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
        </Field>
        <Button type="submit" variant="primary" className="w-full" disabled={pending}>{pending ? 'Creating…' : 'Create account'}</Button>
        <p className="text-center text-sm text-muted">Already have an account? <Link to="/login" className="text-accent-600 hover:underline">Sign in</Link></p>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const { resetPassword, mode } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(undefined);
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    setPending(true);
    try {
      const result = await resetPassword(email);
      if (!result.ok) throw new Error(result.error || 'Password reset could not be sent.');
      setSent(true);
      toast('Password reset instructions sent if the account exists.', 'success');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Password reset could not be sent.');
    } finally {
      setPending(false);
    }
  };

  if (sent) {
    return (
      <AuthShell title="Check your inbox" subtitle="We sent password reset instructions.">
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500"><CheckCircle2 className="h-7 w-7" /></div>
          <p className="text-sm text-muted">If an account exists for {email}, reset instructions are on the way.</p>
          <Button variant="secondary" onClick={() => navigate('/login')}>Back to sign in</Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset your password" subtitle="We will send you a secure reset link.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
          </div>
        </Field>
        {error ? <p className="error-text">{error}</p> : null}
        <Button type="submit" variant="primary" className="w-full" disabled={pending}>{pending ? 'Sending…' : 'Send reset link'}</Button>
        <Button type="button" variant="ghost" className="w-full" onClick={() => navigate('/login')}><ArrowLeft className="h-4 w-4" /> Back to sign in</Button>
      </form>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const { updatePassword, mode } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(undefined);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setPending(true);
    try {
      const result = await updatePassword('', password);
      if (!result.ok) throw new Error(result.error || 'Password could not be updated.');
      toast('Your password was updated.', 'success');
      navigate('/login');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Password could not be updated.');
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell title="Choose a new password" subtitle="Use a strong, unique password.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="New password" error={error}>
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
        </Field>
        <Field label="Confirm new password">
          <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
        </Field>
        <Button type="submit" variant="primary" className="w-full" disabled={pending}>{pending ? 'Updating…' : 'Update password'}</Button>
        <p className="text-center text-sm text-muted">Signed in users can also change their password in Settings.</p>
      </form>
    </AuthShell>
  );
}

export function AuthFeatureList() {
  return (
    <div className="space-y-3 text-sm">
      <p className="flex items-start gap-3"><Sparkles className="mt-0.5 h-4 w-4 text-accent-500" /> AI planning with real task context.</p>
      <p className="flex items-start gap-3"><Lock className="mt-0.5 h-4 w-4 text-accent-500" /> Your data is private and user-owned.</p>
      <p className="flex items-start gap-3"><LifeBuoy className="mt-0.5 h-4 w-4 text-accent-500" /> Trouble signing in? Use the secure reset flow.</p>
    </div>
  );
}
