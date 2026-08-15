import { describe, expect, it } from 'vitest';
import type { SectionEntry } from '../local/case';
import { sortCorrespondence } from './sortCorrespondence';

describe('sortCorrespondence', () => {
  it('returns an empty list for no entries', () => {
    expect(sortCorrespondence([])).toEqual([]);
  });

  it('returns null/undefined entries as an empty list', () => {
    expect(sortCorrespondence(null)).toEqual([]);
    expect(sortCorrespondence(undefined)).toEqual([]);
  });

  it('returns a single entry', () => {
    const entries = [{ date: '2026-07-15', type: 'Отчёт' }];

    expect(sortCorrespondence(entries)).toEqual(entries);
  });

  it('returns multiple entries sorted newest-first by date', () => {
    const entries = [
      { date: '2026-07-10', type: 'Письмо' },
      { date: '2026-07-20', type: 'Отчёт' },
      { date: '2026-07-15', type: 'Уведомление' },
    ];

    expect(sortCorrespondence(entries)).toEqual([
      { date: '2026-07-20', type: 'Отчёт' },
      { date: '2026-07-15', type: 'Уведомление' },
      { date: '2026-07-10', type: 'Письмо' },
    ]);
  });

  it('puts an entry with a missing date at the end', () => {
    const entries: SectionEntry[] = [
      { date: '2026-07-20', type: 'Отчёт' } as SectionEntry,
      {} as SectionEntry,
      { date: '2026-07-15', type: 'Письмо' } as SectionEntry,
    ];

    const sorted = sortCorrespondence(entries);
    expect(sorted[0].date).toBe('2026-07-20');
    expect(sorted[1].date).toBe('2026-07-15');
    expect(sorted[2].date).toBeUndefined();
  });

  it('does not mutate the input array', () => {
    const entries = [
      { date: '2026-07-10', type: 'Письмо' },
      { date: '2026-07-20', type: 'Отчёт' },
    ];
    const original = JSON.parse(JSON.stringify(entries));

    sortCorrespondence(entries);

    expect(entries).toEqual(original);
  });
});
