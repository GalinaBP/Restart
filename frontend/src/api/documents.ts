import { download, request } from './client';

export interface DocumentMeta {
  id: string;
  type: string;
  format: 'TXT' | 'DOCX' | 'PDF';
  templateVersion: string;
  filename: string;
  sizeBytes: number;
  stale: boolean;
}

export function listDocuments(caseId: string): Promise<DocumentMeta[]> {
  return request<DocumentMeta[]>(`/cases/${caseId}/documents`);
}

/** Renders the whole package; throws ApiError with body.missing on GENERATION_BLOCKED. */
export function generateDocuments(caseId: string): Promise<DocumentMeta[]> {
  return request<DocumentMeta[]>(`/cases/${caseId}/documents`, { method: 'POST' });
}

export function downloadDocument(caseId: string, documentId: string): Promise<Blob> {
  return download(`/cases/${caseId}/documents/${documentId}`);
}

/** The one-click filing package; the backend regenerates before bundling. */
export function exportPackage(caseId: string): Promise<Blob> {
  return download(`/cases/${caseId}/documents/export`, 'POST');
}

/** Hands a fetched blob to the browser as a normal file download. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
