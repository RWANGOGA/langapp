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
import ui from "@/components/portal/bands.module.css";

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
      const updated = await updateTutorProfile({ headline, bio, country, timezone, availability });
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
        <div className={ui.pageStack}>
          <p role="alert" className={ui.statusBad}>
            Could not load your settings: {error}
          </p>
        </div>
      </TutorPageShell>
    );
  }
  if (!profile) {
    return (
      <TutorPageShell>
        <div className={ui.pageStack}>
          <p className={ui.lede}>Loading your profile…</p>
        </div>
      </TutorPageShell>
    );
  }

  return (
    <TutorPageShell>
      <div className={ui.pageStack}>
        <header className={ui.pageHeading}>
          <div>
            <p className={ui.kicker}>Settings</p>
            <h1>Your teaching profile</h1>
            <p>What learners read before they book you, and the hours you can teach each week.</p>
          </div>
          <Link className={ui.headerAction} href="/tutor/schedule">
            Open schedule <ArrowRight size={14} aria-hidden />
          </Link>
        </header>

        <section className={ui.band} aria-labelledby="standing-h">
          <h2 id="standing-h" className={ui.bandLabel}>
            Standing
          </h2>
          <dl className={ui.rows}>
            <div>
              <dt>Rating</dt>
              <dd>
                {profile.rating.toFixed(1)}{" "}
                <span className={ui.rowNote}>from {profile.reviewsCount} reviews</span>
              </dd>
            </div>
            <div>
              <dt>Approval</dt>
              <dd>
                {profile.isApproved ? "Approved tutor" : "Awaiting approval"}{" "}
                <span className={ui.rowNote}>set by the Nile Language team</span>
              </dd>
            </div>
            <div>
              <dt>Timezone</dt>
              <dd>{timezone || "not set"}</dd>
            </div>
          </dl>
        </section>

        <form onSubmit={save}>
          <section className={ui.band} aria-labelledby="profile-h">
            <h2 id="profile-h" className={ui.bandLabel}>
              Public profile
            </h2>
            <div className={ui.form}>
              <label className={ui.wide}>
                Headline
                <input
                  className={ui.input}
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  maxLength={200}
                  placeholder="e.g. Business English specialist with 8 years of exam prep"
                />
              </label>
              <label className={ui.wide}>
                Bio
                <textarea
                  className={ui.textarea}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  placeholder="How you teach, and who you teach best."
                />
              </label>
              <label>
                Country
                <input
                  className={ui.input}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  maxLength={50}
                />
              </label>
              <label>
                Timezone
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
                Weekly availability
              </h2>
              <span className={ui.bandLabel}>
                {availability.length} {availability.length === 1 ? "window" : "windows"}
              </span>
            </div>
            {availability.length === 0 && (
              <p className={ui.bandEmpty}>
                No windows yet. Add the hours you can teach each week so an administrator can match
                learners to you.
              </p>
            )}
            <div className={ui.form}>
              {availability.map((slot, i) => (
                <div key={i} className={`${ui.slot} ${ui.wide}`}>
                  <label>
                    Day
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
                    From
                    <input
                      className={ui.input}
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => setSlot(i, { startTime: e.target.value })}
                    />
                  </label>
                  <label>
                    To
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
                    Remove
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
                  Add window
                </button>
              </div>
            </div>
          </section>

          <section className={ui.band} aria-labelledby="save-h">
            <h2 id="save-h" className={ui.bandLabel}>
              Apply changes
            </h2>
            <p className={ui.bandEmpty}>
              Saving updates your public profile and the hours administrators see when they match
              learners to you.
            </p>
            <div className={ui.formActions}>
              <button type="submit" className={ui.btnCoral} disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
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
