import type { AuthUser } from "@/lib/contracts/auth";

// TRADE-OFF: token in localStorage → client-only route protection + an XSS surface; acceptable for a mock-token demo.

const TOKEN_KEY = "ps.token";
const USER_KEY = "ps.user";

const isBrowser = (): boolean => typeof window !== "undefined";

export function getToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    // Corrupt/legacy value — treat as logged out.
    return null;
  }
}

export function setUser(user: AuthUser): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(USER_KEY);
}
