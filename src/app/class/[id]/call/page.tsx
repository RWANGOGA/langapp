"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/i18n/LanguageProvider";
import { getCallToken, type CallResult } from "@/lib/call-data";
import styles from "./call-page.module.css";

// The media client touches browser APIs (getUserMedia, WebSockets) the moment it
// loads, so it must never be server-rendered. Loading it through next/dynamic
// with ssr:false keeps the initial HTML honest (a connecting state) and the SDK
// strictly client-side.
const LessonCall = dynamic(() => import("@/components/call/LessonCall"), {
  ssr: false,
});

export default function LessonCallPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();
  const classId = Number(params?.id);
  const validId = Number.isInteger(classId) && classId > 0;
  const [result, setResult] = useState<CallResult | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Unauthenticated visitors are sent to login and returned here on success.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/auth/login?callbackUrl=${encodeURIComponent(`/class/${classId}/call`)}`);
    }
  }, [isLoading, isAuthenticated, router, classId]);

  // Once signed in, exchange the session for a room-scoped token. Re-runs on
  // retry so a transient network blip is recoverable without leaving the page.
  // The only setState happens in the async callback, never synchronously.
  useEffect(() => {
    if (isLoading || !isAuthenticated || !validId) return;
    let alive = true;
    getCallToken(classId).then((r) => {
      if (alive) setResult(r);
    });
    return () => {
      alive = false;
    };
  }, [isLoading, isAuthenticated, validId, classId, attempt]);

  // Which home to fall back to depends on the role; a tutor who is also an admin
  // still means the tutor portal for a lesson they teach.
  const homeHref = "/dashboard";

  let body: ReactNode;
  if (isLoading || !isAuthenticated) {
    body = <p className={styles.lead}>{t("call.connecting")}</p>;
  } else if (!validId) {
    body = <State title={t("call.notParticipant")} detail={t("call.notParticipantBody")} />;
  } else if (result === null) {
    body = <p className={styles.lead}>{t("call.connecting")}</p>;
  } else if (result.ok) {
    body = <LessonCall call={result.data} />;
  } else if (result.status === 0) {
    body = (
      <State
        title={t("call.unavailable")}
        detail={t("call.networkError")}
        retry={() => setAttempt((a) => a + 1)}
      />
    );
  } else if (result.status === 403 || result.status === 404) {
    body = <State title={t("call.notParticipant")} detail={t("call.notParticipantBody")} />;
  } else if (result.status === 409) {
    // Two 409s share a code: no room opened yet, or a session already over.
    const ended = /complet|cancel|no.?show|nothing to join/i.test(result.detail);
    body = (
      <State
        title={ended ? t("call.endedSession") : t("call.noRoom")}
        detail={ended ? t("call.endedSessionBody") : t("call.noRoomBody")}
      />
    );
  } else if (result.status === 503) {
    body = <State title={t("call.disabled")} detail={t("call.disabledBody")} />;
  } else {
    body = <State title={t("call.unavailable")} detail={result.detail || t("call.tryAgain")} />;
  }

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <Link href={homeHref} className={styles.back}>
          <ArrowLeft size={15} aria-hidden /> {t("call.backToDashboard")}
        </Link>
        <h1>{t("call.title")}</h1>
      </header>
      <div className={styles.frame}>{body}</div>
    </main>
  );
}

/** A plain, honest full-height message for every non-media outcome. */
function State({ title, detail, retry }: { title: string; detail?: string; retry?: () => void }) {
  const { t } = useLanguage();
  return (
    <div className={styles.state}>
      <p className={styles.stateTitle}>{title}</p>
      {detail && <p className={styles.stateDetail}>{detail}</p>}
      {retry && (
        <button type="button" className={styles.retryBtn} onClick={retry}>
          {t("call.retry")}
        </button>
      )}
    </div>
  );
}
