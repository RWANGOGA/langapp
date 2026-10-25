"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import TutorPageShell from "@/components/tutor/TutorPageShell";
import {
  AvailabilitySlot,
  getTutorProfile,
  updateTutorProfile,
  TutorProfileSettings,
} from "@/lib/tutor-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";

export default function TutorSettingsPage() {
  const { t } = useLanguage();
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(
    (_, n) => t(`tutor.settings.day${n}`),
  );
  const [profile, setProfile] = useState<TutorProfileSettings | null>(null);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [timezone, setTimezone] = useState("");
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTutorProfile()
      .then((p) => {
        setProfile(p);
        setHeadline(p.headline ?? "");
        setBio(p.bio ?? "");
        setCountry(p.country ?? "");
        setTimezone(p.timezone ?? "UTC");
        setAvailability(p.availability);
      })
      .catch((e) => setError(e.message));
  }, []);

  const setSlot = (i: number, patch: Partial<AvailabilitySlot>) =>
    setAvailability((slots) => slots.map((s, n) => (n === i ? { ...s, ...patch } : s)));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const updated = await updateTutorProfile({ headline, bio, country, timezone, availability });
      setProfile(updated);
      setAvailability(updated.availability);
      setMsg({ ok: true, text: t("tutor.settings.saved") });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : t("tutor.settings.saveFailed") });
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <TutorPageShell>
        <div className={ui.pageStack}>
          <p role="alert" className={ui.statusBad}>
            {t("tutor.settings.loadError", { message: error })}
          </p>
        </div>
      </TutorPageShell>
    );
  }
  if (!profile) {
    return (
      <TutorPageShell>
        <div className={ui.pageStack}>
          <p className={ui.lede}>{t("tutor.settings.loading")}</p>
        </div>
      </TutorPageShell>
    );
  }

  return (
    <TutorPageShell>
      <div className={ui.pageStack}>
        <header className={ui.pageHeading}>
          <div>
            <p className={ui.kicker}>{t("tutor.settings.kicker")}</p>
            <h1>{t("tutor.settings.title")}</h1>
            <p>{t("tutor.settings.lede")}</p>
          </div>
          <Link className={ui.headerAction} href="/tutor/schedule">
            {t("tutor.common.openSchedule")} <ArrowRight size={14} aria-hidden />
          </Link>
        </header>

        <section className={ui.band} aria-labelledby="standing-h">
          <h2 id="standing-h" className={ui.bandLabel}>
            {t("tutor.settings.standing")}
          </h2>
          <dl className={ui.rows}>
            <div>
              <dt>{t("tutor.settings.rating")}</dt>
              <dd>
                {profile.rating.toFixed(1)}{" "}
                <span className={ui.rowNote}>{t("tutor.settings.reviewsFrom", { n: profile.reviewsCount })}</span>
              </dd>
            </div>
            <div>
              <dt>{t("tutor.settings.approval")}</dt>
              <dd>
                {profile.isApproved ? t("tutor.settings.approved") : t("tutor.settings.awaiting")}{" "}
                <span className={ui.rowNote}>{t("tutor.settings.approvalNote")}</span>
              </dd>
            </div>
            <div>
              <dt>{t("tutor.settings.timezone")}</dt>
              <dd>{timezone || t("tutor.settings.notSet")}</dd>
            </div>
          </dl>
        </section>

        <form onSubmit={save}>
          <section className={ui.band} aria-labelledby="profile-h">
            <h2 id="profile-h" className={ui.bandLabel}>
              {t("tutor.settings.publicProfile")}
            </h2>
            <div className={ui.form}>
              <label className={ui.wide}>
                {t("tutor.settings.headline")}
                <input
                  className={ui.input}
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  maxLength={200}
                  placeholder={t("tutor.settings.headlinePlaceholder")}
                />
              </label>
              <label className={ui.wide}>
                {t("tutor.settings.bio")}
                <textarea
                  className={ui.textarea}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  placeholder={t("tutor.settings.bioPlaceholder")}
                />
              </label>
              <label>
                {t("tutor.settings.country")}
                <input
                  className={ui.input}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  maxLength={50}
                />
              </label>
              <label>
                {t("tutor.settings.timezone")}
                <input
                  className={ui.input}
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  maxLength={50}
                  placeholder="Africa/Nairobi"
                />
              </label>
            </div>
          </section>

          <section className={ui.band} aria-labelledby="avail-h">
            <div className={ui.bandHead}>
              <h2 id="avail-h" className={ui.bandLabel}>
                {t("tutor.settings.weeklyAvailability")}
              </h2>
              <span className={ui.bandLabel}>
                {t(availability.length === 1 ? "tutor.settings.windowOne" : "tutor.settings.windowOther", { n: availability.length })}
              </span>
            </div>
            {availability.length === 0 && (
              <p className={ui.bandEmpty}>
                {t("tutor.settings.noWindows")}
              </p>
            )}
            <div className={ui.form}>
              {availability.map((slot, i) => (
                <div key={i} className={`${ui.slot} ${ui.wide}`}>
                  <label>
                    {t("tutor.settings.day")}
                    <select
                      className={ui.select}
                      value={slot.dayOfWeek}
                      onChange={(e) => setSlot(i, { dayOfWeek: Number(e.target.value) })}
                    >
                      {DAYS.map((d, n) => (
                        <option key={d} value={n}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t("tutor.settings.from")}
                    <input
                      className={ui.input}
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => setSlot(i, { startTime: e.target.value })}
                    />
                  </label>
                  <label>
                    {t("tutor.settings.to")}
                    <input
                      className={ui.input}
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => setSlot(i, { endTime: e.target.value })}
                    />
                  </label>
                  <button
                    type="button"
                    className={ui.btn}
                    onClick={() => setAvailability((s) => s.filter((_, n) => n !== i))}
                  >
                    {t("tutor.settings.remove")}
                  </button>
                </div>
              ))}
              <div className={ui.wide}>
                <button
                  type="button"
                  className={ui.btn}
                  onClick={() =>
                    setAvailability((s) => [
                      ...s,
                      { dayOfWeek: 1, startTime: "09:00", endTime: "10:00", timezone },
                    ])
                  }
                >
                  {t("tutor.settings.addWindow")}
                </button>
              </div>
            </div>
          </section>

          <section className={ui.band} aria-labelledby="save-h">
            <h2 id="save-h" className={ui.bandLabel}>
              {t("tutor.settings.applyChanges")}
            </h2>
            <p className={ui.bandEmpty}>
              {t("tutor.settings.applyNote")}
            </p>
            <div className={ui.formActions}>
              <button type="submit" className={ui.btnCoral} disabled={busy}>
                {busy ? t("tutor.common.saving") : t("tutor.settings.saveChanges")}
              </button>
              {msg && (
                <p role="status" className={msg.ok ? ui.statusOk : ui.statusBad}>
                  {msg.text}
                </p>
              )}
            </div>
          </section>
        </form>
      </div>
    </TutorPageShell>
  );
}
