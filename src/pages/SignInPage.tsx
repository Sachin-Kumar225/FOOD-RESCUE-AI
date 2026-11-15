import React, { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Truck,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import type { UserRole } from '../types.ts';
import type { PageRoute } from '../components/Navbar.tsx';

interface SignInPageProps {
  onNavigate: (page: PageRoute, options?: { role?: UserRole }) => void;
  requestedRole?: UserRole | null;
}

export function SignInPage({ onNavigate, requestedRole }: SignInPageProps) {
  const {
    user,
    login,
    resetPassword,
    updatePassword,
    isPasswordRecovery,
    demoLogin,
    supabaseEnabled,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotMode, setForgotMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<UserRole | null>(null);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      onNavigate('dashboard');
    } catch (err) {
      setError(
        err instanceof Error && err.message ? err.message : 'Authentication failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setResetSent(false);
    setLoading(true);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to send password reset email.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      await updatePassword(newPassword);
      setPasswordUpdated(true);
      onNavigate('dashboard');
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to update password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = async (demoRole: UserRole) => {
    setError('');
    setDemoLoading(demoRole);
    try {
      await demoLogin(demoRole);
      onNavigate('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo sign-in failed.');
    } finally {
      setDemoLoading(null);
    }
  };

  const demoRoles: {
    role: UserRole;
    title: string;
    subtitle: string;
    icon: typeof UserCheck;
  }[] = [
    {
      role: 'donor',
      title: 'Donor Workspace',
      subtitle: 'Greenleaf Bistro · Publish & approve requests',
      icon: UserCheck,
    },
    {
      role: 'ngo',
      title: 'NGO / Receiver',
      subtitle: 'Hope Haven Shelter · Claim & confirm delivery',
      icon: Building2,
    },
    {
      role: 'volunteer',
      title: 'Volunteer Driver',
      subtitle: 'Aarav Nair · Accept & complete pickups',
      icon: Truck,
    },
    {
      role: 'admin',
      title: 'Administrator',
      subtitle: 'Verify NGOs, moderate listings & view audit',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="bg-[#F8FAF9] min-h-[calc(100vh-4rem)] py-10 sm:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Sign In Card */}
        <div className="lg:col-span-7 bg-white border border-emerald-950/10 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#47554E] hover:text-[#0F1F17] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Back to Home</span>
            </button>

            <div className="flex items-center gap-1 p-1 bg-[#F1F5F2] rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setForgotMode(false);
                  setError('');
                  setResetSent(false);
                }}
                className="px-4 py-1.5 text-sm font-medium rounded-md bg-white text-[#0F1F17] shadow-xs"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="px-4 py-1.5 text-sm font-medium rounded-md text-[#47554E] hover:text-[#0F1F17] transition-colors"
              >
                Create Account
              </button>
            </div>
          </div>

          {user && !isPasswordRecovery && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-600/30 text-sm flex flex-wrap items-center justify-between gap-3">
              <p className="text-emerald-950">
                Signed in as <span className="font-semibold">{user.name}</span> ({user.role}).
              </p>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md"
              >
                Open Dashboard
              </button>
            </div>
          )}

          {isPasswordRecovery ? (
            <>
              <div>
                <h1 className="font-display text-2xl font-bold text-[#0F1F17]">
                  Set a new password
                </h1>
                <p className="text-sm text-[#47554E] mt-1">
                  Enter a new password for your FOOD RESCUE AI account to continue to your
                  dashboard.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                  {error}
                </div>
              )}

              {passwordUpdated && (
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-600/30 text-sm text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Password updated successfully. Redirecting to your dashboard...</span>
                </div>
              )}

              <form onSubmit={handleRecoveryUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F1F17] mb-1">
                    New Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Update Password &amp; Continue</span>
                </button>
              </form>
            </>
          ) : forgotMode ? (
            <>
              <div>
                <h1 className="font-display text-2xl font-bold text-[#0F1F17]">
                  Reset your password
                </h1>
                <p className="text-sm text-[#47554E] mt-1">
                  Enter your registered email address and we will send you a password reset link.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                  {error}
                </div>
              )}

              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F1F17] mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@organization.org"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Send Reset Link</span>
                </button>

                {resetSent && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="p-4 rounded-lg bg-emerald-50 border border-emerald-600/30 text-sm flex items-start gap-3"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-emerald-900">Password Reset Email Sent!</p>
                      <p className="text-emerald-950/90 leading-relaxed">
                        Check your inbox (and spam folder) for the password reset link.
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(false);
                      setError('');
                      setResetSent(false);
                    }}
                    className="font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    Back to Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('register')}
                    className="font-medium text-[#47554E] hover:text-[#0F1F17]"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div>
                <h1 className="font-display text-2xl font-bold text-[#0F1F17]">
                  {requestedRole === 'admin'
                    ? 'Administrator Sign In'
                    : 'Sign in to FOOD RESCUE AI'}
                </h1>
                <p className="text-sm text-[#47554E] mt-1">
                  {requestedRole === 'admin'
                    ? 'Administrator accounts are provisioned in PostgreSQL. Sign in with your verified admin credentials to open the Admin Console.'
                    : 'Access your role-based dashboard, active listings, and pickup workflows.'}
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                  {error}
                </div>
              )}

              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F1F17] mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@organization.org"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className="block text-xs font-semibold text-[#0F1F17]">
                      Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotMode(true);
                        setError('');
                        setResetSent(false);
                      }}
                      className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Sign In</span>
                </button>
              </form>

              <div className="pt-4 border-t border-emerald-950/10 flex flex-wrap items-center justify-between gap-3 text-sm">
                <p className="text-[#47554E]">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('register')}
                    className="font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
                  >
                    Create Account
                  </button>
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className="text-xs font-medium text-[#47554E] hover:text-[#0F1F17]"
                >
                  Back to Home
                </button>
              </div>
            </>
          )}
        </div>

        {/* Supabase Status / Demo Access Panel */}
        <div className="lg:col-span-5 bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4">
          {supabaseEnabled ? (
            <>
              <div className="space-y-1">
                <h2 className="font-display text-lg font-bold text-[#0F1F17]">
                  Supabase Auth Connected
                </h2>
                <p className="text-xs text-[#47554E] leading-relaxed">
                  Authentication, PostgreSQL Row Level Security (RLS), and Storage are live. Sign
                  in with your Supabase credentials or create a new Donor, NGO / Receiver, or
                  Volunteer account.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-[#F8FAF9] border border-emerald-950/10 text-xs text-[#47554E] space-y-2">
                <p className="font-semibold text-[#0F1F17]">Role-Based Redirect</p>
                <p>
                  • After signing in, you are automatically redirected to your Donor, NGO /
                  Receiver, Volunteer, or Administrator dashboard.
                </p>
                <p>
                  • Only verified NGO organisations can submit donation claims via atomic database
                  RPC functions.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="font-display text-lg font-bold text-[#0F1F17]">
                  Demo Mode Quick Access
                </h2>
                <p className="text-xs text-[#47554E] leading-relaxed">
                  Supabase URL &amp; anon key are not configured yet, so Express Demo Mode is
                  active. Sign in as any seeded role below or connect Supabase via `.env`.
                </p>
              </div>

              <div className="space-y-2.5">
                {demoRoles.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => handleDemoAccess(item.role)}
                      disabled={demoLoading !== null}
                      className="w-full text-left p-3.5 rounded-lg border border-emerald-950/12 hover:border-emerald-700/40 hover:bg-[#F8FAF9] transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-[#0F1F17]">{item.title}</p>
                          <p className="text-xs text-[#47554E]">{item.subtitle}</p>
                        </div>
                      </div>
                      {demoLoading === item.role ? (
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-700 shrink-0" />
                      ) : (
                        <span className="text-xs font-semibold text-emerald-700 shrink-0">
                          Enter
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-emerald-950/10 text-xs text-[#47554E] space-y-1">
                <p className="font-semibold text-[#0F1F17]">Connect Live Supabase Backend</p>
                <p>
                  Run <code className="font-mono">supabase/schema.sql</code> in your Supabase SQL
                  Editor and set <code className="font-mono">VITE_SUPABASE_URL</code> +{' '}
                  <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
