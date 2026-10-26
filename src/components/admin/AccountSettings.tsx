"use client";

import { useState } from "react";
import { apiSendClient } from "@/lib/api-client";
import { useAuth, type User } from "@/lib/auth";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useBrowserZone, zoneGroups, zoneOffsetLabel } from "@/lib/timezones";
import ui from "@/components/portal/bands.module.css";
import styles from "./settings.module.css";

export default function AccountSettings() {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  // Read after mount: on the server this would be the datacentre's zone, and
  // two different answers in one field is a hydration lie.
  const browserZone = useBrowserZone();
  // null until the admin actually touches the field. An account can arrive
  // after the first render, and a guess kept in state would then be saved over
  // the zone the account already had.
  const [pickedZone, setPickedZone] = useState<string | null>(null);

  // What the select shows, in order of who decides: the admin's pick, the
  // account's own zone, and only then the browser's guess.
  const zone = pickedZone ?? user?.timezone ?? (browserZone || "UTC");
  // A pick always comes out of the list itself, so it needs no pinning; any
  // other value is pinned so the select can show what it holds - a value
  // missing from the options gets rewritten to the first option on the next
  // save, quietly changing a setting nobody meant to change.
  const groups = zoneGroups(
    pickedZone === null ? user?.timezone || browserZone : "",
    user?.timezone ? "auth.tz.group.saved" : "auth.tz.group.detected",
  );

  const [profile, setProfile] = useState({
    full_name: user?.full_name ?? "",
    native_language: user?.native_language ?? "",
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
        timezone: zone,
      });
      await refreshUser();
      setPickedZone(null);
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
              value={zone}
              onChange={(e) => setPickedZone(e.target.value)}
            >
              {groups.map((group) => (
                <optgroup key={group.key} label={t(group.key)}>
                  {group.zones.map((name) => {
                    const offset = zoneOffsetLabel(name);
                    return (
                      <option key={name} value={name}>
                        {offset ? `${name} · ${offset}` : name}
                      </option>
                    );
                  })}
                </optgroup>
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
