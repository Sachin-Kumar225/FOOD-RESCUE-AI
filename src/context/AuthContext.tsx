import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest, getStoredToken, setStoredToken } from '../lib/api.ts';
import type { Organisation, User, UserRole } from '../types.ts';

interface RegisterPayload {
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

interface AuthContextValue {
  user: User | null;
  organisation: Organisation | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  demoLogin: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email: string, password: string) => {
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

  const register = async (payload: RegisterPayload) => {
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
  };

  const demoLogin = async (role: UserRole) => {
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
        login,
        register,
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
