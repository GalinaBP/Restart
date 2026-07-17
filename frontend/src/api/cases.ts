import { ApiError, request } from './client';

export interface CaseInfo {
  id: string;
  caseType: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'READY' | 'FILED';
}

export interface SectionStatus {
  key: string;
  order: number;
  repeatable: boolean;
  filled: boolean;
}

export interface FieldMeta {
  name: string;
  type: 'STRING' | 'BOOLEAN' | 'INTEGER' | 'MONEY' | 'DATE'
    | 'PASSPORT_SERIES' | 'PASSPORT_NUMBER' | 'INN';
  required: boolean;
}

export interface SectionIssue {
  section: string;
  entryIndex: number | null;
  field: string | null;
  code: string;
  message: string;
}

/** One entry of a section form; values are strings/numbers/booleans as the backend expects. */
export type SectionEntry = Record<string, string | number | boolean>;

export interface SectionContent {
  key: string;
  order: number;
  repeatable: boolean;
  fields: FieldMeta[];
  data: SectionEntry | SectionEntry[] | null;
  issues: SectionIssue[];
}

/** The user's active case, or null when none exists yet. */
export async function currentCase(): Promise<CaseInfo | null> {
  try {
    return await request<CaseInfo>('/cases/current');
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export function createCase(): Promise<CaseInfo> {
  return request<CaseInfo>('/cases', { method: 'POST' });
}

export function sectionsOverview(caseId: string): Promise<SectionStatus[]> {
  return request<SectionStatus[]>(`/cases/${caseId}/sections`);
}

export function getSection(caseId: string, key: string): Promise<SectionContent> {
  return request<SectionContent>(`/cases/${caseId}/sections/${key}`);
}

export function saveSection(
  caseId: string,
  key: string,
  data: SectionEntry | SectionEntry[],
): Promise<SectionContent> {
  return request<SectionContent>(`/cases/${caseId}/sections/${key}`, {
    method: 'PUT',
    body: data,
  });
}
