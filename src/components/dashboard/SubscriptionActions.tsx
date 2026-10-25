"use client";

import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageProvider";

export default function SubscriptionActions({ active }: { active: boolean }) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!active) return null;

  async function cancel() {
    if (!window.confirm(t("learner.sub.confirmCancel"))) return;
    setBusy(true);
    const response = await fetch("/api/v1/me/subscription/cancel", { method: "POST", credentials: "include" });
    setMessage(response.ok ? t("learner.sub.cancelled") : t("learner.sub.cancelFail"));
    setBusy(false);
  }

  return <div><button type="button" className="subscription-action" onClick={() => void cancel()} disabled={busy}>{busy ? t("learner.sub.updating") : t("learner.sub.cancelRenewal")}</button>{message && <small>{message}</small>}</div>;
}