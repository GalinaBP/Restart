import { refreshGeneratedDocuments } from './documents';
import { SECTIONS, section as sectionDefinition } from './rules';
import { importServerCaseOnce } from './serverImport';
import {
  CaseNotFoundError, type StoredCase, loadCase, newCase, requireCase, saveCase,
} from './store';
import type { FieldMeta, SectionEntry, SectionPayload, ValidationIssue } from './types';
import { validateSection } from './validate';

export type { SectionEntry, SectionPayload } from './types';
export type { FieldMeta } from './types';
export type SectionIssue = ValidationIssue;

export interface CaseInfo {
  id: string;
  caseType: string;
  status: StoredCase['status'];
}

export interface SectionStatus {
  key: string;
  order: number;
  repeatable: boolean;
  filled: boolean;
}

export interface SectionContent {
  key: string;
  order: number;
  repeatable: boolean;
  fields: FieldMeta[];
  data: SectionEntry | SectionEntry[] | null;
  issues: SectionIssue[];
}

export class UnknownSectionError extends Error {
  constructor(key: string) {
    super(`Такого шага нет: ${key}`);
    this.name = 'UnknownSectionError';
  }
}

export class InvalidSectionPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSectionPayloadError';
  }
}

export async function currentCase(): Promise<CaseInfo | null> {
  await importServerCaseOnce();
  const existing = await loadCase();
  return existing ? toInfo(existing) : null;
}

export async function createCase(): Promise<CaseInfo> {
  const existing = await loadCase();
  if (existing) {
    return toInfo(existing);
  }
  const created = newCase(new Date());
  await saveCase(created, new Date());
  return toInfo(created);
}

export async function sectionsOverview(): Promise<SectionStatus[]> {
  const bankruptcyCase = await requireCase();
  return SECTIONS.map((definition) => ({
    key: definition.key,
    order: definition.order,
    repeatable: definition.repeatable,
    filled: bankruptcyCase.sections[definition.key] !== undefined,
  }));
}

export async function getSection(key: string): Promise<SectionContent> {
  const bankruptcyCase = await requireCase();
  return content(key, bankruptcyCase.sections[key] ?? null, []);
}

export async function saveSection(
  key: string,
  data: SectionPayload,
): Promise<SectionContent> {
  const bankruptcyCase = await requireCase();
  const definition = definitionOf(key);
  screen(key, data);

  const now = new Date();
  const updated: StoredCase = {
    ...bankruptcyCase,
    status: bankruptcyCase.status === 'DRAFT' ? 'IN_PROGRESS' : bankruptcyCase.status,
    sections: { ...bankruptcyCase.sections, [key]: data },
  };
  await saveCase(updated, now);
  await refreshGeneratedDocuments(updated, now);

  return content(key, data, validateSection(definition, data));
}

function toInfo(bankruptcyCase: StoredCase): CaseInfo {
  return {
    id: bankruptcyCase.id,
    caseType: bankruptcyCase.caseType,
    status: bankruptcyCase.status,
  };
}

function definitionOf(key: string) {
  const definition = sectionDefinition(key);
  if (!definition) {
    throw new UnknownSectionError(key);
  }
  return definition;
}

function content(
  key: string,
  data: SectionPayload | null,
  issues: SectionIssue[],
): SectionContent {
  const definition = definitionOf(key);
  return {
    key: definition.key,
    order: definition.order,
    repeatable: definition.repeatable,
    fields: definition.fields,
    data,
    issues,
  };
}

function screen(key: string, payload: SectionPayload): void {
  const definition = definitionOf(key);
  if (payload === null || payload === undefined) {
    throw new InvalidSectionPayloadError('Раздел не может быть пустым');
  }
  if (definition.repeatable) {
    if (!Array.isArray(payload)) {
      throw new InvalidSectionPayloadError('Этот раздел заполняется списком записей');
    }
    for (const entry of payload) {
      screenEntry(key, entry, 'Каждая запись раздела должна быть заполнена по форме');
    }
    return;
  }
  if (Array.isArray(payload)) {
    throw new InvalidSectionPayloadError('Этот раздел заполняется одной записью');
  }
  screenEntry(key, payload, 'Этот раздел заполняется одной записью');
}

function screenEntry(key: string, entry: SectionEntry, shapeMessage: string): void {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new InvalidSectionPayloadError(shapeMessage);
  }
  const known = new Set(definitionOf(key).fields.map((field) => field.name));
  const unknown = Object.keys(entry).filter((name) => !known.has(name));
  if (unknown.length > 0) {
    throw new InvalidSectionPayloadError(
      `В разделе есть неизвестные поля: ${unknown.join(', ')}`,
    );
  }
}

export { CaseNotFoundError };
