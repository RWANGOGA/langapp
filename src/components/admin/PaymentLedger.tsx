"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import {
  confirmPayment,
  getLedgerOrder,
  getPaymentLedger,
  PAID_STATUSES,
  type LedgerOrder,
  type LedgerPage,
  type LedgerRow,
  type LedgerStatus,
} from "@/lib/admin-data";
import { formatMinor, utcInstant } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";
import styles from "./payments.module.css";

const STAGES: { key: LedgerStatus | "all"; labelKey: string }[] = [
  { key: "all", labelKey: "admin.pay.stage.all" },
  { key: "pending", labelKey: "admin.pay.stage.pending" },
  { key: "matching_pending", labelKey: "admin.pay.stage.matching_pending" },
  { key: "completed", labelKey: "admin.pay.stage.completed" },
  { key: "refunded", labelKey: "admin.pay.stage.refunded" },
];

const CURRENCIES = ["ALL", "JPY", "VND", "USD"] as const;

const isPaid = (status: LedgerStatus) => PAID_STATUSES.includes(status);

const stamp = (iso: string | null) =>
  iso
    ? new Date(utcInstant(iso)).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : null;

/** An event type the dictionary has not caught up with still reads as words. */
function eventLabel(
  t: (key: string, vars?: Record<string, string | number>) => string,
  type: string,
  amount: string,
): string {
  const key = `admin.pay.event.${type}`;
  const text = t(key, { amount });
  return text === key ? type.replace(/[._]/g, " ") : text;
}

/**
 * The money page. Every row is an order; a row becomes revenue only when an
 * administrator records the payment against the reference it arrived under,
 * because no provider is wired to call us back.
 */
export default function PaymentLedger() {
  const { t } = useLanguage();
  const [stage, setStage] = useState<LedgerStatus | "all">("all");
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [data, setData] = useState<LedgerPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // The search term settles 400ms after typing stops before it hits the API.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(() => {
    getPaymentLedger({
      status: stage === "all" ? undefined : stage,
      currency: currency === "ALL" ? undefined : currency,
      search: debounced || undefined,
      page_size: 50,
    })
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t("admin.pay.ledgerError")));
  }, [stage, currency, debounced, t]);

  useEffect(() => {
    load();
  }, [load]);

  /* — Recording a payment — */
  const [recording, setRecording] = useState<number | null>(null);
  const [form, setForm] = useState({ reference: "", note: "" });
  const [submitting, setSubmitting] = useState(false);

  const record = async (row: LedgerRow) => {
    if (!form.reference.trim()) return;
    setSubmitting(true);
    setError(null);
    setFlash(null);
    try {
      const result = await confirmPayment(row.order_id, {
        reference: form.reference.trim(),
        note: form.note.trim() || undefined,
      });
      setFlash(
        t("admin.pay.recorded", {
          amount: formatMinor(result.amount_minor, result.currency),
          student: row.student_name ?? t("admin.pay.noStudent"),
        }),
      );
      setRecording(null);
      setForm({ reference: "", note: "" });
      load();
    } catch (err) {
      // The server refuses a second confirmation and any unpaid-state mismatch
      // with a real sentence; show it rather than a generic failure.
      setError(err instanceof Error ? err.message : t("admin.pay.recordError"));
    } finally {
      setSubmitting(false);
    }
  };

  /* — Drill-down — */
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<LedgerOrder | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const toggle = async (orderId: number) => {
    if (openId === orderId) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(orderId);
    setDetail(null);
    setDetailError(null);
    try {
      setDetail(await getLedgerOrder(orderId));
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : t("admin.pay.detailError"));
    }
  };

  return (
    <section className={ui.band} aria-labelledby="ledger-h">
      <div className={ui.bandHead}>
        <h2 id="ledger-h" className={ui.bandLabel}>{t("admin.pay.ledgerTitle")}</h2>
        <span className={ui.bandLabel}>
          {data ? t(data.total === 1 ? "admin.pay.countOne" : "admin.pay.countOther", { n: data.total }) : t("admin.pay.loading")}
        </span>
      </div>

      <ul className={ui.stats}>
        <li>
          <span><small>{t("admin.pay.awaitingPayment")}</small><b>{data?.summary.awaiting_payment ?? 0}</b></span>
        </li>
        <li>
          <span><small>{t("admin.pay.awaitingMatch")}</small><b>{data?.summary.awaiting_match ?? 0}</b></span>
        </li>
        <li>
          <span><small>{t("admin.pay.paidOrders")}</small><b>{data?.summary.paid ?? 0}</b></span>
        </li>
      </ul>

      <h3 className={ui.subHead}>{t("admin.pay.collectedTitle")}</h3>
      {data && data.summary.collected.length > 0 ? (
        <dl className={ui.rows}>
          {data.summary.collected.map((total) => (
            <div key={total.currency}>
              <dt>{total.currency}</dt>
              <dd>
                {formatMinor(total.amount_minor, total.currency)}
                <small className={styles.tally}>
                  {" "}
                  {t(total.count === 1 ? "admin.pay.paymentOne" : "admin.pay.paymentOther", { n: total.count })}
                </small>
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className={ui.rowNote}>{t("admin.pay.collectedEmpty")}</p>
      )}

      <div className={styles.tools}>
        <div className={styles.filters} role="group" aria-label={t("admin.pay.stageAria")}>
          {STAGES.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`${styles.filter} ${stage === s.key ? styles.filterOn : ""}`}
              onClick={() => setStage(s.key)}
            >
              {t(s.labelKey)}
            </button>
          ))}
        </div>
        <div className={styles.filters} role="group" aria-label={t("admin.pay.currencyAria")}>
          {CURRENCIES.map((code) => (
            <button
              key={code}
              type="button"
              className={`${styles.filter} ${currency === code ? styles.filterOn : ""}`}
              onClick={() => setCurrency(code)}
            >
              {code === "ALL" ? t("admin.pay.currencyAll") : code}
            </button>
          ))}
        </div>
        <label className={`${ui.search} ${styles.searchBox}`}>
          <Search size={14} aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.pay.searchPlaceholder")}
            aria-label={t("admin.pay.searchAria")}
          />
        </label>
      </div>

      {error && <p role="alert" className={styles.error}>{error}</p>}
      {flash && <p role="status" className={styles.flash}>{flash}</p>}

      {!data && !error ? (
        <p className={ui.lede}>{t("admin.pay.loadingBody")}</p>
      ) : data && data.orders.length === 0 ? (
        <div className={ui.bandStatement}>
          <p className={ui.bandLabel}>{t("admin.pay.emptyTitle")}</p>
          <p>{debounced || stage !== "all" || currency !== "ALL" ? t("admin.pay.noMatch") : t("admin.pay.emptyBody")}</p>
        </div>
      ) : (
        <ul className={styles.ledger} aria-live="polite">
          {data?.orders.map((row) => {
            const paid = isPaid(row.status);
            return (
              <li key={row.order_id}>
                <span className={ui.when}>
                  <b>{formatMinor(row.amount_minor, row.currency)}</b>
                  <em>{stamp(row.created_at)}</em>
                </span>
                <span className={ui.what}>
                  {row.student_name ?? t("admin.pay.noStudent")}
                  <small>
                    {row.package_name} · {row.currency}
                    {row.region ? ` · ${row.region.toUpperCase()}` : ""}
                    {row.payment_method ? ` · ${t(`admin.pay.method.${row.payment_method}`)}` : ""}
                  </small>
                  <small>
                    {paid && row.paid_at
                      ? t("admin.pay.paidOn", { date: stamp(row.paid_at) ?? "" })
                      : t("admin.pay.orderCreated", { id: row.order_id })}
                    {row.reference ? ` · ${t("admin.pay.ref")} ${row.reference}` : ""}
                  </small>
                </span>
                <span className={styles.rowActions}>
                  <button type="button" className={styles.linkButton} onClick={() => toggle(row.order_id)}>
                    {openId === row.order_id ? t("admin.pay.hide") : t("admin.pay.detail")}
                    <ChevronDown size={13} aria-hidden className={openId === row.order_id ? styles.chevronOpen : undefined} />
                  </button>
                  {!paid && row.status !== "refunded" && (
                    <button
                      type="button"
                      className={styles.linkButton}
                      onClick={() => {
                        setRecording(recording === row.order_id ? null : row.order_id);
                        setForm({ reference: "", note: "" });
                      }}
                    >
                      {t("admin.pay.record")}
                    </button>
                  )}
                </span>
                <span className={`${ui.statusPill} ${paid ? ui.statusOk : row.status === "refunded" || row.status === "failed" ? ui.statusBad : ""}`}>
                  {t(`admin.pay.stage.${row.status}`)}
                </span>

                {recording === row.order_id && (
                  <form
                    className={styles.recordForm}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void record(row);
                    }}
                  >
                    <label>
                      {t("admin.pay.reference")}
                      <input
                        className={ui.input}
                        required
                        minLength={2}
                        maxLength={100}
                        placeholder={t("admin.pay.referencePlaceholder")}
                        value={form.reference}
                        onChange={(e) => setForm({ ...form, reference: e.target.value })}
                      />
                    </label>
                    <label>
                      {t("admin.pay.note")}
                      <input
                        className={ui.input}
                        maxLength={500}
                        placeholder={t("admin.pay.notePlaceholder")}
                        value={form.note}
                        onChange={(e) => setForm({ ...form, note: e.target.value })}
                      />
                    </label>
                    <div className={styles.recordAction}>
                      <button type="submit" className={ui.btnCoral} disabled={submitting}>
                        {submitting ? t("admin.pay.recording") : t("admin.pay.recordConfirm")}
                      </button>
                    </div>
                  </form>
                )}

                {openId === row.order_id && (
                  <div className={styles.detail}>
                    {detailError && <p role="alert" className={styles.error}>{detailError}</p>}
                    {!detail && !detailError && <p className={ui.lede}>{t("admin.pay.loadingDetail")}</p>}
                    {detail && (
                      <>
                        <dl className={ui.rows}>
                          <div>
                            <dt>{t("admin.pay.student")}</dt>
                            <dd>{detail.student_name ?? t("admin.pay.noStudent")}</dd>
                          </div>
                          <div>
                            <dt>{t("admin.pay.studentEmail")}</dt>
                            <dd>{detail.student_email ?? "—"}</dd>
                          </div>
                          <div>
                            <dt>{t("admin.pay.tutor")}</dt>
                            <dd>{detail.tutor_name ?? t("admin.pay.noTutor")}</dd>
                          </div>
                          <div>
                            <dt>{t("admin.pay.term")}</dt>
                            <dd>
                              {detail.subject ?? "—"}
                              {detail.duration_minutes ? ` · ${t("admin.pay.minutes", { n: detail.duration_minutes })}` : ""}
                              {` · ${t(detail.package_months === 1 ? "admin.pay.monthOne" : "admin.pay.monthOther", { n: detail.package_months })}`}
                            </dd>
                          </div>
                        </dl>

                        <h4 className={ui.subHead}>{t("admin.pay.eventsTitle")}</h4>
                        {detail.events.length === 0 ? (
                          <p className={ui.rowNote}>{t("admin.pay.eventsEmpty")}</p>
                        ) : (
                          <ul className={styles.events}>
                            {detail.events.map((event) => (
                              <li key={event.id}>
                                <span className={styles.eventWhen}>{stamp(event.created_at)}</span>
                                <span>
                                  {eventLabel(
                                    t,
                                    event.event_type,
                                    event.amount_minor != null && event.currency
                                      ? formatMinor(event.amount_minor, event.currency)
                                      : "—",
                                  )}
                                  {event.reference && <small className={styles.tally}>{t("admin.pay.ref")} {event.reference}</small>}
                                  {event.note && <small className={styles.tally}>{event.note}</small>}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}

                        <h4 className={ui.subHead}>{t("admin.pay.subscriptionTitle")}</h4>
                        {detail.subscription ? (
                          <dl className={ui.rows}>
                            <div>
                              <dt>{t("admin.pay.tier")}</dt>
                              <dd>{detail.subscription.tier}</dd>
                            </div>
                            <div>
                              <dt>{t("admin.pay.subStatus")}</dt>
                              <dd>{t(`admin.pay.substatus.${detail.subscription.status}`)}</dd>
                            </div>
                            <div>
                              <dt>{t("admin.pay.subUntil")}</dt>
                              <dd>{stamp(detail.subscription.current_period_end) ?? "—"}</dd>
                            </div>
                          </dl>
                        ) : (
                          <p className={ui.rowNote}>{t("admin.pay.noSubscription")}</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
