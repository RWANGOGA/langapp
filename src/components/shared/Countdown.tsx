"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "./shared.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

/** `initialSeconds` comes from the server so SSR and first client render match. */
export default function Countdown({ initialSeconds }: { initialSeconds: number }) {
  const { t } = useLanguage();
  const [left, setLeft] = useState(initialSeconds);

  useEffect(() => {
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;
  return (
    <div className={styles.countdown} role="timer" aria-label={t("learner.count.aria")}>
      <span className={styles.countLabel}>{t("learner.count.label")}</span>
      <span className={styles.countTime}>
        <b>{pad(h)}<i>{t("learner.count.hr")}</i></b>
        <b>{pad(m)}<i>{t("learner.count.min")}</i></b>
        <b>{pad(s)}<i>{t("learner.count.sec")}</i></b>
      </span>
    </div>
  );
}
