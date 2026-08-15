import { saveDocument, loadCase, newCase, saveCase, type StoredCase, type StoredDocument } from '../local/store';
import type { SectionPayload } from '../local/types';

export async function seedCase(overrides: Partial<StoredCase> = {}): Promise<StoredCase> {
  const seeded: StoredCase = { ...newCase(new Date()), status: 'IN_PROGRESS', ...overrides };
  await saveCase(seeded, new Date());
  return seeded;
}

export function seedSections(sections: Record<string, SectionPayload>): Promise<StoredCase> {
  return seedCase({ sections });
}

export function seedDocument(overrides: Partial<StoredDocument> = {}): Promise<void> {
  return saveDocument({
    id: 'document-1',
    type: 'BANKRUPTCY_APPLICATION',
    templateVersion: '2026-06-21.1',
    filename: 'bankruptcy_application.pdf',
    bytes: new Uint8Array([1, 2, 3]),
    stale: false,
    generatedAt: new Date().toISOString(),
    ...overrides,
  });
}

export function storedCase(): Promise<StoredCase | undefined> {
  return loadCase();
}

export function signIn(): void {
  localStorage.setItem('restart.accessToken', 'access-1');
  localStorage.setItem('restart.refreshToken', 'refresh-1');
}
