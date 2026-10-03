"use client";

import { useState } from "react";

export default function SubscriptionActions({ active }: { active: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!active) return null;

  async function cancel() {
    if (!window.confirm("Cancel future renewal? Your access remains active until expiration.")) return;
    setBusy(true);
    const response = await fetch("/api/v1/me/subscription/cancel", { method: "POST", credentials: "include" });
    setMessage(response.ok ? "Renewal cancelled. Access remains active until expiration." : "Unable to cancel renewal right now.");
    setBusy(false);
  }

  return <div><button type="button" className="subscription-action" onClick={() => void cancel()} disabled={busy}>{busy ? "Updating..." : "Cancel future renewal"}</button>{message && <small>{message}</small>}</div>;
}