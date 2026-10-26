"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

export type UserRole = "student" | "tutor" | "admin";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string | null;
  native_language?: string | null;
  timezone?: string | null;
  is_active: boolean;
  is_verified: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  /** Re-reads /auth/me - call after PATCH /auth/me so the shell shows the new name. */
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isTutor: boolean;
  isAdmin: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  // No `role`: every account registers as a student. Applicants pass
  // intent="tutor" for analytics only - it does not grant tutor access.
  intent?: "tutor";
  native_language?: string;
  timezone?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8004/api/v1";
const PROXY = "/api/v1"; // Use relative URL so requests go through Next.js rewrite (first-party cookies)

/** Sign-in failures that are about the edge, not about the password. The pages
 * translate these; every other message is the server's own `detail` verbatim. */
export const RATE_LIMITED = "auth:rate-limited";
export const UNREACHABLE = "auth:unreachable";

/** FastAPI answers with JSON `detail`; a proxy in front of it (Render's edge,
 * nginx) answers with plain text such as "Too Many Requests". Parsing both as
 * JSON turned a readable reason into `Unexpected token 'T', ...`.
 * Returns a message, never a SyntaxError. */
async function failureMessage(response: Response, fallback: string): Promise<string> {
  let detail: unknown = null;
  try {
    const body: unknown = await response.json();
    detail = (body as { detail?: unknown } | null)?.detail ?? null;
  } catch {
    // Plain-text or empty body: the status carries the meaning.
  }
  if (typeof detail === "string" && detail.trim()) return detail.trim();
  if (response.status === 429) return RATE_LIMITED;
  if (response.status >= 500) return UNREACHABLE;
  return fallback;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      let response = await fetch(`${PROXY}/auth/me`, {
        credentials: "include",
      });
      // A rate-limited or still-waking edge answers before our API sees the
      // request. One short retry keeps a signed-in visitor signed in.
      if (response.status === 429 || response.status >= 500) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        response = await fetch(`${PROXY}/auth/me`, { credentials: "include" });
      }
      if (response.ok) {
        setUser(await response.json());
      } else if (response.status === 401 || response.status === 403) {
        setUser(null);
      }
      // Any other status leaves the session alone: a slow edge is not a logout.
    } catch {
      // Network hiccup: keep whatever user we already had.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${PROXY}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(await failureMessage(response, "Login failed"));
    }

    await fetchUser();
  };

  const register = async (data: RegisterData) => {
    // Registration must not inherit an existing session, especially an admin session.
    await logout();

    const response = await fetch(`${PROXY}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(await failureMessage(response, "Registration failed"));
    }
  };

  const logout = async () => {
    await fetch(`${PROXY}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  };

  const refreshToken = async () => {
    const response = await fetch(`${PROXY}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      setUser(null);
      throw new Error("Token refresh failed");
    }

    await fetchUser();
  };

  const isAuthenticated = !!user;
  const isTutor = user?.role === "tutor" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        refreshToken,
        refreshUser: fetchUser,
        isAuthenticated,
        isTutor,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}