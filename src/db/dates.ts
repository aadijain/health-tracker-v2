/**
 * Calendar-date helpers working on `YYYY-MM-DD` strings.
 *
 * Date arithmetic is done in UTC day-numbers so it is immune to DST, while
 * `todayStr` reflects the user's local calendar day. A week is Monday-Sunday,
 * matching the Trends and Activity screens.
 */

const MS_PER_DAY = 86_400_000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Today's local calendar date as `YYYY-MM-DD`. */
export function todayStr(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** A `YYYY-MM-DD` string as a whole-day number (days since the epoch, UTC). */
export function dayNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

function fromDayNumber(n: number): string {
  const dt = new Date(n * MS_PER_DAY);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Day of week, Monday = 0 ... Sunday = 6. */
export function weekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function addDays(date: string, days: number): string {
  return fromDayNumber(dayNumber(date) + days);
}

/** Whole days from `start` to `end` (negative if end precedes start). */
export function daysBetween(start: string, end: string): number {
  return dayNumber(end) - dayNumber(start);
}

/** Every date from `start` to `end`, inclusive. */
export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  for (let n = dayNumber(start); n <= dayNumber(end); n++) {
    out.push(fromDayNumber(n));
  }
  return out;
}

/** Monday-Sunday range for the week containing `anchor`. */
export function weekRange(anchor: string): [string, string] {
  const monday = addDays(anchor, -weekday(anchor));
  return [monday, addDays(monday, 6)];
}

/** First-last day range for the calendar month containing `anchor`. */
export function monthRange(anchor: string): [string, string] {
  const [y, m] = anchor.split("-").map(Number);
  const first = `${y}-${pad(m)}-01`;
  const nextYear = m === 12 ? y + 1 : y;
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextFirst = `${nextYear}-${pad(nextMonth)}-01`;
  return [first, addDays(nextFirst, -1)];
}

export type Period = "week" | "month";

export function periodRange(period: Period, anchor: string): [string, string] {
  return period === "month" ? monthRange(anchor) : weekRange(anchor);
}
