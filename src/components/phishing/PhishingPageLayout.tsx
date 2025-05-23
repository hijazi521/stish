"use client";
import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';

interface PhishingPageLayoutProps {
  children: ReactNode;
  title: string;
  statusMessage?: string;
  isLoading?: boolean;
  error?: string | null;
}

export function PhishingPageLayout({ children, title, statusMessage, isLoading, error }: PhishingPageLayoutProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg bg-card p-6 sm:p-8 rounded-xl shadow-2xl border border-border">
        <div className="text-center mb-6">
          <ShieldAlert className="mx-auto h-12 w-12 text-destructive mb-3" />
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">{title}</h1>
          <p className="text-muted-foreground mt-1">This is a simulated page for awareness.</p>
        </div>

        {isLoading && (
          <div className="text-center my-6">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
            <p className="mt-3 text-muted-foreground">Processing request...</p>
          </div>
        )}

        {statusMessage && !isLoading && (
          <div className="my-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-md text-sm">
            {statusMessage}
          </div>
        )}
        
        {error && !isLoading && (
          <div className="my-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="mt-6">
          {children}
        </div>

        <p className="mt-8 text-xs text-center text-muted-foreground/70">
          This page is part of the Stish awareness platform. No real sensitive data is permanently stored or misused beyond this demonstration.
        </p>
      </div>
    </div>
  );
}
