import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';
import type { AuthResponse } from '../types';

interface AuthContextType {
  user: AuthResponse | null;
  role: 'ADMIN' | 'STUDENT' | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  switchDemoUser: (targetRole: 'ADMIN' | 'STUDENT') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('smart_hostel_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem('smart_hostel_user');
      const storedToken = localStorage.getItem('smart_hostel_token');
      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        } catch {
          localStorage.removeItem('smart_hostel_token');
          localStorage.removeItem('smart_hostel_user');
        }
      } else {
        // Auto-login default demo user (Chief Warden) for seamless immediate experience
        try {
          const res = await authService.login('admin@smarthostel.edu', 'Admin@123');
          setUser(res);
          setToken(res.access_token);
          localStorage.setItem('smart_hostel_token', res.access_token);
          localStorage.setItem('smart_hostel_user', JSON.stringify(res));
        } catch (e) {
          console.warn('Initial auto-login info:', e);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await authService.login(email, pass);
      setUser(res);
      setToken(res.access_token);
      localStorage.setItem('smart_hostel_token', res.access_token);
      localStorage.setItem('smart_hostel_user', JSON.stringify(res));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
  };

  const switchDemoUser = async (targetRole: 'ADMIN' | 'STUDENT') => {
    setIsLoading(true);
    try {
      if (targetRole === 'ADMIN') {
        await login('admin@smarthostel.edu', 'Admin@123');
      } else {
        await login('student101@smarthostel.edu', 'Student@123');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        token,
        isLoading,
        login,
        logout,
        switchDemoUser,
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
