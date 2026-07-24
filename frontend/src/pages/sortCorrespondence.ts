import type { SectionEntry } from '../api/cases';

/**
 * Sorts manager correspondence log entries NEWEST-FIRST by date (backlog AI-026), for display
 * on the MANAGER_SELECTION stage card. Entries without a `date` field sort to the end, and the
 * input is never mutated — only a new array is returned.
 */
export function sortCorrespondence(
  entries: SectionEntry[] | null | undefined,
): SectionEntry[] {
  if (!entries) return [];
  const sorted = [...entries];
  sorted.sort((a, b) => {
    const dateA = a.date;
    const dateB = b.date;
    // Both dates present: sort descending (newest first) by plain ISO string comparison.
    if (typeof dateA === 'string' && typeof dateB === 'string') {
      return dateB.localeCompare(dateA);
    }
    // One missing: put the one with a date first, missing ones at the end.
    if (typeof dateA === 'string') return -1;
    if (typeof dateB === 'string') return 1;
    // Both missing: preserve original order.
    return 0;
  });
  return sorted;
}
