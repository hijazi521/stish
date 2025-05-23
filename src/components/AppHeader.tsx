"use client";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, LogOut, ShieldCheck } from 'lucide-react'; // ShieldCheck for Stish logo concept

export function AppHeader() {
  const { isAuthenticated, logout, isLoading } = useAuth();

  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={isAuthenticated ? "/admin/dashboard" : "/admin/login"} className="flex items-center gap-2 text-xl font-semibold">
          <ShieldCheck className="h-7 w-7 text-accent" />
          <span>Stish</span>
        </Link>
        {isAuthenticated && !isLoading && (
          <Button variant="ghost" onClick={logout} className="text-primary-foreground hover:bg-primary/80">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        )}
        {!isAuthenticated && !isLoading && (
           <Link href="/admin/login">
            <Button variant="ghost" className="text-primary-foreground hover:bg-primary/80">
              <LogIn className="mr-2 h-4 w-4" />
              Admin Login
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
