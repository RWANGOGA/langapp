import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Resources | Nile Language" };

export default function ResourcesPage() {
  return (
    <main className="content-page">
      <p className="eyebrow">Learning resources</p>
      <h1>Useful practice between lessons.</h1>
      <p className="lede">Your tutor can turn these study habits into a weekly plan that matches your level and goals.</p>
      <div className="content-grid">
        <article className="content-item"><h2>Keep a speaking log</h2><p>Write down one useful phrase after every conversation and use it again the next day.</p></article>
        <article className="content-item"><h2>Review in short sessions</h2><p>Ten focused minutes of review is easier to sustain than an occasional long study session.</p></article>
        <article className="content-item"><h2>Bring real questions</h2><p>Save unclear phrases from work, travel or daily life and bring them to your next lesson.</p></article>
      </div>
      <Link className="content-link" href="/tutor/requirements">Teach with Nile Language</Link>
    </main>
  );
}
