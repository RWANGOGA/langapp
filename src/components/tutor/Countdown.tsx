"use client";

import { useEffect, useState } from "react";
import styles from "./tutor.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

/** `initialSeconds` comes from the server so SSR and first client render match. */
export default function Countdown({ initialSeconds }: { initialSeconds: number }) {
  const [left, setLeft] = useState(initialSeconds);

  useEffect(() => {
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;
  return (
    <div className={styles.countdown} role="timer" aria-label="Time until class starts">
      <span className={styles.countLabel}>CLASS STARTS IN:</span>
      <span className={styles.countTime}>{pad(h)}:{pad(m)}:{pad(s)}</span>
      <span className={styles.countUnits}><i>hr</i><i>min</i><i>sec</i></span>
    </div>
  );
}