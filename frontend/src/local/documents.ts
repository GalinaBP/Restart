import templates from '../generated/templates.json';
import { assembleModel } from './model';
import { render } from './mustache';
import {
  type StoredCase, type StoredDocument, clearDocuments, loadDocuments, requireCase, saveDocument,
} from './store';
import type { ValidationIssue } from './types';
import { validateCase } from './validate';

export interface DocumentMeta {
  id: string;
  type: string;
  format: 'PDF';
  templateVersion: string;
  filename: string;
  sizeBytes: number;
  stale: boolean;
}

export interface MissingItem {
  step: string;
  entryIndex: number | null;
  field: string | null;
  code: string;
  message: string;
}

export class GenerationBlockedError extends Error {
  readonly missing: MissingItem[];

  constructor(issues: ValidationIssue[]) {
    super('Чтобы собрать документы, осталось дозаполнить несколько шагов');
    this.name = 'GenerationBlockedError';
    this.missing = issues.map((issue) => ({
      step: issue.section,
      entryIndex: issue.entryIndex,
      field: issue.field,
      code: issue.code,
      message: issue.message,
    }));
  }
}

export async function listDocuments(): Promise<DocumentMeta[]> {
  await requireCase();
  return (await loadDocuments()).sort(byDocumentOrder).map(toMeta);
}

export async function generateDocuments(): Promise<DocumentMeta[]> {
  const bankruptcyCase = await requireCase();
  return (await generate(bankruptcyCase, new Date())).map(toMeta);
}

export async function downloadDocument(type: string): Promise<Blob> {
  await requireCase();
  const stored = (await loadDocuments()).find((candidate) => candidate.type === type);
  if (!stored) {
    throw new Error('Документ не найден');
  }
  return new Blob([new Uint8Array(stored.bytes)], { type: 'application/pdf' });
}

export async function exportPackage(): Promise<Blob> {
  const bankruptcyCase = await requireCase();
  const generated = await generate(bankruptcyCase, new Date());
  const { zipSync } = await import('fflate');
  const entries: Record<string, Uint8Array> = {};
  for (const stored of generated) {
    entries[stored.filename] = stored.bytes;
  }
  return new Blob([new Uint8Array(zipSync(entries))], { type: 'application/zip' });
}

export async function refreshGeneratedDocuments(
  bankruptcyCase: StoredCase,
  now: Date,
): Promise<void> {
  const existing = await loadDocuments();
  if (existing.length === 0) {
    return;
  }
  if (validateCase(bankruptcyCase.sections).length === 0) {
    await generate(bankruptcyCase, now);
    return;
  }
  for (const stored of existing) {
    await saveDocument({ ...stored, stale: true });
  }
}

async function generate(bankruptcyCase: StoredCase, now: Date): Promise<StoredDocument[]> {
  const issues = validateCase(bankruptcyCase.sections);
  if (issues.length > 0) {
    throw new GenerationBlockedError(issues);
  }

  const model = assembleModel(bankruptcyCase.sections, now);
  const { writePdf } = await import('./pdf');
  const existing = new Map((await loadDocuments()).map((document) => [document.type, document]));

  const generated: StoredDocument[] = [];
  for (const { type, templateName } of templates.documents) {
    const text = render(
      templates.sources[templateName as keyof typeof templates.sources],
      model,
      templates.sources,
    );
    const stored: StoredDocument = {
      id: existing.get(type)?.id ?? crypto.randomUUID(),
      type,
      templateVersion: templates.activeVersion,
      filename: `${templateName}.pdf`,
      bytes: await writePdf(text),
      stale: false,
      generatedAt: now.toISOString(),
    };
    await saveDocument(stored);
    generated.push(stored);
  }
  return generated;
}

export async function discardDocuments(): Promise<void> {
  await clearDocuments();
}

function toMeta(stored: StoredDocument): DocumentMeta {
  return {
    id: stored.id,
    type: stored.type,
    format: 'PDF',
    templateVersion: stored.templateVersion,
    filename: stored.filename,
    sizeBytes: stored.bytes.length,
    stale: stored.stale,
  };
}

function byDocumentOrder(left: StoredDocument, right: StoredDocument): number {
  return order(left.type) - order(right.type);
}

function order(type: string): number {
  return templates.documents.findIndex((candidate) => candidate.type === type);
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
