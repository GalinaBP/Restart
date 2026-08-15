import { describe, expect, it } from 'vitest';
import { VALID_CASE } from './caseFixture';
import { assembleModel, formatMoney } from './model';
import { COURT_PLACEHOLDER } from './rules';
import type { SectionPayload } from './types';

const TODAY = new Date(2026, 6, 17);

function model(overrides: Record<string, SectionPayload> = {}) {
  return assembleModel({ ...VALID_CASE, ...overrides }, TODAY);
}

describe('assembleModel', () => {
  it('composes the applicant from four sections', () => {
    expect(model().applicant).toMatchObject({
      fullName: 'Иванова Анна Сергеевна',
      shortName: 'А. С. Иванова',
      birthDate: '20.05.1999',
      passportSeries: '4519',
      passportIssueDate: '14.06.2019',
      address: '101000, г. Москва, Москва, ул. Ленина, д. 1, кв. 2',
      phone: '+7 900 000-00-00',
    });
  });

  it('indexes, formats and totals the creditors', () => {
    const assembled = model();
    const creditors = assembled.creditors as Record<string, string>[];

    expect(creditors).toHaveLength(2);
    expect(creditors[0]).toMatchObject({
      index: '1',
      debtAmount: '1 000 000,00',
      overdueSinceDate: '01.02.2026',
    });
    expect(creditors[1]).toMatchObject({
      index: '2',
      inn: '—',
      debtType: '—',
      overdueSinceDate: '—',
      debtAmount: '250 000,50',
    });
    expect(assembled.creditorCount).toBe('2');
    expect(assembled.totalDebt).toBe('1 250 000,50');
  });

  it('lists other income and adds it to the main income', () => {
    const assembled = model();

    expect(assembled.monthlyIncome).toEqual({
      amount: '85 000,50',
      source: 'заработная плата',
    });
    expect(assembled.otherIncome).toEqual([
      { index: '1', source: 'сдача комнаты в аренду', amount: '15 000,00' },
    ]);
    expect(assembled.totalIncome).toBe('100 000,50');
  });

  it('marks blank SRO details absent', () => {
    expect(model().sro).toMatchObject({
      name: 'Ассоциация «СРО арбитражных управляющих «Содействие»»',
      address: 'г. Москва, ул. Управляющая, д. 5',
      registryNumber: '0012',
    });
  });

  it('turns absent optional sections into empty lists', () => {
    const assembled = model();

    expect(assembled.realEstate).toEqual([]);
    expect(assembled.vehicles).toEqual([]);
    expect(assembled.bankAccounts).toEqual([]);
  });

  it('takes the date from the clock and the court from the registration region', () => {
    const assembled = model();

    expect(assembled.generatedDate).toBe('17.07.2026');
    expect(assembled.court).toEqual({ name: 'Арбитражный суд города Москвы' });
  });

  it('keeps the honest court placeholder for an unrecognised region', () => {
    const assembled = model({
      REGISTRATION_ADDRESS: {
        region: 'Атлантида',
        city: 'Посейдонис',
        street: 'ул. Морская',
        house: 'д. 1',
      },
    });

    expect(assembled.court).toEqual({ name: COURT_PLACEHOLDER });
  });
});

describe('formatMoney', () => {
  it('groups thousands and rounds half up', () => {
    expect(formatMoney(0)).toBe('0,00');
    expect(formatMoney(999)).toBe('999,00');
    expect(formatMoney(1000)).toBe('1 000,00');
    expect(formatMoney(1234567.895)).toBe('1 234 567,90');
  });

  it('survives the float error of summing kopecks', () => {
    expect(formatMoney(0.1 + 0.2)).toBe('0,30');
  });
});
