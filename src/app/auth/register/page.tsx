"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth, RATE_LIMITED, UNREACHABLE } from "@/lib/auth";
import { useLanguage } from "@/i18n/LanguageProvider";
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
  const { t } = useLanguage();
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
      setError(t("auth.register.passwordMismatch"));
      return;
    }

    if (formData.password.length < 8) {
      setError(t("auth.register.passwordShort"));
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
      // Throttled or offline reads as the edge's problem, not the visitor's.
      const message =
        err instanceof Error && err.message === RATE_LIMITED
          ? t("auth.errors.tooMany")
          : err instanceof Error && err.message === UNREACHABLE
            ? t("auth.errors.offline")
            : err instanceof Error
              ? err.message
              : t("auth.register.failed");
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>{tutorIntent ? t("auth.register.titleTutor") : t("auth.register.title")}</h1>
          <p>
            {tutorIntent
              ? t("auth.register.subtitleTutor")
              : t("auth.register.subtitle")}
          </p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="full_name">{t("auth.register.fullName")}</label>
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
            <label htmlFor="email">{t("auth.email")}</label>
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
              {t("auth.register.tutorNotice")}
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="native_language">{t("auth.register.nativeLanguage")}</label>
            <select
              id="native_language"
              name="native_language"
              value={formData.native_language}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="">{t("auth.register.selectLanguage")}</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="timezone">{t("auth.register.timezone")}</label>
            <select
              id="timezone"
              name="timezone"
              value={formData.timezone}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="">{t("auth.register.selectTimezone")}</option>
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="password">{t("auth.password")}</label>
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
            <label htmlFor="confirmPassword">{t("auth.register.confirmPassword")}</label>
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
            {isSubmitting ? t("auth.register.submitting") : t("auth.register.submit")}
          </button>
        </form>

        <div className={styles.footer}>
          <p>
            {t("auth.register.haveAccount")}{" "}
            <Link href={`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
              {t("auth.register.signin")}
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