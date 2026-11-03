import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  api,
  getLastRefreshAt,
  getSessionRefreshCheckIntervalMs,
  getSessionRefreshDelayMs,
  markSessionRefreshed,
  refreshSession,
  setSessionExpiredHandler,
} from './api';
import { clearPersistedCryptoKey, deriveKey, persistCryptoKey, restoreCryptoKey } from './crypto';

export interface User {
  userId: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  cryptoKey: CryptoKey | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const userRef = useRef<User | null>(null);

  const applyVaultKey = async (password: string) => {
    const key = await deriveKey(password);
    await persistCryptoKey(key);
    setCryptoKey(key);
  };

  const clearSession = () => {
    setUser(null);
    userRef.current = null;
    setCryptoKey(null);
    clearPersistedCryptoKey();
  };

  const checkAuth = async () => {
    try {
      try {
        await refreshSession();
      } catch (refreshError) {
        if (axios.isAxiosError(refreshError) && refreshError.response?.status === 401) {
          throw refreshError;
        }
      }
      const res = await api.get<User>('/auth/me');
      setUser(res.data);
      userRef.current = res.data;
      const storedKey = await restoreCryptoKey();
      setCryptoKey(storedKey);
    } catch {
      // Refreshing first renews the sliding window and synchronizes the configured token TTLs.
      if (!userRef.current) {
        setUser(null);
        setCryptoKey(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const nextUser = {
      userId: res.data.user.id,
      email: res.data.user.email,
      name: res.data.user.name,
    };
    setUser(nextUser);
    userRef.current = nextUser;
    markSessionRefreshed(res.data);
    await applyVaultKey(password);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post('/auth/register', { name, email, password });
    const nextUser = {
      userId: res.data.user.id,
      email: res.data.user.email,
      name: res.data.user.name,
    };
    setUser(nextUser);
    userRef.current = nextUser;
    markSessionRefreshed(res.data);
    await applyVaultKey(password);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearSession();
    }
  };

  useEffect(() => {
    setSessionExpiredHandler(() => {
      clearSession();
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  useEffect(() => {
    if (!user) return;

    /**
     * Keeps the access token fresh while the app is open. There is deliberately no
     * inactivity timeout: the session ends only when the refresh token expires or the
     * user signs out. A failed refresh does not clear the session here either, since a
     * transient network error should not sign anyone out — the response interceptor
     * handles genuine 401s.
     */
    const maybeRefresh = () => {
      if (!userRef.current) return;
      if (Date.now() - getLastRefreshAt() < getSessionRefreshDelayMs()) {
        return;
      }
      void refreshSession().catch(() => undefined);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') maybeRefresh();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', maybeRefresh);
    const intervalId = window.setInterval(maybeRefresh, getSessionRefreshCheckIntervalMs());

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', maybeRefresh);
      window.clearInterval(intervalId);
    };
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        cryptoKey,
        login,
        register,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
