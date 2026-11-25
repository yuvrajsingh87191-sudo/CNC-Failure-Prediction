import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Cpu,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Moon,
  ShieldCheck,
  Sliders,
  Sun,
} from 'lucide-react';
import { UserPersona } from '../types/domain';
import {
  AuthStatusResponse,
  AuthUser,
  fetchAuthStatus,
  submitFirstRunSetup,
  submitLogin,
} from '../services/authService';

interface LoginPageProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onAuthenticated: (user: AuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  darkMode,
  onToggleDarkMode,
  onAuthenticated,
}) => {
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserPersona>('Maintenance Engineer');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchAuthStatus()
      .then((status) => {
        if (!active) return;
        setAuthStatus(status);
        if (status.claimedEmailHint) {
          setEmail(status.claimedEmailHint);
        }
      })
      .catch((err) => {
        if (!active) return;
        setStatusError(err instanceof Error ? err.message : 'Unable to connect to authentication server.');
      })
      .finally(() => {
        if (active) setStatusLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const isFirstRunSetup = authStatus !== null && !authStatus.initialized;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (isFirstRunSetup) {
      if (name.trim().length < 2) {
        setFormError('Please enter your full name (at least 2 characters).');
        return;
      }
      if (password.length < 8) {
        setFormError('Choose a password with at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setFormError('Passwords do not match. Please re-enter to confirm.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isFirstRunSetup) {
        const res = await submitFirstRunSetup({
          name: name.trim(),
          email: email.trim(),
          role,
          password,
        });
        onAuthenticated(res.user);
      } else {
        const res = await submitLogin({
          email: email.trim(),
          role,
          password,
        });
        onAuthenticated(res.user);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100">
      {/* Left Industrial Control Panel */}
      <aside className="lg:col-span-6 xl:col-span-7 bg-[#0B1324] text-slate-100 p-8 sm:p-12 lg:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800 relative overflow-hidden">
        {/* Subtle technical grid pattern */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #94A3B8 1px, transparent 1px), linear-gradient(to bottom, #94A3B8 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white font-display font-bold text-sm tracking-tight">
              CNC
            </div>
            <div>
              <div className="font-display font-semibold text-base text-white tracking-tight">
                CNC Failure Predictor
              </div>
              <div className="text-xs text-slate-400">
                Industrial Predictive Maintenance Suite
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        {/* Center Hero Value Proposition */}
        <div className="relative z-10 my-10 lg:my-0 max-w-xl space-y-6">
          <div className="space-y-3">
            <div className="font-mono text-xs font-semibold uppercase tracking-wider text-blue-400">
              AI & Machine Learning Operations Portal
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Detect CNC machine failure risk before unplanned downtime.
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Sign in to evaluate spindle operating snapshots with the trained 150-tree balanced Random Forest model, inspect AI-guided maintenance diagnostics, and export shift audit history.
            </p>
          </div>

          {/* Grounded Engineering Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-1.5">
              <Cpu className="h-4 w-4 text-blue-400" />
              <div className="font-mono text-sm font-bold text-white tabular-nums">150 Trees</div>
              <div className="text-xs text-slate-400">Balanced Random Forest (τ = 0.26)</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-1.5">
              <Sliders className="h-4 w-4 text-emerald-400" />
              <div className="font-mono text-sm font-bold text-white tabular-nums">0.961 AUC</div>
              <div className="text-xs text-slate-400">Measured on 2,000 held-out AI4I rows</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-1.5">
              <ShieldCheck className="h-4 w-4 text-blue-400" />
              <div className="font-mono text-sm font-bold text-white tabular-nums">6 Sensors</div>
              <div className="text-xs text-slate-400">Validated pipeline + AI advisor</div>
            </div>
          </div>
        </div>

        {/* Footer Metadata */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pt-6 border-t border-slate-800/80 text-xs text-slate-400">
          <span>Group 8 · B.Tech Computer Science</span>
          <span className="font-mono">NIIT University, Neemrana</span>
        </div>
      </aside>

      {/* Right Authentication Form Panel */}
      <main className="lg:col-span-6 xl:col-span-5 flex flex-col justify-between p-6 sm:p-10 lg:p-14">
        <div className="hidden lg:flex justify-end">
          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            <span>{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
          </button>
        </div>

        <div className="w-full max-w-md mx-auto my-auto py-8">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-7 sm:p-8 space-y-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
                <Lock className="h-3.5 w-3.5" />
                <span>
                  {statusLoading
                    ? 'Connecting to Auth Service'
                    : isFirstRunSetup
                    ? 'First-Run Workspace Setup'
                    : 'Operator Authentication'}
                </span>
              </div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {isFirstRunSetup ? 'Claim Operator Access' : 'Sign in to Dashboard'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {isFirstRunSetup
                  ? 'Create the initial operator credentials to secure this workspace and unlock the CNC prediction dashboard.'
                  : authStatus?.envConfigured
                  ? 'Enter your work email, operational role, and configured workspace passcode to continue.'
                  : 'Enter your operator email and password to access live CNC diagnostics and ML predictions.'}
              </p>
            </div>

            {statusLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span>Checking workspace security status...</span>
              </div>
            ) : statusError ? (
              <div className="rounded-lg border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/30 p-4 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{statusError}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {isFirstRunSetup && (
                  <div>
                    <label
                      htmlFor="login-name"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      Operator Full Name
                    </label>
                    <input
                      id="login-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Yuvraj Singh"
                      autoComplete="name"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Work Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="engineer@plant.local"
                    autoComplete="username"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-role"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Operational Role
                  </label>
                  <select
                    id="login-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserPersona)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  >
                    <option value="Maintenance Engineer">Maintenance Engineer</option>
                    <option value="Production Supervisor">Production Supervisor</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {isFirstRunSetup ? 'Create Password (min. 8 characters)' : 'Access Password'}
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={isFirstRunSetup ? 8 : 1}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isFirstRunSetup ? 'Choose a strong password' : 'Enter your password'}
                      autoComplete={isFirstRunSetup ? 'new-password' : 'current-password'}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 pr-10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {isFirstRunSetup && (
                  <div>
                    <label
                      htmlFor="login-confirm-password"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      Confirm Password
                    </label>
                    <input
                      id="login-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                )}

                {formError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/30 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300 flex items-start gap-2"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{isFirstRunSetup ? 'Securing Workspace...' : 'Verifying Credentials...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{isFirstRunSetup ? 'Initialize & Enter Dashboard' : 'Sign In to Dashboard'}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Credentials are verified exclusively on the server using salted scrypt hashing and signed in-memory session tokens.
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500 dark:text-slate-500">
          CNC Machine Failure Prediction · Secure Operator Access
        </div>
      </main>
    </div>
  );
};
