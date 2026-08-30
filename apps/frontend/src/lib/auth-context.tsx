import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';
import { deriveKey } from './crypto';

export interface User {
  userId: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  cryptoKey: CryptoKey | null;
  isAppLocked: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  unlockApp: (password: string) => Promise<boolean>;
  lockApp: () => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [isAppLocked, setIsAppLocked] = useState<boolean>(false);

  const checkAuth = async () => {
    try {
      const res = await api.get<User>('/auth/me');
      setUser(res.data);
      // When user is restored via session cookie without master password entered, lock the app screen
      setIsAppLocked(true);
    } catch {
      try {
        await api.post('/auth/refresh');
        const res = await api.get<User>('/auth/me');
        setUser(res.data);
        setIsAppLocked(true);
      } catch {
        setUser(null);
        setIsAppLocked(false);
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
    setUser({
      userId: res.data.user.id,
      email: res.data.user.email,
      name: res.data.user.name,
    });
    // Derive key immediately on login so user enters unlocked state
    try {
      const key = await deriveKey(password);
      setCryptoKey(key);
      setIsAppLocked(false);
    } catch {
      setIsAppLocked(true);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post('/auth/register', { name, email, password });
    setUser({
      userId: res.data.user.id,
      email: res.data.user.email,
      name: res.data.user.name,
    });
    // Derive key immediately on register
    try {
      const key = await deriveKey(password);
      setCryptoKey(key);
      setIsAppLocked(false);
    } catch {
      setIsAppLocked(true);
    }
  };

  const unlockApp = async (password: string): Promise<boolean> => {
    try {
      const key = await deriveKey(password);
      setCryptoKey(key);
      setIsAppLocked(false);
      return true;
    } catch {
      return false;
    }
  };

  const lockApp = () => {
    setCryptoKey(null);
    setIsAppLocked(true);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      setCryptoKey(null);
      setIsAppLocked(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        cryptoKey,
        isAppLocked,
        login,
        register,
        unlockApp,
        lockApp,
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
