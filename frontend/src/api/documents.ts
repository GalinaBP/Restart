import { download, request } from './client';

export interface DocumentMeta {
  id: string;
  type: string;
  format: 'PDF';
  templateVersion: string;
  filename: string;
  sizeBytes: number;
  stale: boolean;
}

export function listDocuments(caseId: string): Promise<DocumentMeta[]> {
  return request<DocumentMeta[]>(`/cases/${caseId}/documents`);
}

export function generateDocuments(caseId: string): Promise<DocumentMeta[]> {
  return request<DocumentMeta[]>(`/cases/${caseId}/documents`, { method: 'POST' });
}

export function downloadDocument(caseId: string, documentId: string): Promise<Blob> {
  return download(`/cases/${caseId}/documents/${documentId}`);
}

export function exportPackage(caseId: string): Promise<Blob> {
  return download(`/cases/${caseId}/documents/export`, 'POST');
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
