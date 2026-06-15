"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import {
  loginResponseSchema,
  type AuthUser,
} from "@/lib/contracts/auth";
import {
  clearToken,
  clearUser,
  getToken,
  getUser,
  setToken,
  setUser,
} from "@/lib/auth/storage";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

/**
 * Decode a JWT's `exp` claim with a manual base64url `atob` (no extra dep).
 * Returns the expiry in **seconds**, or null when the token is malformed.
 */
function getTokenExp(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    // base64url → base64, then decode.
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(base64)) as { exp?: number };
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

/** A token is usable only if it parses and (when it has an exp) is not expired. */
function isTokenValid(token: string): boolean {
  const exp = getTokenExp(token);
  // No exp claim (e.g. an opaque mock token) → treat as valid for the demo.
  if (exp === null) return true;
  return exp * 1000 > Date.now();
}

/** Read + validate the persisted session once (client-only; SSR-safe). */
function readStoredSession(): { token: string | null; user: AuthUser | null } {
  const storedToken = getToken();
  if (storedToken && isTokenValid(storedToken)) {
    return { token: storedToken, user: getUser() };
  }
  if (storedToken) {
    // Expired/malformed → clear so a stale token can't linger.
    clearToken();
    clearUser();
  }
  return { token: null, user: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Lazy initializer runs once. On the server the storage helpers return null
  // (SSR-safe); on the client they hydrate the persisted session synchronously,
  // so there is no setState-in-effect / cascading-render churn.
  const [session, setSession] = React.useState(readStoredSession);
  const { token, user } = session;
  // Mount flag: false on the server / first paint, true after the client
  // mounts. While false the route guard shows its hydration skeleton, which
  // also avoids a server/client markup mismatch around the auth state.
  const isMounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isLoading = !isMounted;

  const login = React.useCallback(
    async (email: string, password: string) => {
      const res = await apiClient.post("/auth/login", { email, password });
      const { token: nextToken, user: nextUser } = loginResponseSchema.parse(
        res.data,
      );
      setToken(nextToken);
      setUser(nextUser);
      setSession({ token: nextToken, user: nextUser });
    },
    [],
  );

  const logout = React.useCallback(() => {
    clearToken();
    clearUser();
    setSession({ token: null, user: null });
    queryClient.clear();
    router.replace("/login");
  }, [queryClient, router]);

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, token, isLoading, login, logout }),
    [user, token, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
