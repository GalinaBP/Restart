import { CASE_STORE, DOCUMENT_STORE, clear, get, getAll, put } from './db';
import type { ProcedureBranch, SectionPayload } from './types';

export const CURRENT_KEY = 'current';

export type CaseStatus = 'DRAFT' | 'IN_PROGRESS' | 'READY' | 'FILED';

export type StageStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';

export interface StoredStage {
  status: StageStatus;
  startedOn: string | null;
  completedOn: string | null;
  note: string | null;
}

export interface StoredCase {
  id: string;
  caseType: 'PERSONAL_BANKRUPTCY';
  status: CaseStatus;
  procedureType: ProcedureBranch | null;
  sections: Record<string, SectionPayload>;
  journey: Record<string, StoredStage>;
  createdAt: string;
  updatedAt: string;
}

export interface StoredDocument {
  id: string;
  type: string;
  templateVersion: string;
  filename: string;
  bytes: Uint8Array;
  stale: boolean;
  generatedAt: string;
}

export function newCase(now: Date): StoredCase {
  const timestamp = now.toISOString();
  return {
    id: crypto.randomUUID(),
    caseType: 'PERSONAL_BANKRUPTCY',
    status: 'DRAFT',
    procedureType: null,
    sections: {},
    journey: {},
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function loadCase(): Promise<StoredCase | undefined> {
  return get<StoredCase>(CASE_STORE, CURRENT_KEY);
}

export async function requireCase(): Promise<StoredCase> {
  const existing = await loadCase();
  if (!existing) {
    throw new CaseNotFoundError();
  }
  return existing;
}

export function saveCase(bankruptcyCase: StoredCase, now: Date): Promise<void> {
  return put(CASE_STORE, CURRENT_KEY, { ...bankruptcyCase, updatedAt: now.toISOString() });
}

export function loadDocuments(): Promise<StoredDocument[]> {
  return getAll<StoredDocument>(DOCUMENT_STORE);
}

export function saveDocument(document: StoredDocument): Promise<void> {
  return put(DOCUMENT_STORE, document.type, document);
}

export function clearDocuments(): Promise<void> {
  return clear(DOCUMENT_STORE);
}

export async function clearEverything(): Promise<void> {
  await clear(DOCUMENT_STORE);
  await clear(CASE_STORE);
}

export class CaseNotFoundError extends Error {
  constructor() {
    super('У вас пока нет начатого дела');
    this.name = 'CaseNotFoundError';
  }
}
