import type { SectionEntry } from '../api/cases';

export function sortCorrespondence(
  entries: SectionEntry[] | null | undefined,
): SectionEntry[] {
  if (!entries) return [];
  const sorted = [...entries];
  sorted.sort((a, b) => {
    const dateA = a.date;
    const dateB = b.date;
    if (typeof dateA === 'string' && typeof dateB === 'string') {
      return dateB.localeCompare(dateA);
    }
    if (typeof dateA === 'string') return -1;
    if (typeof dateB === 'string') return 1;
    return 0;
  });
  return sorted;
}
