import { describe, expect, it } from 'vitest';
import { innChecksumValid, validateCase, validateSection } from './validate';
import type { SectionDefinition, SectionPayload } from './types';
import { VALID_CASE } from './caseFixture';

const PASSPORT_LIKE: SectionDefinition = {
  key: 'PASSPORT',
  order: 1,
  repeatable: false,
  mandatory: true,
  uniqueBy: [],
  fields: [
    { name: 'series', type: 'PASSPORT_SERIES', required: true },
    { name: 'number', type: 'PASSPORT_NUMBER', required: true },
    { name: 'issueDate', type: 'DATE', required: true },
    { name: 'inn', type: 'INN', required: false },
    { name: 'note', type: 'STRING', required: false },
  ],
};

const CREDITORS_LIKE: SectionDefinition = {
  key: 'CREDITORS',
  order: 2,
  repeatable: true,
  mandatory: true,
  uniqueBy: ['name', 'inn'],
  fields: [
    { name: 'name', type: 'STRING', required: true },
    { name: 'inn', type: 'INN', required: false },
    { name: 'address', type: 'STRING', required: true },
    { name: 'debtAmount', type: 'MONEY', required: true },
  ],
};

const OPTIONAL_LIST: SectionDefinition = {
  key: 'VEHICLES',
  order: 3,
  repeatable: true,
  mandatory: false,
  uniqueBy: [],
  fields: [
    { name: 'type', type: 'STRING', required: true },
    { name: 'year', type: 'INTEGER', required: false },
  ],
};

function codes(definition: SectionDefinition, payload: SectionPayload | null): string[] {
  return validateSection(definition, payload).map((issue) => issue.code);
}

function passport(overrides: Record<string, unknown>): SectionPayload {
  return {
    series: '1234',
    number: '567890',
    issueDate: '2020-01-15',
    ...overrides,
  } as SectionPayload;
}

describe('validateSection', () => {
  it('flags a mandatory section that is missing or empty', () => {
    expect(codes(PASSPORT_LIKE, null)).toEqual(['SECTION_EMPTY']);
    expect(codes(PASSPORT_LIKE, {})).toEqual(['SECTION_EMPTY']);
    expect(codes(CREDITORS_LIKE, [])).toEqual(['SECTION_EMPTY']);
  });

  it('lets an optional section stay empty', () => {
    expect(codes(OPTIONAL_LIST, null)).toEqual([]);
    expect(codes(OPTIONAL_LIST, [])).toEqual([]);
  });

  it('flags missing and blank required fields per field', () => {
    const issues = validateSection(PASSPORT_LIKE, { series: '  ' });

    expect(issues.map((issue) => issue.field).sort())
      .toEqual(['issueDate', 'number', 'series']);
    expect(issues.every((issue) => issue.code === 'REQUIRED_FIELD_MISSING')).toBe(true);
  });

  it('allows optional fields to be absent but validates them when present', () => {
    expect(codes(PASSPORT_LIKE, passport({}))).toEqual([]);
    expect(codes(PASSPORT_LIKE, passport({ inn: '123' }))).toEqual(['INVALID_INN']);
  });

  it.each(['123', '12345', '12a4', '1234 '])('rejects passport series %s', (series) => {
    expect(codes(PASSPORT_LIKE, passport({ series }))).toEqual(['INVALID_PASSPORT_SERIES']);
  });

  it.each(['12345', '1234567', '56789a'])('rejects passport number %s', (number) => {
    expect(codes(PASSPORT_LIKE, passport({ number }))).toEqual(['INVALID_PASSPORT_NUMBER']);
  });

  it.each(['15.01.2020', '2020-13-01', '2020-02-30', 'yesterday', '2020'])(
    'rejects the malformed date %s',
    (issueDate) => {
      expect(codes(PASSPORT_LIKE, passport({ issueDate }))).toEqual(['INVALID_DATE']);
    },
  );

  it.each(['123', '77070838930', '7707O83893'])('rejects the malformed INN %s', (inn) => {
    expect(codes(PASSPORT_LIKE, passport({ inn }))).toEqual(['INVALID_INN']);
  });

  it('requires money to be a non-negative number', () => {
    const creditor = (debtAmount: unknown): SectionPayload =>
      [{ name: 'Банк', address: 'Москва', debtAmount }] as SectionPayload;

    expect(codes(CREDITORS_LIKE, creditor(125000.5))).toEqual([]);
    expect(codes(CREDITORS_LIKE, creditor(-1))).toEqual(['INVALID_MONEY']);
    expect(codes(CREDITORS_LIKE, creditor('много'))).toEqual(['INVALID_MONEY']);
  });

  it('checks integer and string types', () => {
    expect(codes(OPTIONAL_LIST, [{ type: 'авто', year: 2015 }])).toEqual([]);
    expect(codes(OPTIONAL_LIST, [{ type: 'авто', year: 'позапрошлый' }]))
      .toEqual(['INVALID_TYPE']);
    expect(codes(OPTIONAL_LIST, [{ type: 12 }])).toEqual(['INVALID_TYPE']);
  });

  it('carries the entry index on findings inside a list', () => {
    const issues = validateSection(CREDITORS_LIKE, [
      { name: 'Банк', address: 'Москва', debtAmount: 100 },
      { name: 'МФО', debtAmount: 50 },
    ]);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      entryIndex: 1,
      field: 'address',
      code: 'REQUIRED_FIELD_MISSING',
    });
  });

  it('detects duplicate creditors case-insensitively', () => {
    const issues = validateSection(CREDITORS_LIKE, [
      { name: 'Банк Восход', inn: '7707083893', address: 'Москва', debtAmount: 100 },
      { name: 'банк восход', inn: '7707083893', address: 'Москва', debtAmount: 200 },
    ]);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: 'DUPLICATE_ENTRY', entryIndex: 1 });
  });

  it('does not treat the same name with a different INN as a duplicate', () => {
    const issues = validateSection(CREDITORS_LIKE, [
      { name: 'Банк', inn: '7707083893', address: 'Москва', debtAmount: 100 },
      { name: 'Банк', inn: '500100732259', address: 'Тверь', debtAmount: 200 },
    ]);

    expect(issues).toEqual([]);
  });
});

describe('innChecksumValid', () => {
  it.each(['7707083893', '500100732259'])('accepts %s', (inn) => {
    expect(innChecksumValid(inn)).toBe(true);
  });

  it.each(['7707083894', '500100732258', '0000000001'])('rejects %s', (inn) => {
    expect(innChecksumValid(inn)).toBe(false);
  });
});

describe('validateCase', () => {
  it('passes a complete case', () => {
    expect(validateCase(VALID_CASE)).toEqual([]);
  });

  it('names every mandatory section that is still empty', () => {
    const { PASSPORT: _passport, CREDITORS: _creditors, ...rest } = VALID_CASE;

    expect(validateCase(rest)).toEqual([
      {
        section: 'PASSPORT',
        entryIndex: null,
        field: null,
        code: 'SECTION_EMPTY',
        message: 'Этот раздел нужно заполнить',
      },
      {
        section: 'CREDITORS',
        entryIndex: null,
        field: null,
        code: 'SECTION_EMPTY',
        message: 'Этот раздел нужно заполнить',
      },
    ]);
  });
});
