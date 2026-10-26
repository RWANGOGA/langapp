"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Inbox, Mail, RefreshCw } from "lucide-react";
import {
  getContactInbox,
  reopenMessage,
  replyToMessage,
  type ContactThread,
} from "@/lib/admin-data";
import { relativeTime } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";
import styles from "./applications.module.css";

// Mirrors backend/app/schemas/contact.py. The button unlocks early so the
// writer is not told about a minimum after typing a whole answer.
const MIN_REPLY = 20;

// How many threads one request carries. Growing the window on request is enough
// for a queue you read newest-first, and it keeps a reply or a reopen from
// having to work out where its row now sits.
const PAGE = 50;

type Filter = "open" | "answered" | "all";

function ThreadItem({
  thread,
  expanded,
  onToggle,
  onChanged,
}: {
  thread: ContactThread;
  expanded: boolean;
  onToggle: () => void;
  onChanged: (updated: ContactThread) => void;
}) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState(thread.reply ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const trimmed = draft.trim();
  const unchanged = trimmed === (thread.reply ?? "").trim();

  async function send() {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const updated = await replyToMessage(thread.id, trimmed);
      onChanged(updated);
      setFlash(thread.reply ? t("admin.messages.revised") : t("admin.messages.saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.messages.refused"));
    } finally {
      setBusy(false);
    }
  }

  async function reopen() {
    setBusy(true);
    setError(null);
    try {
      onChanged(await reopenMessage(thread.id));
      setFlash(t("admin.messages.reopened"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.messages.refused"));
    } finally {
      setBusy(false);
    }
  }

  // Nothing leaves this page by itself. The mailbox handoff carries the answer
  // and the original question, so the person sending it is not hunting for the
  // thread in another tab.
  const mailBody = [
    trimmed || t("admin.messages.mail.empty"),
    "",
    "—",
    "",
    t("admin.messages.mail.original", {
      name: thread.name,
      time: relativeTime(thread.created_at),
    }),
    thread.message,
  ].join("\n");
  const mailto = `mailto:${thread.email}?subject=${encodeURIComponent(
    t("admin.messages.mail.subject"),
  )}&body=${encodeURIComponent(mailBody)}`;

  // Naming who answered is the whole point of storing it. Without a timestamp
  // the sentence still stands, so the two are separate strings rather than one
  // with a hole in it.
  const signedBy = thread.replied_by_name ?? t("admin.messages.someone");
  const signature = thread.replied_at
    ? t("admin.messages.signedByWhen", { name: signedBy, when: relativeTime(thread.replied_at) })
    : t("admin.messages.signedBy", { name: signedBy });

  return (
    <div className={styles.item}>
      <button type="button" className={styles.head} onClick={onToggle} aria-expanded={expanded}>
        <span>
          <span className={styles.name}>{thread.name}</span>
          <span className={styles.meta}>
            {thread.email} · {t(`admin.messages.topic.${thread.topic}`)} ·{" "}
            {relativeTime(thread.created_at)}
          </span>
        </span>
        <span className={styles.pill}>
          <span className={thread.is_handled ? `${ui.statusPill} ${ui.statusOk}` : ui.statusPill}>
            {thread.is_handled ? t("admin.messages.answered") : t("admin.messages.waiting")}
          </span>
        </span>
        <ChevronDown size={18} className={`${styles.chevron} ${expanded ? styles.chevronOpen : ""}`} aria-hidden />
      </button>

      {expanded && (
        <div className={styles.detail}>
          <p className={ui.lede}>{thread.message}</p>

          {thread.reply && (
            <div className={styles.note} style={{ marginTop: "1.2rem" }}>
              <p className={styles.noteLabel}>{signature}</p>
              <p style={{ whiteSpace: "pre-wrap" }}>{thread.reply}</p>
            </div>
          )}

          <div className={styles.note} style={{ marginTop: "1.2rem" }}>
            <label className={styles.noteLabel} htmlFor={`reply-${thread.id}`}>
              {thread.reply ? t("admin.messages.reviseLabel") : t("admin.messages.replyLabel")}
            </label>
            <textarea
              id={`reply-${thread.id}`}
              className={ui.textarea}
              rows={4}
              value={draft}
              placeholder={t("admin.messages.replyPlaceholder")}
              onChange={(e) => setDraft(e.target.value)}
            />
            <p className={styles.meta} style={{ marginTop: "0.35rem" }}>
              {draft.length} / 4000
              {trimmed.length > 0 && trimmed.length < MIN_REPLY ? ` · ${t("admin.messages.tooShort")}` : ""}
            </p>
            <p className={styles.meta} style={{ marginTop: "0.5rem", maxWidth: "62ch" }}>
              {t("admin.messages.delivery")}
            </p>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={ui.btnCoral}
              disabled={busy || trimmed.length < MIN_REPLY || unchanged}
              onClick={send}
            >
              {thread.reply ? t("admin.messages.saveReply") : t("admin.messages.sendReply")}
            </button>
            <a className={ui.btn} href={mailto}>
              <Mail size={14} aria-hidden /> {t("admin.messages.mailto")}
            </a>
            {thread.is_handled && (
              <button type="button" className={ui.btn} disabled={busy} onClick={reopen}>
                {t("admin.messages.reopen")}
              </button>
            )}
          </div>

          {flash && (
            <p role="status" className={ui.statusOk} style={{ marginTop: "0.9rem" }}>
              {flash}
            </p>
          )}
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ContactInbox() {
  const { t } = useLanguage();
  const [threads, setThreads] = useState<ContactThread[]>([]);
  const [counts, setCounts] = useState({ open: 0, answered: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("open");
  const [shown, setShown] = useState(PAGE);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  // Bumped by the refresh link. The fetch itself belongs to the effect below, so
  // a click only ever says "want a newer copy".
  const [wanted, setWanted] = useState(0);

  function load() {
    setLoading(true);
    setShown(PAGE);
    setWanted((n) => n + 1);
  }

  // One round trip per filter or refresh, and every state change happens in the
  // promise it resolves — the effect only talks to the server, so switching
  // locale or unmounting cannot leave a stale write behind.
  useEffect(() => {
    let alive = true;
    getContactInbox({ state: filter, limit: shown })
      .then((page) => {
        if (!alive) return;
        setThreads(page.messages);
        setCounts({ open: page.open, answered: page.answered });
        setTotal(page.total);
        setError(null);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : t("admin.messages.loadError"));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [filter, shown, wanted, t]);

  function onChanged(updated: ContactThread) {
    setThreads((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
    // The queue counts cover every thread, so an answer moves a row between two
    // numbers that the list itself cannot recompute.
    setCounts((prev) =>
      updated.is_handled
        ? { open: Math.max(prev.open - 1, 0), answered: prev.answered + 1 }
        : { open: prev.open + 1, answered: Math.max(prev.answered - 1, 0) },
    );
  }

  const chips: { key: Filter; label: string; count: number }[] = [
    { key: "open", label: t("admin.messages.waiting"), count: counts.open },
    { key: "answered", label: t("admin.messages.answered"), count: counts.answered },
    { key: "all", label: t("admin.messages.all"), count: counts.open + counts.answered },
  ];

  return (
    <section className={ui.band} aria-labelledby="inbox-h">
      <div className={ui.bandHead}>
        <h2 id="inbox-h" className={ui.bandLabel}>{t("admin.messages.title")}</h2>
        <button type="button" className={ui.textLink} onClick={load} disabled={loading}>
          <RefreshCw size={13} aria-hidden /> {loading ? t("admin.messages.reloading") : t("admin.messages.refresh")}
        </button>
      </div>

      <div className={styles.filters}>
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            className={`${styles.filter} ${filter === chip.key ? styles.filterOn : ""}`}
            onClick={() => {
              setFilter(chip.key);
              setShown(PAGE);
              setLoading(true);
            }}
          >
            {chip.label}
            <span className={styles.filterCount}>{chip.count}</span>
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className={ui.statusBad}>{error}</p>
      ) : loading ? (
        <p className={ui.lede}>{t("admin.messages.loading")}</p>
      ) : threads.length === 0 ? (
        <div className={ui.bandStatement}>
          <Inbox size={22} aria-hidden />
          <p className={ui.bandLabel}>{t(`admin.messages.empty.${filter}.title`)}</p>
          <p>{t(`admin.messages.empty.${filter}.body`)}</p>
        </div>
      ) : (
        <div>
          {threads.map((thread) => (
            <ThreadItem
              key={thread.id}
              thread={thread}
              expanded={expandedId === thread.id}
              onToggle={() => setExpandedId((id) => (id === thread.id ? null : thread.id))}
              onChanged={onChanged}
            />
          ))}
          {threads.length < total && (
            <div className={styles.actions}>
              <p className={styles.meta}>{t("admin.messages.showing", { shown: threads.length, total })}</p>
              <button
                type="button"
                className={ui.btn}
                onClick={() => setShown((n) => n + PAGE)}
                disabled={loading}
              >
                {t("admin.messages.loadMore")}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
