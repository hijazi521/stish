"use client";
import type { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { LogProvider } from '@/contexts/LogContext';

export const AppProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <LogProvider>
        {children}
      </LogProvider>
    </AuthProvider>
  );
};
