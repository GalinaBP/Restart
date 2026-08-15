import { SECTIONS } from './rules';
import type {
  FieldMeta, SectionDefinition, SectionEntry, SectionPayload, SectionValue, ValidationCode,
  ValidationIssue,
} from './types';

interface Finding {
  code: ValidationCode;
  message: string;
}

export function validateSection(
  definition: SectionDefinition,
  payload: SectionPayload | null | undefined,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (isEmptyPayload(payload)) {
    if (definition.mandatory) {
      issues.push({
        section: definition.key,
        entryIndex: null,
        field: null,
        code: 'SECTION_EMPTY',
        message: 'Этот раздел нужно заполнить',
      });
    }
    return issues;
  }
  if (definition.repeatable) {
    const entries = payload as SectionEntry[];
    entries.forEach((entry, index) => validateFields(definition, entry, index, issues));
    detectDuplicates(definition, entries, issues);
  } else {
    validateFields(definition, payload as SectionEntry, null, issues);
  }
  return issues;
}

export function validateCase(sections: Record<string, SectionPayload>): ValidationIssue[] {
  return SECTIONS.flatMap((definition) => validateSection(definition, sections[definition.key]));
}

function isEmptyPayload(payload: SectionPayload | null | undefined): boolean {
  if (payload === null || payload === undefined) {
    return true;
  }
  return Array.isArray(payload) ? payload.length === 0 : Object.keys(payload).length === 0;
}

function validateFields(
  definition: SectionDefinition,
  entry: SectionEntry,
  entryIndex: number | null,
  issues: ValidationIssue[],
): void {
  for (const field of definition.fields) {
    const value = entry[field.name];
    if (isBlank(value)) {
      if (field.required) {
        issues.push({
          section: definition.key,
          entryIndex,
          field: field.name,
          code: 'REQUIRED_FIELD_MISSING',
          message: 'Заполни это поле',
        });
      }
      continue;
    }
    const finding = checkValue(field, value);
    if (finding) {
      issues.push({
        section: definition.key,
        entryIndex,
        field: field.name,
        code: finding.code,
        message: finding.message,
      });
    }
  }
}

function checkValue(field: FieldMeta, value: SectionValue): Finding | null {
  switch (field.type) {
    case 'STRING':
      return typeof value === 'string'
        ? null
        : { code: 'INVALID_TYPE', message: 'Здесь должен быть текст' };
    case 'BOOLEAN':
      return typeof value === 'boolean'
        ? null
        : { code: 'INVALID_TYPE', message: 'Здесь нужен ответ «да» или «нет»' };
    case 'INTEGER':
      return typeof value === 'number' && Number.isInteger(value)
        ? null
        : { code: 'INVALID_TYPE', message: 'Здесь должно быть целое число' };
    case 'MONEY':
      return typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? null
        : { code: 'INVALID_MONEY', message: 'Сумма должна быть числом не меньше нуля' };
    case 'DATE':
      return isIsoDate(value)
        ? null
        : { code: 'INVALID_DATE', message: 'Дата должна быть в формате ГГГГ-ММ-ДД' };
    case 'PASSPORT_SERIES':
      return typeof value === 'string' && /^\d{4}$/.test(value)
        ? null
        : { code: 'INVALID_PASSPORT_SERIES', message: 'Серия паспорта — это 4 цифры' };
    case 'PASSPORT_NUMBER':
      return typeof value === 'string' && /^\d{6}$/.test(value)
        ? null
        : { code: 'INVALID_PASSPORT_NUMBER', message: 'Номер паспорта — это 6 цифр' };
    case 'INN':
      return checkInn(value);
  }
}

function isIsoDate(value: SectionValue): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function checkInn(value: SectionValue): Finding | null {
  if (typeof value !== 'string' || !/^(\d{10}|\d{12})$/.test(value)) {
    return { code: 'INVALID_INN', message: 'ИНН — это 10 или 12 цифр' };
  }
  if (!innChecksumValid(value)) {
    return { code: 'INVALID_INN', message: 'Проверь ИНН — похоже, в нём опечатка' };
  }
  return null;
}

export function innChecksumValid(inn: string): boolean {
  const digits = [...inn].map(Number);
  if (digits.length === 10) {
    return digits[9] === checkDigit(digits, [2, 4, 10, 3, 5, 9, 4, 6, 8]);
  }
  return digits[10] === checkDigit(digits, [7, 2, 4, 10, 3, 5, 9, 4, 6, 8])
    && digits[11] === checkDigit(digits, [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]);
}

function checkDigit(digits: number[], weights: number[]): number {
  const sum = weights.reduce((total, weight, index) => total + digits[index] * weight, 0);
  return (sum % 11) % 10;
}

function detectDuplicates(
  definition: SectionDefinition,
  entries: SectionEntry[],
  issues: ValidationIssue[],
): void {
  if (definition.uniqueBy.length === 0) {
    return;
  }
  const seen = new Map<string, number>();
  entries.forEach((entry, index) => {
    const signature = definition.uniqueBy
      .map((name) => {
        const value = entry[name];
        return isBlank(value) ? '' : String(value).trim().toLowerCase();
      })
      .join(' ');
    if (signature.replaceAll(' ', '') === '') {
      return;
    }
    if (seen.has(signature)) {
      issues.push({
        section: definition.key,
        entryIndex: index,
        field: null,
        code: 'DUPLICATE_ENTRY',
        message: 'Эта запись уже есть в списке',
      });
      return;
    }
    seen.set(signature, index);
  });
}

function isBlank(value: SectionValue | undefined): boolean {
  return value === undefined || value === null
    || (typeof value === 'string' && value.trim() === '');
}
