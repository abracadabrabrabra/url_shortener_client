import { useState, useEffect } from 'react';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Проверить наличие токена при загрузке
    const token = localStorage.getItem('access_token');
    console.log('Initial auth check, token exists:', !!token);
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  const login = (email: string, password: string) => {
    console.log('Login called with:', { email, password });
    // TODO: добавить api
    const fakeToken = 'fake-jwt-token-' + Date.now();
    localStorage.setItem('access_token', fakeToken);
    setIsAuthenticated(true);
    console.log('Login successful, token saved, isAuthenticated set to true');
  };

  const register = (email: string, password: string) => {
    console.log('Register called with:', { email, password });
    // TODO: добавить api
    const fakeToken = 'fake-jwt-token-' + Date.now();
    localStorage.setItem('access_token', fakeToken);
    setIsAuthenticated(true);
    console.log('Register successful, token saved, isAuthenticated set to true');
  };

  const logout = () => {
    console.log('Logout called');
    localStorage.removeItem('access_token');
    setIsAuthenticated(false);
  };

  return { isAuthenticated, loading, login, register, logout };
}