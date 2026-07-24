import type { SectionEntry } from '../api/cases';

/**
 * The nearest hearing that hasn't happened yet (backlog AI-023), for the prominent line on the
 * COURT_DECISION stage card — a months-long court process must not let an upcoming date get lost
 * among past ones.
 */
export interface UpcomingHearing {
  date: string;
  subject: string;
}

/**
 * Picks the entry with the smallest `date` that is on or after `today`. Both are plain ISO
 * 'YYYY-MM-DD' strings, which sort correctly with ordinary `<`/`>=` comparison — so there is no
 * need to parse them into `Date` objects, which would drag in timezone traps (`new Date(date) <
 * new Date()` shifts by the local offset and can misjudge "today") for no benefit. Pure and
 * independent of the system clock: the caller passes `today`, so tests never have to mock time.
 *
 * Returns null when there are no entries, no dates on file, or every hearing is already past.
 */
export function nextUpcomingHearing(
  entries: SectionEntry[] | null | undefined,
  today: string,
): UpcomingHearing | null {
  if (!entries) return null;
  let best: UpcomingHearing | null = null;
  for (const entry of entries) {
    const date = entry.date;
    if (typeof date !== 'string' || date < today) continue;
    if (!best || date < best.date) {
      best = { date, subject: typeof entry.subject === 'string' ? entry.subject : '' };
    }
  }
  return best;
}
