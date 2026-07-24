import type { SectionEntry } from '../api/cases';

/**
 * A filed claim annotated with the two attention flags the CREDITOR_CLAIMS card surfaces
 * (backlog AI-025): `late` when it was filed after the claim-filing deadline, `disputed` when the
 * debtor is challenging it.
 */
export type FlaggedClaim = SectionEntry & { late: boolean; disputed: boolean };

/**
 * Annotates every filed claim with whether it is late and/or disputed. `late` compares the plain
 * ISO 'YYYY-MM-DD' `filedOn` string against the deadline string directly — both sort correctly
 * with ordinary `>`, so there is no need for `Date` math (which would drag in timezone traps),
 * mirroring `nextUpcomingHearing`. Missing dates on either side mean "cannot tell it's late", so
 * `late` is false rather than a guess.
 */
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
