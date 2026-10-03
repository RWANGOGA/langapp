"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import styles from "./page.module.css";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, isAuthenticated, isTutor, isAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const sessionExpired = searchParams.get("reason") === "session";

  // Redirect based on role after login
  useEffect(() => {
    if (isAuthenticated && !isLoading && !sessionExpired) {
      if (isAdmin) {
        router.push("/admin");
      } else if (isTutor) {
        router.push("/tutor");
      } else {
        router.push(callbackUrl.startsWith("/admin") ? "/dashboard" : callbackUrl);
      }
    }
  }, [isAuthenticated, isLoading, isAdmin, isTutor, router, callbackUrl, sessionExpired]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      // Redirect is handled by useEffect above
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Welcome Back</h1>
          <p>Sign in to your account</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={isSubmitting}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting || isLoading}>
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className={styles.footer}>
          <p>
            Don&apos;t have an account?{" "}
            <Link href={`/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}