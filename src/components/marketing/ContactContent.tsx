"use client";

import { useState } from "react";
import Link from "next/link";
import { Hero, PageShell, Section } from "@/components/marketing/Sections";
import { apiSendClient } from "@/lib/api-client";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "./marketing.module.css";

const TOPICS = ["lessons", "pricing", "teaching", "account", "other"] as const;
type Topic = (typeof TOPICS)[number];

// Mirrors the backend's own floor so a too-short message is refused in the
// form, before it becomes a 422 the visitor has to decode.
const MIN_MESSAGE = 20;

export default function ContactContent() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<Topic>("lessons");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (message.trim().length < MIN_MESSAGE) {
      setError(t("contact.messageTooShort"));
      return;
    }
    setIsSending(true);
    try {
      await apiSendClient("POST", "/contact", { name, email, topic, message });
      setSent(true);
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setError(t("contact.error"));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <PageShell>
      <Hero kicker={t("contact.kicker")} title={t("contact.title")} lede={t("contact.lede")} />

      <Section bare>
        <div className={styles.contactGrid}>
          {sent ? (
            <div>
              <p className={`${styles.status} ${styles.statusOk}`}>
                <strong>{t("contact.success.title")}</strong> {t("contact.success.body")}
              </p>
              <p className={styles.asideBody}>
                <Link className={styles.asideLink} href="/">
                  {t("contact.backHome")}
                </Link>
              </p>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="contact-name">
                  {t("contact.name")}
                </label>
                <input
                  id="contact-name"
                  className={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("contact.namePlaceholder")}
                  autoComplete="name"
                  minLength={2}
                  maxLength={120}
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="contact-email">
                  {t("contact.email")}
                </label>
                <input
                  id="contact-email"
                  className={styles.input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("contact.emailPlaceholder")}
                  autoComplete="email"
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="contact-topic">
                  {t("contact.topic")}
                </label>
                <select
                  id="contact-topic"
                  className={styles.select}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value as Topic)}
                >
                  {TOPICS.map((value) => (
                    <option key={value} value={value}>
                      {t(`contact.topic.${value}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="contact-message">
                  {t("contact.message")}
                </label>
                <textarea
                  id="contact-message"
                  className={styles.textarea}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("contact.messagePlaceholder")}
                  maxLength={4000}
                  required
                />
              </div>

              {error && <p className={`${styles.status}`}>{error}</p>}

              <button className={styles.submit} type="submit" disabled={isSending}>
                {isSending ? t("contact.submitting") : t("contact.submit")}
              </button>
            </form>
          )}

          <aside className={styles.aside}>
            <p className={styles.asideLabel}>{t("contact.aside.kicker")}</p>
            <div>
              <h2 className={styles.asideTitle}>{t("contact.aside.studentTitle")}</h2>
              <p className={styles.asideBody}>{t("contact.aside.studentBody")}</p>
            </div>
            <div>
              <h2 className={styles.asideTitle}>{t("contact.aside.replyTitle")}</h2>
              <p className={styles.asideBody}>{t("contact.aside.replyBody")}</p>
            </div>
          </aside>
        </div>
      </Section>
    </PageShell>
  );
}
