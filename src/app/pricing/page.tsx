import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Pricing | Nile Language" };

const plans = [
  ["Starter", "A focused weekly rhythm for building confidence.", "Choose a plan"],
  ["Intensive", "More lesson time for faster progress toward a clear goal.", "Start learning"],
  ["Flexible", "A custom pace shaped around your schedule and tutor.", "Talk to us"],
];

export default function PricingPage() {
  return (
    <main className="content-page">
      <p className="eyebrow">Simple learning plans</p>
      <h1>Choose a rhythm you can keep.</h1>
      <p className="lede">Every plan includes one-to-one lessons with an approved tutor. Select a package to see current availability and checkout options.</p>
      <div className="content-grid">
        {plans.map(([title, description, action]) => (
          <article key={title} className="content-item">
            <h2>{title}</h2>
            <p>{description}</p>
            <Link className="content-link" href="/checkout">{action}</Link>
          </article>
        ))}
      </div>
    </main>
  );
}
