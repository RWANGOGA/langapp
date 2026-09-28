"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, User, Video } from "lucide-react";
import styles from "./apply.module.css";

const DOC_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime"];
const LANGS = ["English", "Japanese", "Vietnamese", "Spanish", "Other"];

function check(file: File, types: string[], maxMB: number) {
  if (!types.includes(file.type)) return "Unsupported file type.";
  if (file.size > maxMB * 1024 * 1024) return `File is larger than ${maxMB}MB.`;
  return null;
}

function DropZone({ icon, text, button, accept, types, maxMB, file, onFile }: {
  icon: React.ReactNode; text: string; button: string; accept: string; types: string[]; maxMB: number;
  file: File | null; onFile: (f: File | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const take = (f?: File) => {
    if (!f) return;
    const e = check(f, types, maxMB);
    setErr(e);
    onFile(e ? null : f);
  };
  const drop = (e: DragEvent) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); };

  return (
    <>
      <div className={`${styles.drop} ${over ? styles.dropOver : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}>
        {icon}
        <span>{file ? <><strong>{file.name}</strong> ({(file.size / 1048576).toFixed(1)}MB)</> : text}</span>
        <button type="button" onClick={() => (file ? (onFile(null), setErr(null)) : input.current?.click())}>{file ? "Remove" : button}</button>
        <input ref={input} type="file" accept={accept} hidden onChange={(e) => take(e.target.files?.[0])} />
      </div>
      {err && <p role="alert" className={styles.err}>{err}</p>}
    </>
  );
}

export default function ApplicationForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [language, setLanguage] = useState("English");
  const [years, setYears] = useState("");
  const [cert, setCert] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = [fullName.trim().length > 1 && years !== "" && Number(years) >= 0, !!cert, !!video, false];
  const current = done.findIndex((d) => !d);
  const ready = done[0] && done[1] && done[2];
  const STEPS = ["Personal Info", "Certifications (TEFL/TESOL)", "Intro Video", "Schedule Availability"];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true); setError(null);
    const fd = new FormData();
    fd.set("fullName", fullName.trim()); fd.set("nativeLanguage", language); fd.set("years", years);
    fd.set("certificate", cert!); fd.set("video", video!);
    try {
      // TODO: implement POST /api/tutor/applications -> FastAPI (store files, create application)
      const res = await fetch("/api/tutor/applications", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      router.push("/tutor/apply/schedule");
    } catch {
      setError("We couldn't submit your application. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form className={styles.layout} onSubmit={submit}>
      <nav className={styles.card} aria-label="Onboarding progress">
        <h2>Onboarding Progress</h2>
        <ol className={styles.steps}>
          {STEPS.map((label, i) => {
            const state = done[i] ? "done" : i === current ? "cur" : "todo";
            return (
              <li key={label} className={`${styles.step} ${styles[state]}`} aria-current={state === "cur" ? "step" : undefined}>
                <span className={styles.dot}>{i === 0 ? <User size={22} /> : i + 1}</span>
                <span className={styles.stepLabel}>{label}</span>
                {done[i] && <Check size={16} className={styles.tick} aria-label="Completed" />}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className={`${styles.card} ${styles.fields}`}>
        <h3>Personal Details</h3>
        <div className={styles.f3}>
          <label>Full Name<input className={styles.filled} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Alex Rodriguez" required /></label>
          <label>Native Language
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>{LANGS.map((l) => <option key={l}>{l}</option>)}</select>
          </label>
          <label>Teaching Experience years
            <span className={styles.years}><input type="number" min={0} max={60} value={years} onChange={(e) => setYears(e.target.value)} required /> years</span>
          </label>
        </div>

        <h3>Qualifications</h3>
        <p className={styles.fieldLabel}>Upload your TEFL/TESOL Certificate</p>
        <DropZone icon={<FileText size={34} strokeWidth={1.4} />} text="Drag & drop your certificate (PDF, JPG, PNG) max 5MB" button="Choose File" accept=".pdf,.jpg,.jpeg,.png" types={DOC_TYPES} maxMB={5} file={cert} onFile={setCert} />

        <h3>Video Intro Upload</h3>
        <p className={styles.fieldLabel}>Upload Your Intro Video</p>
        <DropZone icon={<Video size={34} strokeWidth={1.4} />} text="Upload your short introduction video (MP4, MOV) max 100MB" button="Select Video" accept=".mp4,.mov" types={VIDEO_TYPES} maxMB={100} file={video} onFile={setVideo} />

        {error && <p role="alert" className={styles.err}>{error}</p>}
        <div className={styles.submitRow}>
          <button type="submit" className={styles.submit} disabled={!ready || busy}>
            {busy ? "Submitting…" : <>Submit Application<small>Continue to Schedule Availability</small></>}
          </button>
        </div>
      </div>
    </form>
  );
}