"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "./BackLink.module.css";

/**
 * One back affordance for every surface. It returns to the previous page via
 * history when there is one, and falls back to a known route when the tab was
 * opened cold (deep link, new tab) so it never dead-ends.
 *
 * `framed` wraps it in a page-width bar for the global mount in the root
 * layout; portal frames already supply their own padding, so they mount it
 * unframed. Mounted globally it must not duplicate the portal's own control,
 * hence `hiddenOn`.
 */
export default function BackLink({
  fallback = "/",
  hiddenOn = [],
  framed = false,
}: {
  /** Route to use when there is no browser history to step back into. */
  fallback?: string;
  /** Path prefixes where the control should not render at all. */
  hiddenOn?: string[];
  /** Wrap in a page-width bar (global mount) instead of inline. */
  framed?: boolean;
}) {
  const path = usePathname();
  const router = useRouter();
  const { t } = useLanguage();

  // The landing page is home: there is nowhere to go back to.
  if (path === "/") return null;
  const suppressed = hiddenOn.some((p) => path === p || path.startsWith(p + "/"));
  if (suppressed) return null;

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  };

  const control = (
    <button type="button" className={styles.back} onClick={goBack}>
      <ArrowLeft size={14} strokeWidth={2.2} aria-hidden />
      <span>{t("nav.back")}</span>
    </button>
  );

  if (!framed) return control;
  return (
    <div className={styles.bar}>
      <div className={styles.barInner}>{control}</div>
    </div>
  );
}
