"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

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
  isAuthenticated: boolean;
  isTutor: boolean;
  isAdmin: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  role?: UserRole;
  native_language?: string;
  timezone?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8004/api/v1";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Login failed");
    }

    await fetchUser();
  };

  const register = async (data: RegisterData) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Registration failed");
    }

    await fetchUser();
  };

  const logout = async () => {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  };

  const refreshToken = async () => {
    const response = await fetch(`${API_URL}/auth/refresh`, {
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