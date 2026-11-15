import React, { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Truck,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { SearchableCitySelect } from '../components/SearchableCitySelect.tsx';
import type { UserRole } from '../types.ts';
import type { PageRoute } from '../components/Navbar.tsx';

interface AuthPageProps {
  onNavigate: (page: PageRoute) => void;
  initialRole?: 'donor' | 'ngo' | 'volunteer';
  mode?: 'login' | 'register';
  onModeChange?: (mode: 'login' | 'register') => void;
}

export function AuthPage({
  onNavigate,
  initialRole,
  mode: controlledMode,
  onModeChange,
}: AuthPageProps) {
  const { user, login, register, demoLogin, supabaseEnabled } = useAuth();
  const [internalMode, setInternalMode] = useState<'login' | 'register'>('register');
  const mode = controlledMode ?? internalMode;
  const setMode = (next: 'login' | 'register') => {
    if (next === 'login') {
      onNavigate('signin');
      return;
    }
    setInternalMode(next);
    onModeChange?.(next);
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Registration fields
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(initialRole || 'donor');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('NGO');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [capacityNote, setCapacityNote] = useState('');

  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<UserRole | null>(null);
  const [error, setError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);

  useEffect(() => {
    if (initialRole && ['donor', 'ngo', 'volunteer'].includes(initialRole)) {
      setRole(initialRole);
    }
  }, [initialRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setVerificationSent(false);
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        onNavigate('dashboard');
      } else {
        if (!name.trim() || !phone.trim() || !city.trim() || !address.trim()) {
          setError('Please complete your name, phone, city, and street address.');
          setLoading(false);
          return;
        }
        if (role === 'ngo' && (!orgName.trim() || !registrationNumber.trim())) {
          setError('Please provide your registered NGO / Shelter name and registration ID.');
          setLoading(false);
          return;
        }
        const res = await register({
          name,
          email,
          password,
          role,
          phone,
          city,
          address,
          orgName: role === 'ngo' ? orgName : undefined,
          orgType: role === 'ngo' ? orgType : undefined,
          registrationNumber: role === 'ngo' ? registrationNumber : undefined,
          capacityNote: role === 'ngo' ? capacityNote : undefined,
        });
        if (res.requiresEmailConfirmation) {
          setVerificationSent(true);
        } else {
          onNavigate('dashboard');
        }
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : mode === 'register'
            ? 'Unable to send verification email. Please check your details and try again.'
            : 'Authentication failed.'
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
    <div className="bg-[#F8FAF9] min-h-[calc(100vh-4rem)] py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Auth Card */}
        <div className="lg:col-span-7 bg-white border border-emerald-950/10 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-1 p-1 bg-[#F1F5F2] rounded-lg w-fit">
            <button
              type="button"
              onClick={() => {
                setError('');
                setVerificationSent(false);
                onNavigate('signin');
              }}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'login'
                  ? 'bg-white text-[#0F1F17] shadow-xs'
                  : 'text-[#47554E] hover:text-[#0F1F17]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
                setVerificationSent(false);
              }}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'register'
                  ? 'bg-white text-[#0F1F17] shadow-xs'
                  : 'text-[#47554E] hover:text-[#0F1F17]'
              }`}
            >
              Create Account
            </button>
          </div>

          <div>
            <h1 className="font-display text-2xl font-bold text-[#0F1F17]">
              {mode === 'login'
                ? 'Sign in to FOOD RESCUE AI'
                : 'Register your community role'}
            </h1>
            <p className="text-sm text-[#47554E] mt-1">
              {mode === 'login'
                ? 'Access your role-based dashboard, active listings, and pickup workflows.'
                : supabaseEnabled
                  ? 'Accounts are created securely via Supabase Auth and PostgreSQL RLS.'
                  : 'New accounts are persisted directly in the Demo Mode Express backend.'}
            </p>
          </div>

          {user && (
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

          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#0F1F17] mb-1.5">
                    Select Role *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'donor', label: 'Donor' },
                        { id: 'ngo', label: 'NGO / Receiver' },
                        { id: 'volunteer', label: 'Volunteer' },
                      ] as const
                    ).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setRole(r.id);
                          setError('');
                          setVerificationSent(false);
                        }}
                        className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                          role === r.id
                            ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                            : 'border-emerald-950/15 bg-white text-[#47554E]'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F1F17] mb-1">
                      Full Name / Business Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Oakwood Kitchen"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F1F17] mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1-555-0199"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="register-city"
                      className="block text-xs font-semibold text-[#0F1F17] mb-1"
                    >
                      City *
                    </label>
                    <SearchableCitySelect
                      id="register-city"
                      value={city}
                      onChange={setCity}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F1F17] mb-1">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Pickup or center address"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15"
                    />
                  </div>
                </div>

                {role === 'ngo' && (
                  <div className="p-4 rounded-lg bg-[#F8FAF9] border border-emerald-950/10 space-y-3">
                    <p className="text-xs font-semibold text-[#0F1F17]">
                      Organisation Verification Details
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="Registered NGO / Shelter Name"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white"
                      />
                      <select
                        value={orgType}
                        onChange={(e) => setOrgType(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white"
                      >
                        <option value="NGO">NGO</option>
                        <option value="Orphanage">Orphanage</option>
                        <option value="Shelter">Shelter</option>
                        <option value="Community Kitchen">Community Kitchen</option>
                      </select>
                      <input
                        type="text"
                        required
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value)}
                        placeholder="Registration / Trust ID"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white"
                      />
                      <input
                        type="text"
                        value={capacityNote}
                        onChange={(e) => setCapacityNote(e.target.value)}
                        placeholder="Daily meal or resident capacity"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white"
                      />
                    </div>
                    <p className="text-xs text-[#47554E]">
                      New NGO profiles enter Pending Review until verified by an administrator.
                    </p>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#0F1F17] mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@organization.org"
                className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1F17] mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
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
              <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
            </button>

            {mode === 'register' && verificationSent && (
              <div
                role="status"
                aria-live="polite"
                className="p-4 rounded-lg bg-emerald-50 border border-emerald-600/30 text-sm flex items-start gap-3"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-1.5 min-w-0">
                  <p className="font-semibold text-emerald-900">Verification Email Sent!</p>
                  <p className="text-emerald-950/90 leading-relaxed">
                    A verification message has been sent to your registered email address.
                  </p>
                  <p className="text-emerald-950/90 leading-relaxed">
                    Please check your inbox (and spam folder) and click the verification link to
                    complete your account registration.
                  </p>
                </div>
              </div>
            )}
          </form>
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
                  Authentication, PostgreSQL Row Level Security (RLS), and Storage are live.
                  Create an account for Donor, NGO / Receiver, or Volunteer, or sign in with your
                  Supabase credentials.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-[#F8FAF9] border border-emerald-950/10 text-xs text-[#47554E] space-y-2">
                <p className="font-semibold text-[#0F1F17]">Role Security Guarantees</p>
                <p>
                  • Public registration supports Donor, NGO/Receiver, and Volunteer roles only;
                  administrator roles are assigned strictly in PostgreSQL.
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
