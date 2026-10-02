"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import styles from "./page.module.css";

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  full_name: string;
  native_language: string;
  timezone: string;
}

const timezones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Australia/Sydney",
];

const languages = [
  "English",
  "Spanish",
  "French",
  "German",
  "Chinese",
  "Japanese",
  "Korean",
  "Vietnamese",
  "Portuguese",
  "Italian",
  "Russian",
  "Arabic",
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, isLoading } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    native_language: "",
    timezone: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Arriving from "Become a Tutor" (Step 0). The account is still a student
  // account - tutor status is granted only after an approved application.
  const tutorIntent = searchParams.get("intent") === "tutor";
  const callbackUrl =
    searchParams.get("callbackUrl") || (tutorIntent ? "/tutor/apply" : "/dashboard");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        // Every account registers as a student. Tutor access is earned through
        // the application process, never chosen at signup.
        intent: tutorIntent ? "tutor" : undefined,
        native_language: formData.native_language || undefined,
        timezone: formData.timezone || undefined,
      });
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>{tutorIntent ? "Create your account" : "Create Account"}</h1>
          <p>
            {tutorIntent
              ? "One more step before you can apply to teach"
              : "Join our language learning community"}
          </p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="full_name">Full Name</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              value={formData.full_name}
              onChange={handleChange}
              required
              autoComplete="name"
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
              disabled={isSubmitting}
            />
          </div>

          {/* No role selector: every account is a student account. Applicants
              start at /tutor/apply and are promoted only on approval. */}
          {tutorIntent && (
            <div className={styles.notice}>
              You are applying to teach on Nile Language. Your account starts as a
              student account — you become a tutor once your documents are reviewed
              and your demo lesson is passed.
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="native_language">Native Language (optional)</label>
            <select
              id="native_language"
              name="native_language"
              value={formData.native_language}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="">Select your native language</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="timezone">Timezone (optional)</label>
            <select
              id="timezone"
              name="timezone"
              value={formData.timezone}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="">Select your timezone</option>
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
              disabled={isSubmitting}
              minLength={8}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
              disabled={isSubmitting}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting || isLoading}>
            {isSubmitting ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className={styles.footer}>
          <p>
            Already have an account?{" "}
            <Link href={`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}