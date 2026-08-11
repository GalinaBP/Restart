import type { SectionEntry } from '../api/cases';

export type FlaggedClaim = SectionEntry & { late: boolean; disputed: boolean };

export function flagClaims(
  entries: SectionEntry[] | null | undefined,
  deadlineIso: string | null | undefined,
): FlaggedClaim[] {
  if (!entries) return [];
  return entries.map((entry) => {
    const filedOn = entry.filedOn;
    const late = typeof filedOn === 'string' && typeof deadlineIso === 'string'
      && filedOn > deadlineIso;
    return { ...entry, late, disputed: entry.disputed === true };
  });
}
