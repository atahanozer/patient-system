import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import { clearToken, clearUser, getToken } from "@/lib/auth/storage";

/** Normalized error shape surfaced to callers (UI/data layer). */
export interface ApiError {
  status: number;
  message: string;
}

/** Narrow an unknown thrown value to our normalized {@link ApiError}. */
export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    typeof (value as { status: unknown }).status === "number"
  );
}

/** Backend error envelope: { statusCode, message, error, timestamp, path }. */
interface BackendErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Request interceptor: attach Bearer token from storage when present.
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function backendMessage(body: BackendErrorBody | undefined): string | undefined {
  if (!body) return undefined;
  const { message } = body;
  if (Array.isArray(message)) return message.join(", ");
  return message;
}

// Response interceptor: handle 401 (clear session + redirect) and normalize errors.
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<BackendErrorBody>) => {
    const status = error.response?.status ?? 0;

    if (status === 401) {
      clearToken();
      clearUser();
      // Guard against redirect loops and SSR: only redirect in the browser
      // and only when we are not already on the login page.
      if (isBrowser() && !window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }

    const normalized: ApiError = {
      status,
      message:
        backendMessage(error.response?.data) ??
        error.message ??
        "Something went wrong",
    };

    return Promise.reject(normalized);
  },
);
