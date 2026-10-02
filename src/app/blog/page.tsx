import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Journal | Nile Language" };

export default function BlogPage() {
  return (
    <main className="content-page">
      <p className="eyebrow">Nile Language journal</p>
      <h1>Notes for better language learning.</h1>
      <p className="lede">Short, practical guidance from the people who teach and learn with Nile Language.</p>
      <div className="content-grid">
        <article className="content-item"><h2>How to choose a learning goal</h2><p>Start with the situation you want English to unlock, then make the goal specific enough to practise.</p></article>
        <article className="content-item"><h2>What makes feedback useful</h2><p>The best corrections are timely, concrete and connected to something you want to say.</p></article>
        <article className="content-item"><h2>Consistency beats intensity</h2><p>A realistic weekly rhythm gives new language enough repetition to become natural.</p></article>
      </div>
      <Link className="content-link" href="/checkout">Start learning</Link>
    </main>
  );
}
