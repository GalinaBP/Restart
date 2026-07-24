import { describe, expect, it } from 'vitest';
import { nextUpcomingHearing } from './nextUpcomingHearing';

describe('nextUpcomingHearing', () => {
  it('returns null for an empty list', () => {
    expect(nextUpcomingHearing([], '2026-07-24')).toBeNull();
  });

  it('returns null when every hearing is in the past', () => {
    const entries = [
      { date: '2026-01-10', subject: 'Первое заседание' },
      { date: '2026-06-01', subject: 'Второе заседание' },
    ];
    expect(nextUpcomingHearing(entries, '2026-07-24')).toBeNull();
  });

  it('picks the earliest future hearing among several', () => {
    const entries = [
      { date: '2026-09-01', subject: 'Позже' },
      { date: '2026-08-12', subject: 'Раньше' },
      { date: '2026-01-01', subject: 'Прошедшее' },
    ];
    expect(nextUpcomingHearing(entries, '2026-07-24')).toEqual({
      date: '2026-08-12', subject: 'Раньше',
    });
  });

  it('counts a hearing dated exactly today as upcoming', () => {
    const entries = [{ date: '2026-07-24', subject: 'Сегодня' }];
    expect(nextUpcomingHearing(entries, '2026-07-24')).toEqual({
      date: '2026-07-24', subject: 'Сегодня',
    });
  });

  it('works regardless of input order', () => {
    const entries = [
      { date: '2026-12-25', subject: 'Последнее' },
      { date: '2026-08-01', subject: 'Ближайшее' },
      { date: '2026-10-10', subject: 'Среднее' },
    ];
    expect(nextUpcomingHearing(entries, '2026-07-24')?.subject).toBe('Ближайшее');
  });

  it('returns null for null or undefined entries', () => {
    expect(nextUpcomingHearing(null, '2026-07-24')).toBeNull();
    expect(nextUpcomingHearing(undefined, '2026-07-24')).toBeNull();
  });
});
