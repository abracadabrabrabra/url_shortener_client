import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { apiClient } from '../api/client';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  userEmail: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const loginInProgress = useRef(false);

  useEffect(() => {
    const token = apiClient.getAccessToken();
    const email = localStorage.getItem('user_email');
    console.log('AuthProvider init - token:', !!token, 'email:', email);
    setIsAuthenticated(!!token);
    setUserEmail(email);
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    if (loginInProgress.current) {
      console.log('Login already in progress, skipping');
      return;
    }

    loginInProgress.current = true;
    console.log('Login attempt for:', email);

    try {
      const data = await apiClient.login(email, password);
      console.log('Login success, received tokens');
      localStorage.setItem('user_email', email);
      setUserEmail(email);
      setIsAuthenticated(true);
      console.log('Auth state updated');
      return data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      loginInProgress.current = false;
    }
  };

  const register = async (email: string, password: string) => {
    console.log('Register attempt for:', email);
    try {
      await apiClient.register(email, password);
      console.log('Registration success, auto-logging in...');
      await login(email, password);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('Logout called');
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      await apiClient.logout(refreshToken);
    } else {
      apiClient.logoutSilent();
    }
    localStorage.removeItem('user_email');
    setUserEmail(null);
    setIsAuthenticated(false);
    console.log('Logout complete');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, register, logout, userEmail }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}