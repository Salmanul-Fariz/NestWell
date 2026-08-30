import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

export interface User {
  userId: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    try {
      const res = await api.get<User>('/auth/me');
      setUser(res.data);
    } catch {
      try {
        await api.post('/auth/refresh');
        const res = await api.get<User>('/auth/me');
        setUser(res.data);
      } catch {
        setUser(null);
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
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post('/auth/register', { name, email, password });
    setUser({
      userId: res.data.user.id,
      email: res.data.user.email,
      name: res.data.user.name,
    });
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
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
