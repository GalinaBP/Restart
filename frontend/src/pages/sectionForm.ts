import type { FieldMeta, SectionEntry, SectionIssue } from '../api/cases';

export type FormEntry = Record<string, string | boolean>;

export function toForm(entry: SectionEntry | undefined): FormEntry {
  const form: FormEntry = {};
  if (entry) {
    for (const [key, value] of Object.entries(entry)) {
      form[key] = typeof value === 'boolean' ? value : String(value);
    }
  }
  return form;
}

export function toApi(fields: FieldMeta[], form: FormEntry): SectionEntry {
  const entry: SectionEntry = {};
  for (const field of fields) {
    const raw = form[field.name];
    if (field.type === 'BOOLEAN') {
      if (raw === true) entry[field.name] = true;
      else if (raw === false) entry[field.name] = false;
      continue;
    }
    const text = typeof raw === 'string' ? raw.trim() : '';
    if (text === '') continue;
    if (field.type === 'MONEY' || field.type === 'INTEGER') {
      const parsed = Number(text.replace(/\s/g, '').replace(',', '.'));
      entry[field.name] = Number.isNaN(parsed) ? text : parsed;
    } else {
      entry[field.name] = text;
    }
  }
  return entry;
}

export function inputType(field: FieldMeta): { type: string; inputMode?: 'numeric' | 'decimal' } {
  switch (field.type) {
    case 'DATE':
      return { type: 'date' };
    case 'MONEY':
      return { type: 'text', inputMode: 'decimal' };
    case 'INTEGER':
    case 'PASSPORT_SERIES':
    case 'PASSPORT_NUMBER':
    case 'INN':
      return { type: 'text', inputMode: 'numeric' };
    default:
      return { type: 'text' };
  }
}

export function issueFor(
  issues: SectionIssue[],
  repeatable: boolean,
  entryIndex: number | null,
  field: string,
): string | undefined {
  return issues.find((i) => i.field === field
    && (repeatable ? i.entryIndex === entryIndex : true))?.message;
}
