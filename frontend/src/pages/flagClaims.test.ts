import { describe, expect, it } from 'vitest';
import { flagClaims } from './flagClaims';

describe('flagClaims', () => {
  it('returns an empty list for no entries', () => {
    expect(flagClaims([], '2026-07-24')).toEqual([]);
  });

  it('returns null/undefined entries as an empty list', () => {
    expect(flagClaims(null, '2026-07-24')).toEqual([]);
    expect(flagClaims(undefined, '2026-07-24')).toEqual([]);
  });

  it('flags neither late nor disputed a claim filed on time', () => {
    const entries = [{ creditorName: 'Банк А', filedOn: '2026-07-01' }];

    expect(flagClaims(entries, '2026-07-24')).toEqual([
      { creditorName: 'Банк А', filedOn: '2026-07-01', late: false, disputed: false },
    ]);
  });

  it('flags a claim filed after the deadline as late', () => {
    const entries = [{ creditorName: 'Банк Б', filedOn: '2026-08-01' }];

    expect(flagClaims(entries, '2026-07-24')).toEqual([
      { creditorName: 'Банк Б', filedOn: '2026-08-01', late: true, disputed: false },
    ]);
  });

  it('does not flag a claim filed exactly on the deadline as late', () => {
    const entries = [{ creditorName: 'Банк В', filedOn: '2026-07-24' }];

    expect(flagClaims(entries, '2026-07-24')[0].late).toBe(false);
  });

  it('flags a disputed claim regardless of its filing date', () => {
    const entries = [{ creditorName: 'Банк Г', filedOn: '2026-07-01', disputed: true }];

    expect(flagClaims(entries, '2026-07-24')).toEqual([
      { creditorName: 'Банк Г', filedOn: '2026-07-01', disputed: true, late: false },
    ]);
  });

  it('flags a claim both late and disputed', () => {
    const entries = [{ creditorName: 'Банк Д', filedOn: '2026-09-01', disputed: true }];

    const [flagged] = flagClaims(entries, '2026-07-24');
    expect(flagged.late).toBe(true);
    expect(flagged.disputed).toBe(true);
  });

  it('treats a missing filedOn as not late', () => {
    const entries = [{ creditorName: 'Банк Е' }];

    expect(flagClaims(entries, '2026-07-24')[0].late).toBe(false);
  });

  it('treats a missing deadline as not late, even for an old filing', () => {
    const entries = [{ creditorName: 'Банк Ж', filedOn: '2026-01-01' }];

    expect(flagClaims(entries, null)[0].late).toBe(false);
    expect(flagClaims(entries, undefined)[0].late).toBe(false);
  });
});
