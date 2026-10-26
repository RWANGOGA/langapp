// The zones the school actually serves, grouped the way people say where they
// live rather than the way the IANA database is sorted. An identifier like
// "Asia/Dubai" is data and is never translated; only the group headings are,
// and only the region a person recognises is what the label has to get right.
import { useSyncExternalStore } from "react";

export type ZoneGroup = { key: string; zones: string[] };

export const ZONE_GROUPS: ZoneGroup[] = [
  {
    key: "auth.tz.group.middleEast",
    zones: [
      "Asia/Dubai", "Asia/Riyadh", "Asia/Tehran", "Asia/Baghdad", "Asia/Beirut",
      "Asia/Amman", "Asia/Qatar", "Asia/Muscat", "Asia/Jerusalem", "Europe/Istanbul",
    ],
  },
  {
    // The region the school loses most sleep over: lessons have to land in an
    // evening that exists on both sides of the match.
    key: "auth.tz.group.eastAfrica",
    zones: [
      "Africa/Nairobi", "Africa/Addis_Ababa", "Africa/Dar_es_Salaam",
      "Africa/Kampala", "Africa/Djibouti", "Africa/Mogadishu", "Africa/Kigali",
    ],
  },
  {
    key: "auth.tz.group.africa",
    zones: [
      "Africa/Lagos", "Africa/Accra", "Africa/Dakar", "Africa/Abidjan",
      "Africa/Casablanca", "Africa/Algiers", "Africa/Tunis", "Africa/Cairo",
      "Africa/Khartoum", "Africa/Johannesburg", "Africa/Lusaka", "Africa/Harare",
    ],
  },
  {
    key: "auth.tz.group.asia",
    zones: [
      "Asia/Karachi", "Asia/Kolkata", "Asia/Dhaka", "Asia/Kathmandu",
      "Asia/Colombo", "Asia/Yangon", "Asia/Bangkok", "Asia/Jakarta",
      "Asia/Kuala_Lumpur", "Asia/Singapore", "Asia/Manila", "Asia/Ho_Chi_Minh",
      "Asia/Shanghai", "Asia/Hong_Kong", "Asia/Taipei", "Asia/Seoul", "Asia/Tokyo",
    ],
  },
  {
    key: "auth.tz.group.europe",
    zones: [
      "Europe/London", "Europe/Dublin", "Europe/Lisbon", "Europe/Paris",
      "Europe/Madrid", "Europe/Berlin", "Europe/Rome", "Europe/Amsterdam",
      "Europe/Brussels", "Europe/Vienna", "Europe/Stockholm", "Europe/Warsaw",
      "Europe/Athens", "Europe/Moscow",
    ],
  },
  {
    key: "auth.tz.group.americas",
    zones: [
      "America/New_York", "America/Toronto", "America/Chicago", "America/Denver",
      "America/Los_Angeles", "America/Mexico_City", "America/Bogota",
      "America/Lima", "America/Santiago", "America/Sao_Paulo",
      "America/Argentina/Buenos_Aires",
    ],
  },
  {
    key: "auth.tz.group.oceania",
    zones: ["Australia/Perth", "Australia/Sydney", "Australia/Melbourne", "Pacific/Auckland"],
  },
  {
    // For anyone whose clock genuinely is the reference, and for the sessions
    // the school runs across several countries at once.
    key: "auth.tz.group.other",
    zones: ["UTC"],
  },
];

/** Every curated identifier, flattened. */
export const ALL_ZONES: string[] = ZONE_GROUPS.flatMap((group) => group.zones);

/**
 * The browser's own zone, or "" where there is no browser to ask.
 *
 * Nothing is guessed from an IP address: a wrong zone silently moves a lesson
 * by hours, while a wrong city is one click to fix.
 */
export function detectedZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

/** "UTC+4", "UTC+5:30", "UTC-3", "UTC+0" — the offset on the day asked about. */
export function zoneOffsetLabel(zone: string, at: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(at);
    const p = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    // Some engines hand back "24" for midnight; %24 puts it back on the hour.
    const shifted = Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour) % 24,
      Number(p.minute),
      Number(p.second),
    );
    const minutes = Math.round((shifted - at.getTime()) / 60000);
    const sign = minutes < 0 ? "-" : "+";
    const abs = Math.abs(minutes);
    const hours = Math.floor(abs / 60);
    const rest = abs % 60;
    return `UTC${sign}${hours}${rest ? `:${String(rest).padStart(2, "0")}` : ""}`;
  } catch {
    // A zone this browser cannot resolve is listed without a hint rather than
    // breaking the field around it.
    return "";
  }
}

/**
 * The browser's own zone as a hook: "" during the server render and the
 * hydration pass, the real zone as soon as the page is live.
 *
 * This is what useSyncExternalStore is for - a value that lives outside React
 * and differs between the server and the browser. Doing it with an effect
 * instead would mean a second render for every form that asks, and the field
 * would visibly change under the person filling it in.
 */
export function useBrowserZone(): string {
  return useSyncExternalStore(noChange, detectedZone, () => "");
}

/** A mounted page's zone does not change underneath it: there is nothing to
 *  subscribe to, and nothing to undo. */
function noChange(): () => void {
  return () => {};
}

/**
 * The groups as one <select> should show them: `pinned` first, in its own
 * heading, and never twice.
 *
 * `pinned` is whatever the field currently means - the browser's zone on the
 * sign-up form, the zone already saved on an account in settings. Anything not
 * on the curated list still belongs at the top, because a select that cannot
 * show its own value silently rewrites it to the first option the moment
 * anything else is saved.
 */
export function zoneGroups(pinned: string = "", pinnedKey = "auth.tz.group.detected"): ZoneGroup[] {
  if (!pinned) return ZONE_GROUPS;
  const groups = ALL_ZONES.includes(pinned)
    ? ZONE_GROUPS.map((group) => ({ ...group, zones: group.zones.filter((zone) => zone !== pinned) }))
    : ZONE_GROUPS;
  return [{ key: pinnedKey, zones: [pinned] }, ...groups].filter(
    (group) => group.zones.length > 0,
  );
}
