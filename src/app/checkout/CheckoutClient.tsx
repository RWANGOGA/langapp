"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import type { CheckoutRegion, Plan } from "@/lib/packages-data";
import { formatMoney } from "@/lib/utils";
import ui from "@/components/portal/bands.module.css";
import styles from "./checkout.module.css";

/** Payment methods by their wire value - the same values the region list and
 *  the order carry. Named in words, not fake brand tiles: a coloured rectangle
 *  that only looks like a card logo is decoration, not information. */
const METHOD_LABEL: Record<string, string> = {
  card: "Credit or debit card",
  line: "LINE Pay",
  paypay: "PayPay",
  zalopay: "ZaloPay",
  momo: "MoMo",
  mobile_money: "Mobile Money",
  paypal: "PayPal",
};

const SUBJECTS = ["General English", "Business English", "IELTS Preparation", "TOEFL Preparation", "Academic Writing"];
const SESSION_TYPES: [string, string][] = [
  ["conversation", "Conversation practice"],
  ["grammar", "Grammar and writing"],
  ["exam_prep", "Exam preparation"],
  ["business", "Business English"],
];

export default function CheckoutClient({ plans, regions }: { plans: Plan[]; regions: CheckoutRegion[] }) {
  const router = useRouter();
  const [regionCode, setRegionCode] = useState(regions[0]?.code ?? "intl");
  const region = regions.find((r) => r.code === regionCode) ?? regions[0];
  const [planId, setPlanId] = useState<Plan["id"]>(plans.find((p) => p.popular)?.id ?? plans[0].id);
  const [method, setMethod] = useState<string>(region.methods[0]);
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [sessionType, setSessionType] = useState(SESSION_TYPES[0][0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plan = plans.find((p) => p.id === planId)!;
  const amount = plan.price[region.currency];

  function chooseRegion(code: string) {
    const next = regions.find((r) => r.code === code);
    if (!next) return;
    setRegionCode(code);
    // The chosen wallet may not serve the new region; fall back to one that does
    // rather than leave the order holding a method that cannot pay there.
    if (!next.methods.includes(method)) setMethod(next.methods[0]);
  }

  async function placeOrder() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package_id: plan.id,
          region: region.code,
          payment_method: method,
          subject,
          session_type: sessionType,
          duration_minutes: 60,
        }),
      });
      if (res.status === 401) {
        router.push(`/auth/login?callbackUrl=${encodeURIComponent(`/checkout?package=${plan.id}`)}`);
        return;
      }
      if (!res.ok) throw new Error();
      const order = await res.json();
      router.push(`/checkout/success?order=${order.id}`);
    } catch {
      setError("We couldn't record your order. Please check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={ui.pageHeading}>
        <div>
          <span className={ui.kicker}>Checkout</span>
          <h1>Reserve your place</h1>
          <p>
            Choose your study focus, where you'll pay from and the package that fits. Placing the
            order holds your place - you're not charged on this page.
          </p>
        </div>
      </div>

      <div className={ui.split}>
        <div className={ui.mainPane}>
          <section className={ui.band} aria-labelledby="session-h">
            <span className={ui.bandLabel}>Step 1</span>
            <h2 id="session-h" className={ui.bandTitle}>
              Your study session
            </h2>
            <div className={ui.form}>
              <label>
                Subject
                <select className={ui.select} value={subject} onChange={(e) => setSubject(e.target.value)}>
                  {SUBJECTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Session focus
                <select className={ui.select} value={sessionType} onChange={(e) => setSessionType(e.target.value)}>
                  {SESSION_TYPES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className={ui.band} aria-labelledby="region-h">
            <span className={ui.bandLabel}>Step 2</span>
            <h2 id="region-h" className={ui.bandTitle}>
              Where you'll pay from
            </h2>
            <p className={ui.bandEmpty}>
              Your region sets the single currency you're charged and the payment options that
              actually work there.
            </p>
            <div className={styles.choices} role="radiogroup" aria-labelledby="region-h">
              {regions.map((r) => (
                <label key={r.code} className={`${styles.choice} ${r.code === regionCode ? styles.choiceOn : ""}`}>
                  <input type="radio" name="region" checked={r.code === regionCode} onChange={() => chooseRegion(r.code)} />
                  <span>{r.label}</span>
                  <small>{r.currency}</small>
                </label>
              ))}
            </div>
          </section>

          <section className={ui.band} aria-labelledby="plan-h">
            <span className={ui.bandLabel}>Step 3</span>
            <h2 id="plan-h" className={ui.bandTitle}>
              Choose your package
            </h2>
            <div className={styles.planList} role="radiogroup" aria-labelledby="plan-h">
              {plans.map((p) => {
                const on = p.id === planId;
                return (
                  <div key={p.id} className={`${styles.plan} ${on ? styles.planOn : ""}`}>
                    <div className={styles.planHead}>
                      <div className={styles.planId}>
                        <h3 className={styles.planName}>
                          {p.name}
                          {p.popular && <span className={ui.statusPill}>Popular</span>}
                        </h3>
                        <p className={styles.planPrice}>
                          {formatMoney(p.price[region.currency], region.currency)}
                          <span>
                            {" "}· {p.months} {p.months > 1 ? "months" : "month"}
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={on}
                        className={on ? ui.btnCoral : ui.btn}
                        onClick={() => setPlanId(p.id)}
                      >
                        {on ? "Selected" : "Select"}
                      </button>
                    </div>
                    {p.features.length > 0 && (
                      <ul className={styles.planFeatures}>
                        {p.features.map((f) => (
                          <li key={f.label}>
                            <Check size={15} strokeWidth={2.4} aria-hidden />
                            {f.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className={ui.sidePane}>
          <section className={ui.band} aria-labelledby="summary-h">
            <span className={ui.bandLabel}>Order summary</span>
            <h2 id="summary-h" className={ui.bandTitle}>
              {plan.name}
            </h2>
            <dl className={ui.rows}>
              <div>
                <dt>Study focus</dt>
                <dd>{subject}</dd>
              </div>
              <div>
                <dt>Session</dt>
                <dd>{SESSION_TYPES.find(([v]) => v === sessionType)?.[1]}</dd>
              </div>
              <div>
                <dt>Paying from</dt>
                <dd>{region.label}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>{formatMoney(amount, region.currency)}</dd>
              </div>
            </dl>

            <span className={ui.subHead} id="method-h">
              How you'll pay
            </span>
            <div className={styles.methods} role="radiogroup" aria-labelledby="method-h">
              {region.methods.map((m) => (
                <label key={m} className={`${styles.method} ${m === method ? styles.methodOn : ""}`}>
                  <input type="radio" name="method" checked={m === method} onChange={() => setMethod(m)} />
                  <span>{METHOD_LABEL[m] ?? m}</span>
                </label>
              ))}
            </div>

            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <p className={styles.place}>
              <button type="button" className={ui.btnCoral} onClick={placeOrder} disabled={busy}>
                {busy ? "Recording…" : "Place order"}
              </button>
            </p>
            <p className={styles.fineprint}>
              Placing an order does not charge you now. It holds your place; payment is confirmed
              before tutor matching begins.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
