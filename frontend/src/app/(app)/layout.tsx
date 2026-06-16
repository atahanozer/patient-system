"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";

// TRADE-OFF: route protection is client-side only because the token lives in localStorage (no SSR/middleware gate).

import { useAuth } from "@/lib/auth/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, token, isLoading, logout } = useAuth();

  // Redirect once hydration finishes and there is no token.
  React.useEffect(() => {
    if (!isLoading && !token) {
      router.replace("/login");
    }
  }, [isLoading, token, router]);

  // While hydrating from storage, show a lightweight skeleton.
  if (isLoading) {
    return (
      <div className="flex min-h-svh flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-40" />
        </header>
        <div className="flex flex-1 items-center justify-center p-6">
          <Skeleton className="h-32 w-full max-w-2xl" />
        </div>
      </div>
    );
  }

  // No token after hydration → render nothing; the effect above redirects.
  if (!token) {
    return null;
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold tracking-tight">Patient System</span>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
              <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                {user.role.toUpperCase()}
              </Badge>
            </div>
          ) : null}
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={logout} aria-label="Log out">
            <LogOutIcon className="size-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
