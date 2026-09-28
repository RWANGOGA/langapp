"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Award, Clock, CreditCard, Crown, LayoutList, ListChecks, ShieldCheck, Users, Video } from "lucide-react";
import type { FeatureIcon, Plan } from "@/lib/packages-data";
import styles from "./checkout.module.css";

const ICONS: Record<FeatureIcon, typeof Clock> = { clock: Clock, list: ListChecks, content: LayoutList, video: Video, cert: Award, mentor: Users };
const n = (v: number) => v.toLocaleString("en-US");
const yen = (v: number) => `¥${n(v)}`, dong = (v: number) => `₫${n(v)}`, usd = (v: number) => `$${n(v)}`;
type Method = "card" | "line" | "paypay" | "zalopay" | "paypal";

export default function CheckoutClient({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const [planId, setPlanId] = useState<Plan["id"]>(plans.find((p) => p.popular)?.id ?? plans[0].id);
  const [method, setMethod] = useState<Method>("card");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plan = plans.find((p) => p.id === planId)!;

  async function pay() {
    setBusy(true); setError(null);
    try {
      // TODO: implement POST /api/checkout -> FastAPI (create order + payment session)
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packageId: plan.id, method }) });
      if (!res.ok) throw new Error();
      router.push("/matching");
    } catch {
      setError("We couldn't start your payment. Please try again.");
      setBusy(false);
    }
  }

  const radio = (id: Method, children: React.ReactNode) => (
    <label className={styles.method}>
      <input type="radio" name="method" checked={method === id} onChange={() => setMethod(id)} />
      {children}
    </label>
  );

  return (
    <main className={styles.main}>
      <section aria-labelledby="pk-h">
        <h2 id="pk-h">1. Select Your Learning Package</h2>
        <div className={styles.plans} role="radiogroup" aria-labelledby="pk-h">
          {plans.map((p) => (
            <article key={p.id} className={`${styles.plan} ${p.popular ? styles.popular : ""} ${p.id === planId ? styles.selected : ""}`}>
              {p.popular && <span className={styles.badge}>POPULAR</span>}
              <h3>{p.name}</h3>
              <p className={styles.sub}>Elegant Pricing</p>
              <p className={styles.price}>{yen(p.price.JPY)}</p>
              <p className={styles.alt}>{dong(p.price.VND)}/{usd(p.price.USD)}</p>
              <hr />
              <ul>
                {p.features.map((f) => { const I = ICONS[f.icon]; return <li key={f.label}><I size={20} strokeWidth={1.6} aria-hidden /> {f.label}</li>; })}
                {p.popular && <li><Crown size={22} color="#f2541b" aria-hidden /> <span className={styles.pill}>POPULAR</span></li>}
              </ul>
              <button type="button" role="radio" aria-checked={p.id === planId} className={`${styles.subscribe} ${p.id === planId ? styles.subscribeOn : ""}`} onClick={() => setPlanId(p.id)}>
                Subscribe Button
              </button>
            </article>
          ))}
        </div>
      </section>

      <aside aria-labelledby="co-h">
        <h2 id="co-h">2. Secure Payment Checkout</h2>
        <div className={styles.summary}>
          <h3>Order Summary</h3>
          <div className={styles.row}><span>Package: {plan.name}</span><span>{yen(plan.price.JPY)}</span></div>
          <hr />
          <div className={styles.row}><span>Price Summary in JPY</span><span>{yen(plan.price.JPY)}</span></div>
          <div className={styles.row}><span>VND</span><span>{dong(plan.price.VND)}</span></div>
          <div className={styles.row}><span>USD</span><span>{usd(plan.price.USD)}</span></div>
          <hr />
          <h3>Payment Method</h3>
          {radio("card", <><CreditCard size={20} aria-hidden /> <span className={styles.grow}>Credit/Debit Card</span><b className={styles.visa}>VISA</b><i className={styles.mc}><u /><u /></i></>)}
          <hr />
          <p className={styles.group}>Asian Regional Methods</p>
          <div className={styles.regional}>
            {radio("line", <span className={styles.line}>LINE Pay</span>)}
            {radio("paypay", <span className={styles.paypay}>PayPay</span>)}
            {radio("zalopay", <><span className={styles.momo}>mo<br />mo</span><span className={styles.zalo}>ZaloPay</span></>)}
            {radio("paypal", <span className={styles.paypal}>PayPal</span>)}
          </div>
          <hr />
          <p className={styles.total}>Total to Pay: {yen(plan.price.JPY)} <span>({dong(plan.price.VND)} / {usd(plan.price.USD)})</span></p>
          <div className={styles.trust}>
            <span><ShieldCheck size={34} strokeWidth={1.5} aria-hidden /> <b>Secure<br />Checkout</b></span>
            <span><ShieldCheck size={34} strokeWidth={1.5} aria-hidden /> <b>30-DAY MONEY-BACK<br />GUARANTEE</b><small>Satisfaction Guaranteed</small></span>
          </div>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <button type="button" className={styles.pay} onClick={pay} disabled={busy}>{busy ? "Processing…" : "Confirm & Pay Now"}</button>
        </div>
      </aside>
    </main>
  );
}