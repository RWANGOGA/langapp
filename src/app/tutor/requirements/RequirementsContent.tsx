"use client";

import Link from "next/link";
import { AlertTriangle, Check } from "lucide-react";
import ui from "@/components/portal/bands.module.css";
import { useLanguage } from "@/i18n/LanguageProvider";
import { statementFor } from "@/lib/application-statement";
import type { ApplicantState, ApplicationStatusView } from "@/lib/application-status";
import type { TutorRequirements } from "@/lib/tutor-requirements";
import { utcInstant } from "@/lib/utils";

const LOCALE_TAG: Record<string, string> = {
  en: "en-US",
  zh: "zh-CN",
  ja: "ja-JP",
  es: "es-ES",
  fr: "fr-FR",
  ar: "ar",
};

const RAIL_KEY: Record<ApplicationStatusView["stages"][number]["state"], string> = {
  complete: "req.rail.done",
  current: "req.rail.now",
  upcoming: "req.rail.notStarted",
};

function StatusBand({ view }: { view: ApplicationStatusView }) {
  const { t, locale } = useLanguage();
  const dateFmt = new Intl.DateTimeFormat(LOCALE_TAG[locale] ?? "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const statement = statementFor(view);
  const updated = view.last_update ? dateFmt.format(new Date(utcInstant(view.last_update))) : null;
  const body = statement.bodyRaw || (statement.bodyKey ? t(statement.bodyKey) : "");

  return (
    <section className={ui.band} aria-labelledby="status-heading">
      <div className={ui.bandHead}>
        <span className={ui.bandLabel}>{t(statement.kickerKey)}</span>
        {updated && <span className={ui.bandLabel}>{t("req.fileUpdated", { date: updated })}</span>}
      </div>
      <h2 id="status-heading" className={ui.bandTitle}>
        {t(statement.headlineKey)}
      </h2>
      <p className={ui.bandEmpty}>{body}</p>
      {statement.action && (
        <p className={ui.joinRow}>
          <Link href={statement.action.href} className={ui.btnCoral}>
            {t(statement.action.labelKey)}
          </Link>
        </p>
      )}

      {view.stages.length > 0 && (
        <>
          <span className={ui.subHead} id="rail-heading">
            {t("req.whereStand")}
          </span>
          <ol className={ui.rail} aria-labelledby="rail-heading">
            {view.stages.map((stage) => (
              <li
                key={stage.key}
                className={
                  stage.state === "complete"
                    ? ui.railComplete
                    : stage.state === "current"
                      ? ui.railCurrent
                      : undefined
                }
              >
                <span className={ui.railMark} aria-hidden />
                <div>
                  <p className={ui.railTitle}>{stage.title}</p>
                  <p className={ui.railDesc}>{stage.description}</p>
                </div>
                <span className={ui.railWhen}>
                  {stage.state === "upcoming" ? stage.indicative_days : t(RAIL_KEY[stage.state])}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}

      {view.has_application && (
        <>
          <span className={ui.subHead} id="checks-heading">
            {t("req.evidence")}
          </span>
          <dl className={ui.rows} aria-labelledby="checks-heading">
            {view.checks.map((check) => (
              <div key={check.id}>
                <dt>{check.label}</dt>
                <dd>
                  <span
                    className={`${ui.statusPill} ${
                      check.state === "verified"
                        ? ui.statusOk
                        : check.state === "failed"
                          ? ui.statusBad
                          : ""
                    }`}
                  >
                    {t(`req.check.${check.state}`)}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}

export default function RequirementsContent({
  requirements,
  state,
}: {
  requirements: TutorRequirements | null;
  state: ApplicantState;
}) {
  const { t } = useLanguage();

  if (!requirements) {
    return (
      <section className={ui.band}>
        <span className={ui.bandLabel}>{t("req.unavailable.label")}</span>
        <h1 className={ui.bandTitle}>{t("req.unavailable.title")}</h1>
        <p className={ui.bandEmpty}>{t("req.unavailable.body")}</p>
      </section>
    );
  }

  const view = state.kind === "ok" ? state.view : null;
  // The rail and the published list describe the same process; showing both
  // would let one screen state it twice.
  const railShown = Boolean(view && view.stages.length > 0);

  return (
    <>
      <div className={ui.pageHeading}>
        <div>
          <span className={ui.kicker}>{t("req.kicker")}</span>
          <h1>{t("req.title")}</h1>
          <p>{view ? t("req.ledeApplied") : t("req.ledeNew")}</p>
        </div>
      </div>

      {state.kind === "unavailable" && (
        <section className={ui.band}>
          <span className={ui.bandLabel}>{t("req.notLoaded.label")}</span>
          <h2 className={ui.bandTitle}>{t("req.notLoaded.title")}</h2>
          <p className={ui.bandEmpty}>{t("req.notLoaded.body")}</p>
          <p className={ui.joinRow}>
            <Link href="/auth/login?callbackUrl=%2Ftutor%2Frequirements" className={ui.btn}>
              {t("req.signInAgain")}
            </Link>
          </p>
        </section>
      )}

      {view && <StatusBand view={view} />}

      <section className={ui.bandStatement} role="note">
        <span className={ui.bandLabel}>{t("req.before.label")}</span>
        <h2 className={ui.bandTitle}>{t("req.before.title")}</h2>
        <p>{requirements.disclaimer}</p>
      </section>

      <section className={ui.band} aria-labelledby="eligibility-heading">
        <div className={ui.bandHead}>
          <h2 id="eligibility-heading" className={ui.bandTitle}>
            {t("req.eligibility.title")}
          </h2>
          <span className={ui.bandLabel}>{t("req.eligibility.note")}</span>
        </div>
        <ul className={ui.ticks}>
          {requirements.eligibility.map((item) => (
            <li key={item}>
              <Check size={16} strokeWidth={2.4} aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={ui.band} aria-labelledby="documents-heading">
        <div className={ui.bandHead}>
          <h2 id="documents-heading" className={ui.bandTitle}>
            {t("req.documents.title")}
          </h2>
          <span className={ui.bandLabel}>{t("req.documents.count", { count: requirements.documents.length })}</span>
        </div>
        <dl className={ui.rows}>
          {requirements.documents.map((doc) => (
            <div key={doc.id}>
              <dt>{doc.title}</dt>
              <dd>
                {doc.description}
                <span className={ui.rowNoteUnder}>
                  {doc.required ? t("req.documents.required") : t("req.documents.optional")}
                  {doc.accepted_formats.length > 0 && ` · ${doc.accepted_formats.join(", ")}`}
                  {doc.max_size_mb ? ` · ${t("req.documents.maxSize", { size: doc.max_size_mb })}` : ""}
                  {doc.examples.length > 0 && ` · ${t("req.documents.examples", { list: doc.examples.join(", ") })}`}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {!railShown && (
        <section className={ui.band} aria-labelledby="review-heading">
          <div className={ui.bandHead}>
            <h2 id="review-heading" className={ui.bandTitle}>
              {t("req.review.title")}
            </h2>
            <span className={ui.bandLabel}>{t("req.review.note")}</span>
          </div>
          <ol className={ui.rail}>
            {requirements.review_stages.map((stage) => (
              <li key={stage.key}>
                <span className={ui.railMark} aria-hidden />
                <div>
                  <p className={ui.railTitle}>{stage.title}</p>
                  <p className={ui.railDesc}>{stage.description}</p>
                </div>
                <span className={ui.railWhen}>{stage.indicative_days}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className={ui.band} aria-labelledby="policies-heading">
        <div className={ui.bandHead}>
          <h2 id="policies-heading" className={ui.bandTitle}>
            {t("req.policies.title")}
          </h2>
          <span className={ui.bandLabel}>{t("req.policies.note")}</span>
        </div>
        <dl className={ui.rows}>
          {requirements.policies.map((policy) => (
            <div key={policy.id}>
              <dt>{policy.title}</dt>
              <dd>
                <span className={ui.rowNote}>{policy.summary}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {!view && (
        <section className={ui.bandStatement} aria-labelledby="start-heading">
          <span className={ui.bandLabel}>
            <AlertTriangle size={14} aria-hidden /> {t("req.ready.label")}
          </span>
          <h2 id="start-heading" className={ui.bandTitle}>
            {t("req.ready.title", { count: requirements.total_steps })}
          </h2>
          <p>{t("req.ready.body")}</p>
          <p className={ui.joinRow}>
            <Link href="/auth/register?intent=tutor" className={ui.btnCoral}>
              {t("req.start")}
            </Link>
            <Link href="/tutors" className={ui.btn}>
              {t("req.browse")}
            </Link>
          </p>
        </section>
      )}

      <p className={ui.bandLabel}>{t("req.version", { version: requirements.version })}</p>
    </>
  );
}
