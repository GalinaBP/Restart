import type { SectionEntry } from '../local/case';

export interface UpcomingHearing {
  date: string;
  subject: string;
}

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
