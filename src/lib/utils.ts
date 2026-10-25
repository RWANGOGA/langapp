import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Render an amount in a specific ISO currency, the way that currency is
 * actually written - symbol placement, grouping and decimals are the
 * locale's, not ours. Prices here are whole units, so no cents are shown.
 */
const CURRENCY_LOCALE: Record<string, string> = { JPY: "ja-JP", VND: "vi-VN", USD: "en-US" };
export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE[currency] ?? "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * The API stores naive UTC instants, so "2026-10-01T09:00:00" is 09:00 UTC.
 * Parsed as written, a browser in another zone reads it as *local* time and
 * every derived label lands hours out by the reader's offset - which is
 * precisely the mistake a global audience would notice first.
 */
export function utcInstant(iso: string): number {
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/.test(iso);
  // A bare date ("2026-09-30") is already UTC midnight per ISO 8601; only
  // date-times need the offset made explicit.
  const normalised = iso.includes("T") && !hasOffset ? `${iso}Z` : iso;
  return new Date(normalised).getTime();
}

/**
 * How long ago an explicit UTC instant happened, in the reader's own clock.
 * Admin logs and payment feeds store the real instant, so the label has to be
 * derived from it rather than written into the record.
 */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "time not recorded";
  const then = utcInstant(iso);
  if (Number.isNaN(then)) return "time not recorded";
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(then).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}