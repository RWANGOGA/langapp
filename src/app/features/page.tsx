import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Features | Nile Language" };

const features = [
  ["Matched tutoring", "Work with an approved tutor selected around your goals, level and availability."],
  ["Structured progress", "Follow a clear learning path with sessions, practice and measurable milestones."],
  ["Flexible lessons", "Book focused one-to-one English lessons that fit your weekly schedule."],
];

export default function FeaturesPage() {
  return (
    <main className="content-page">
      <p className="eyebrow">The Nile Language approach</p>
      <h1>Everything you need to keep learning.</h1>
      <p className="lede">A practical English learning experience built around an expert tutor, a clear goal and steady progress.</p>
      <div className="content-grid">
        {features.map(([title, description]) => <article key={title} className="content-item"><h2>{title}</h2><p>{description}</p></article>)}
      </div>
      <Link className="content-link" href="/tutors">Meet the tutors</Link>
    </main>
  );
}
