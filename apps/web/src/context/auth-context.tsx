'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, setStoredToken, setStoredRefreshToken, getStoredToken, ApiError } from '@/lib/api';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  mfaEnabled: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  mcpEndpoint?: string;
  organizationId: string;
}

interface AuthContextType {
  user: UserProfile | null;
  organizations: Organization[];
  currentOrg: Organization | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  theme: 'light' | 'dark';
  loading: boolean;
  error: string | null;
  sendOtp: (email: string, name?: string) => Promise<void>;
  verifyOtp: (email: string, code: string, name?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setCurrentOrg: (org: Organization) => void;
  setCurrentWorkspace: (ws: Workspace) => void;
  toggleTheme: () => void;
  refreshData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('umcp_theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('umcp_theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  };

  const loadUserData = async () => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch profile
      const profile = await apiRequest<UserProfile>('/auth/profile');
      setUser(profile);

      // Fetch organizations
      const orgs = await apiRequest<Organization[]>('/organizations');
      setOrganizations(orgs);

      const activeOrg = orgs[0] || null;
      setCurrentOrg(activeOrg);

      if (activeOrg) {
        // Fetch workspaces for organization
        const wsList = await apiRequest<Workspace[]>(`/organizations/${activeOrg.id}/workspaces`);
        setWorkspaces(wsList);
        setCurrentWorkspace(wsList[0] || null);
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
      if (err instanceof ApiError && err.statusCode === 401) {
        setStoredToken(null);
        setStoredRefreshToken(null);
        setUser(null);
      } else {
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const sendOtp = async (email: string, name?: string) => {
    setError(null);
    try {
      await apiRequest('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ email, name }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send verification code';
      setError(msg);
      throw err;
    }
  };

  const verifyOtp = async (email: string, code: string, name?: string) => {
    setError(null);
    try {
      const res = await apiRequest<{ user: UserProfile; tokens: { accessToken: string; refreshToken: string } }>(
        '/auth/otp/verify',
        {
          method: 'POST',
          body: JSON.stringify({ email, code, name }),
        },
      );

      setStoredToken(res.tokens.accessToken);
      setStoredRefreshToken(res.tokens.refreshToken);
      setUser(res.user);

      await loadUserData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      setError(msg);
      throw err;
    }
  };

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const res = await apiRequest<{ user: UserProfile; tokens: { accessToken: string; refreshToken: string } }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        },
      );

      setStoredToken(res.tokens.accessToken);
      setStoredRefreshToken(res.tokens.refreshToken);
      setUser(res.user);

      await loadUserData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials';
      setError(msg);
      throw err;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setError(null);
    try {
      const res = await apiRequest<{ user: UserProfile; tokens: { accessToken: string; refreshToken: string } }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        },
      );

      setStoredToken(res.tokens.accessToken);
      setStoredRefreshToken(res.tokens.refreshToken);
      setUser(res.user);

      await loadUserData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
      throw err;
    }
  };

  const logout = () => {
    setStoredToken(null);
    setStoredRefreshToken(null);
    setUser(null);
    setOrganizations([]);
    setWorkspaces([]);
    setCurrentOrg(null);
    setCurrentWorkspace(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        currentOrg,
        workspaces,
        currentWorkspace,
        theme,
        loading,
        error,
        sendOtp,
        verifyOtp,
        login,
        register,
        logout,
        setCurrentOrg,
        setCurrentWorkspace,
        toggleTheme,
        refreshData: loadUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
