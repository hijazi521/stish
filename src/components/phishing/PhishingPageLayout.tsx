
"use client";
import type { ReactNode } from 'react';
// ShieldAlert import is no longer needed if not used elsewhere in this file, but can be left for now.
// If it's the only usage, it would be good practice to remove the import as well.
// For this specific request, only the element removal is requested.
// import { ShieldAlert } from 'lucide-react'; 

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
          {/* The ShieldAlert icon that was here has been removed */}
          <h1 className="text-2xl sm:text-3xl font-bold text-primary pt-3">{title}</h1> {/* Added pt-3 for spacing if needed after icon removal, or adjust as desired */}
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

      </div>
    </div>
  );
}
