"use client";

import { FormEvent, useEffect, useState } from "react";
import TutorPageShell from "@/components/tutor/TutorPageShell";
import {
  AvailabilitySlot,
  getTutorProfile,
  updateTutorProfile,
  TutorProfileSettings,
} from "@/lib/tutor-data";
import styles from "@/components/tutor/tutor.module.css";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TutorSettingsPage() {
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
      const updated = await updateTutorProfile({
        headline,
        bio,
        country,
        timezone,
        availability,
      });
      setProfile(updated);
      setAvailability(updated.availability);
      setMsg({ ok: true, text: "Profile saved." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <TutorPageShell>
        <section className={styles.card}>
          <p className={styles.subTitle}>Could not load your settings: {error}</p>
        </section>
      </TutorPageShell>
    );
  }
  if (!profile) {
    return (
      <TutorPageShell>
        <section className={styles.card}>
          <p className={styles.subTitle}>Loading…</p>
        </section>
      </TutorPageShell>
    );
  }

  return (
    <TutorPageShell>
      <section className={styles.card} aria-labelledby="settings-h">
        <h1 id="settings-h" className={styles.cardTitle}>Settings</h1>
        <p className={styles.subTitle}>
          Rating {profile.rating.toFixed(1)} from {profile.reviewsCount} reviews ·{" "}
          {profile.isApproved ? "Approved tutor" : "Awaiting approval"}. Ratings and approval are
          set by the Nile Language team and cannot be edited here.
        </p>
        <hr className={styles.rule} />

        <form className={styles.form} onSubmit={save}>
          <label>
            Headline
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              maxLength={200}
              placeholder="e.g. Business English specialist with 8 years of exam prep"
            />
          </label>
          <label>
            Bio
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="How you teach, and who you teach best."
            />
          </label>
          <div className={styles.linkForm}>
            <label>
              Country
              <input value={country} onChange={(e) => setCountry(e.target.value)} maxLength={50} />
            </label>
            <label>
              Timezone
              <input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                maxLength={50}
                placeholder="Africa/Nairobi"
              />
            </label>
          </div>

          <h2 className={styles.subTitle}>Weekly availability</h2>
          {availability.length === 0 && (
            <p className={styles.subTitle}>No windows yet. Add the hours you can teach each week.</p>
          )}
          {availability.map((slot, i) => (
            <div key={i} className={styles.linkForm}>
              <label>
                Day
                <select
                  className={styles.select}
                  value={slot.dayOfWeek}
                  onChange={(e) => setSlot(i, { dayOfWeek: Number(e.target.value) })}
                >
                  {DAYS.map((d, n) => (
                    <option key={d} value={n}>{d}</option>
                  ))}
                </select>
              </label>
              <label>
                From
                <input type="time" value={slot.startTime} onChange={(e) => setSlot(i, { startTime: e.target.value })} />
              </label>
              <label>
                To
                <input type="time" value={slot.endTime} onChange={(e) => setSlot(i, { endTime: e.target.value })} />
              </label>
              <button
                type="button"
                className={styles.btnOutline}
                onClick={() => setAvailability((s) => s.filter((_, n) => n !== i))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className={styles.btnOutline}
            onClick={() =>
              setAvailability((s) => [
                ...s,
                { dayOfWeek: 1, startTime: "09:00", endTime: "10:00", timezone },
              ])
            }
          >
            Add window
          </button>

          <button type="submit" className={styles.submit} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
          {msg && (
            <p role="status" style={{ color: msg.ok ? "var(--teal)" : "var(--coral)" }}>
              {msg.text}
            </p>
          )}
        </form>
      </section>
    </TutorPageShell>
  );
}
