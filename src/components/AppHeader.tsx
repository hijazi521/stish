
"use client";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, LogOut, ShieldCheck, Settings2, LayoutDashboard } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function AppHeader() {
  const { isAuthenticated, logout, isLoading } = useAuth();
  const pathname = usePathname();

  const isAdminAdvancedPage = pathname === '/admin/advanced-dashboard';
  const dashboardToggleHref = isAdminAdvancedPage ? '/admin/dashboard' : '/admin/advanced-dashboard';
  const dashboardToggleText = isAdminAdvancedPage ? 'Main Dashboard' : 'Advanced Dashboard';
  const DashboardToggleIcon = isAdminAdvancedPage ? LayoutDashboard : Settings2;

  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={isAuthenticated ? "/admin/dashboard" : "/admin/login"} className="flex items-center gap-2 text-xl font-semibold">
          <ShieldCheck className="h-7 w-7 text-primary-foreground" /> 
          <span>Stish</span>
        </Link>
        <div className="flex items-center gap-2">
          {isAuthenticated && !isLoading && (
            <>
              <Link href={dashboardToggleHref}>
                <Button variant="ghost" className="text-primary-foreground hover:bg-primary/80">
                  <DashboardToggleIcon className="mr-2 h-4 w-4" />
                  {dashboardToggleText}
                </Button>
              </Link>
              <Button variant="ghost" onClick={logout} className="text-primary-foreground hover:bg-primary/80">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </>
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
      </div>
    </header>
  );
}
