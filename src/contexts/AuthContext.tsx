/* eslint-disable */
"use client";
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (user: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hardcoded credentials for demo purposes
const ADMIN_USER = "admin";
const ADMIN_PASS = "password";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedAuth = localStorage.getItem('stish_auth');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // This effect handles redirecting FROM the login page if already authenticated.
    // Redirecting TO the login page if not authenticated on an admin route
    // is now primarily handled by AdminLayout.
    if (!isLoading && isAuthenticated && pathname === '/admin/login') {
      router.push('/admin/dashboard'); // Use push to allow going back if intended, or replace
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  const login = async (user: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      localStorage.setItem('stish_auth', 'true');
      setIsAuthenticated(true);
      setIsLoading(false);
      router.push('/admin/dashboard'); // Redirect to dashboard on successful login
      return true;
    }
    setIsAuthenticated(false);
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    localStorage.removeItem('stish_auth');
    setIsAuthenticated(false);
    router.push('/admin/login'); // Redirect to login page on logout
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
