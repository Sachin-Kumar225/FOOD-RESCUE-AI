import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest, getStoredToken, setStoredToken } from '../lib/api.ts';
import { isSupabaseConfigured, supabase } from '../lib/supabase.ts';
import { mapOrgRow, mapProfileRow } from '../lib/dataService.ts';
import type { Organisation, User, UserRole } from '../types.ts';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone: string;
  city: string;
  address: string;
  orgName?: string;
  orgType?: string;
  registrationNumber?: string;
  capacityNote?: string;
}

export interface RegisterResult {
  requiresEmailConfirmation?: boolean;
  message?: string;
}

interface AuthContextValue {
  user: User | null;
  organisation: Organisation | null;
  loading: boolean;
  supabaseEnabled: boolean;
  isPasswordRecovery: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<RegisterResult>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  demoLogin: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const loadSupabaseProfileAndOrg = useCallback(
    async (userId: string, options?: { throwOnFailure?: boolean }) => {
      if (!supabase) return;
      const { data: profileRow, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr || !profileRow) {
        setUser(null);
        setOrganisation(null);
        if (options?.throwOnFailure) {
          throw new Error(profileErr?.message || 'User profile not found. Please contact support.');
        }
        return;
      }

      const mappedUser = mapProfileRow(profileRow);
      if (mappedUser.status === 'suspended') {
        await supabase.auth.signOut();
        setUser(null);
        setOrganisation(null);
        if (options?.throwOnFailure) {
          throw new Error('This account has been suspended by an administrator.');
        }
        return;
      }

      setUser(mappedUser);
      if (mappedUser.role === 'ngo') {
        const { data: orgRow, error: orgErr } = await supabase
          .from('organisations')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        setOrganisation(!orgErr && orgRow ? mapOrgRow(orgRow) : null);
      } else {
        setOrganisation(null);
      }
    },
    []
  );

  const refreshSession = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          await loadSupabaseProfileAndOrg(data.session.user.id);
        } else {
          setUser(null);
          setOrganisation(null);
        }
      } catch {
        setUser(null);
        setOrganisation(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setOrganisation(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiRequest<{ user: User; organisation: Organisation | null }>(
        '/api/auth/me'
      );
      setUser(data.user);
      setOrganisation(data.organisation);
    } catch {
      setStoredToken(null);
      setUser(null);
      setOrganisation(null);
    } finally {
      setLoading(false);
    }
  }, [loadSupabaseProfileAndOrg]);

  useEffect(() => {
    refreshSession();

    if (isSupabaseConfigured && supabase) {
      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        }
        if (session?.user) {
          loadSupabaseProfileAndOrg(session.user.id).finally(() => setLoading(false));
        } else {
          setUser(null);
          setOrganisation(null);
          setLoading(false);
        }
      });
      return () => {
        listener.subscription.unsubscribe();
      };
    }
  }, [refreshSession, loadSupabaseProfileAndOrg]);

  const login = async (email: string, password: string) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        throw new Error(error.message);
      }
      if (data.user) {
        await loadSupabaseProfileAndOrg(data.user.id, { throwOnFailure: true });
      }
      return;
    }

    const data = await apiRequest<{
      token: string;
      user: User;
      organisation: Organisation | null;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.token);
    setUser(data.user);
    setOrganisation(data.organisation);
  };

  const register = async (payload: RegisterPayload): Promise<RegisterResult> => {
    if (isSupabaseConfigured && supabase) {
      const safeRole = payload.role === 'admin' ? 'donor' : payload.role;
      const { data, error } = await supabase.auth.signUp({
        email: payload.email.trim(),
        password: payload.password,
        options: {
          data: {
            name: payload.name.trim(),
            role: safeRole,
            phone: payload.phone.trim(),
            city: payload.city.trim(),
            address: payload.address.trim(),
            orgName: payload.orgName?.trim(),
            orgType: payload.orgType,
            registrationNumber: payload.registrationNumber?.trim(),
            capacityNote: payload.capacityNote?.trim(),
          },
        },
      });
      if (error) {
        throw new Error(error.message || 'Unable to send verification email. Please try again.');
      }
      if (!data.user) {
        throw new Error('Unable to send verification email. Please try again.');
      }
      if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new Error('An account with this email address already exists. Please sign in.');
      }
      if (data.session?.user) {
        await loadSupabaseProfileAndOrg(data.session.user.id);
        return { requiresEmailConfirmation: false };
      }
      return {
        requiresEmailConfirmation: true,
        message: 'Verification Email Sent!',
      };
    }

    const data = await apiRequest<{
      token: string;
      user: User;
      organisation: Organisation | null;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStoredToken(data.token);
    setUser(data.user);
    setOrganisation(data.organisation);
    return { requiresEmailConfirmation: false };
  };

  const resetPassword = async (email: string) => {
    const trimmed = email.trim();
    if (!trimmed) {
      throw new Error('Please enter your email address first.');
    }
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/signin`,
      });
      if (error) {
        throw new Error(error.message || 'Unable to send password reset email.');
      }
      return;
    }
    throw new Error(
      'Password reset emails require live Supabase Auth configuration. In Demo Mode, use Quick Access.'
    );
  };

  const updatePassword = async (newPassword: string) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Password update requires live Supabase Auth configuration.');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      throw new Error(error.message || 'Unable to update password.');
    }
    setIsPasswordRecovery(false);
  };

  const demoLogin = async (role: UserRole) => {
    if (isSupabaseConfigured) {
      throw new Error(
        'Demo shortcut sign-in is disabled while connected to live Supabase Auth. Please register or sign in with your Supabase account.'
      );
    }

    const data = await apiRequest<{
      token: string;
      user: User;
      organisation: Organisation | null;
    }>('/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
    setStoredToken(data.token);
    setUser(data.user);
    setOrganisation(data.organisation);
  };

  const logout = async () => {
    setIsPasswordRecovery(false);
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
      setUser(null);
      setOrganisation(null);
      return;
    }

    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    }
    setStoredToken(null);
    setUser(null);
    setOrganisation(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organisation,
        loading,
        supabaseEnabled: isSupabaseConfigured,
        isPasswordRecovery,
        login,
        register,
        resetPassword,
        updatePassword,
        demoLogin,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
