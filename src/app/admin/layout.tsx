/* eslint-disable */
"use client";
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation'; // Added usePathname
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); // Get current pathname

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/admin/login') {
      // If not loading, not authenticated, and not already on the login page,
      // redirect to login page using replace to avoid adding to history.
      router.replace('/admin/login');
    }
  }, [isAuthenticated, isLoading, router, pathname]); // Added pathname to dependencies

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <main className="flex flex-grow items-center justify-center p-6">
          <div className="space-y-4 w-full max-w-lg">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-10 w-1/4" />
          </div>
        </main>
      </div>
    );
  }

  // If not authenticated AND we are NOT on the login page,
  // the useEffect above should handle the redirect.
  // Return null to prevent rendering protected content momentarily before redirect.
  if (!isAuthenticated && pathname !== '/admin/login') {
    return null;
  }

  // Otherwise (user is authenticated OR we are on the login page), render the layout with children.
  // The LoginPage itself will be a child and should always be renderable.
  // AuthContext will handle redirecting from /admin/login if already authenticated.
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
