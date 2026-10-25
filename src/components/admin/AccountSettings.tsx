"use client";

import { useState } from "react";
import { apiSendClient } from "@/lib/api-client";
import { useAuth, type User } from "@/lib/auth";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";
import styles from "./settings.module.css";

// A curated set of IANA zones the school actually serves, plus the browser's
// own zone. The API validates against the full IANA list regardless.
const ZONES = [
  "Africa/Kampala", "Africa/Lagos", "Africa/Nairobi", "Asia/Jakarta",
  "Asia/Manila", "Asia/Shanghai", "Asia/Tokyo", "Europe/London",
  "Europe/Madrid", "Europe/Rome", "America/New_York", "America/Los_Angeles", "UTC",
];

function detectedZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export default function AccountSettings() {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const zones = Array.from(new Set([detectedZone(), ...ZONES]));

  const [profile, setProfile] = useState({
    full_name: user?.full_name ?? "",
    native_language: user?.native_language ?? "",
    timezone: user?.timezone || detectedZone(),
  });
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState<"profile" | "password" | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy("profile");
    setError(null);
    setFlash(null);
    try {
      await apiSendClient<User>("PATCH", "/auth/me", {
        full_name: profile.full_name,
        native_language: profile.native_language || null,
        timezone: profile.timezone || null,
      });
      await refreshUser();
      setFlash(t("admin.settings.saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.settings.saveError"));
    } finally {
      setBusy(null);
    }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwords.next !== passwords.confirm) {
      setError(t("admin.settings.passwordMismatch"));
      return;
    }
    setBusy("password");
    setError(null);
    setFlash(null);
    try {
      await apiSendClient("POST", "/auth/change-password", {
        current_password: passwords.current,
        new_password: passwords.next,
      });
      setPasswords({ current: "", next: "", confirm: "" });
      setFlash(t("admin.settings.passwordUpdated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.settings.passwordError"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={ui.pageStack}>
      {(flash || error) && (
        <p role={error ? "alert" : "status"} className={error ? styles.error : styles.flash}>
          {error || flash}
        </p>
      )}

      <section className={ui.band} aria-labelledby="account-details-h">
        <div className={ui.bandHead}>
          <h2 id="account-details-h" className={ui.bandLabel}>{t("admin.settings.details")}</h2>
          <span className={ui.bandLabel}>{user?.email}</span>
        </div>
        <p className={ui.rowNote}>
          {t("admin.settings.detailsNote")}
        </p>
        <form className={ui.form} onSubmit={saveProfile}>
          <label>
            {t("admin.settings.displayName")}
            <input
              className={ui.input}
              required
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
            />
          </label>
          <label>
            {t("admin.settings.nativeLanguage")}
            <input
              className={ui.input}
              placeholder={t("admin.settings.nativePlaceholder")}
              value={profile.native_language}
              onChange={(e) => setProfile({ ...profile, native_language: e.target.value })}
            />
          </label>
          <label className={ui.wide}>
            {t("admin.settings.timezone")}
            <select
              className={ui.select}
              value={profile.timezone}
              onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
            >
              {zones.map((zone) => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
          </label>
          <div className={ui.formActions}>
            <button type="submit" className={ui.btnCoral} disabled={busy !== null}>
              {busy === "profile" ? t("admin.settings.saving") : t("admin.settings.save")}
            </button>
          </div>
        </form>
      </section>

      <section className={ui.band} aria-labelledby="account-password-h">
        <div className={ui.bandHead}>
          <h2 id="account-password-h" className={ui.bandLabel}>{t("admin.settings.password")}</h2>
          <span className={ui.bandLabel}>{t("admin.settings.passwordHint")}</span>
        </div>
        <form className={ui.form} onSubmit={savePassword}>
          <label className={ui.wide}>
            {t("admin.settings.currentPassword")}
            <input
              className={ui.input}
              type="password"
              required
              autoComplete="current-password"
              value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
            />
          </label>
          <label>
            {t("admin.settings.newPassword")}
            <input
              className={ui.input}
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={passwords.next}
              onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
            />
          </label>
          <label>
            {t("admin.settings.repeatPassword")}
            <input
              className={ui.input}
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
            />
          </label>
          <div className={ui.formActions}>
            <button type="submit" className={ui.btn} disabled={busy !== null}>
              {busy === "password" ? t("admin.settings.changing") : t("admin.settings.change")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
