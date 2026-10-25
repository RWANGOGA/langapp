import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * How long ago an explicit UTC instant happened, in the reader's own clock.
 * Admin logs and payment feeds store the real instant, so the label has to be
 * derived from it rather than written into the record.
 */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "time not recorded";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "time not recorded";
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}