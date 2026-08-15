import { clearDocuments, loadCase, saveCase, type StoredCase } from './store';

const FORMAT = 'restart-case';
const FORMAT_VERSION = 1;
const ITERATIONS = 300000;

interface Envelope {
  format: string;
  formatVersion: number;
  createdAt: string;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  cipher: 'AES-GCM';
  iv: string;
  data: string;
}

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

export function backupFilename(now: Date): string {
  return `restart-delo-${now.toISOString().slice(0, 10)}.restart`;
}

export async function exportBackup(passphrase: string, now: Date): Promise<Blob> {
  const bankruptcyCase = await loadCase();
  if (!bankruptcyCase) {
    throw new BackupError('Пока нечего сохранять — дело ещё не начато');
  }
  requirePassphrase(passphrase);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, ITERATIONS);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(bankruptcyCase)),
  );

  const envelope: Envelope = {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    createdAt: now.toISOString(),
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: toBase64(salt) },
    cipher: 'AES-GCM',
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(encrypted)),
  };
  return new Blob([JSON.stringify(envelope)], { type: 'application/json' });
}

export async function importBackup(file: Blob, passphrase: string): Promise<StoredCase> {
  requirePassphrase(passphrase);
  const envelope = parseEnvelope(await file.text());
  const key = await deriveKey(
    passphrase,
    fromBase64(envelope.kdf.salt),
    envelope.kdf.iterations,
  );

  let decrypted: ArrayBuffer;
  try {
    decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(envelope.iv) },
      key,
      fromBase64(envelope.data),
    );
  } catch {
    throw new BackupError('Не подошёл пароль от файла — проверьте раскладку и попробуйте снова');
  }

  const restored = asCase(new TextDecoder().decode(decrypted));
  await saveCase(restored, new Date());
  await clearDocuments();
  return restored;
}

function parseEnvelope(text: string): Envelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupError('Это не похоже на файл с копией дела');
  }
  const envelope = parsed as Partial<Envelope>;
  if (envelope?.format !== FORMAT || typeof envelope.data !== 'string'
    || typeof envelope.iv !== 'string' || typeof envelope.kdf?.salt !== 'string'
    || typeof envelope.kdf?.iterations !== 'number') {
    throw new BackupError('Это не похоже на файл с копией дела');
  }
  if (envelope.formatVersion !== FORMAT_VERSION) {
    throw new BackupError('Этот файл сделан другой версией «Рестарта»');
  }
  return envelope as Envelope;
}

function asCase(json: string): StoredCase {
  const restored = JSON.parse(json) as Partial<StoredCase>;
  if (typeof restored?.id !== 'string' || typeof restored.sections !== 'object'
    || restored.sections === null) {
    throw new BackupError('В файле нет дела — возможно, он повреждён');
  }
  return {
    id: restored.id,
    caseType: 'PERSONAL_BANKRUPTCY',
    status: restored.status ?? 'IN_PROGRESS',
    procedureType: restored.procedureType ?? null,
    sections: restored.sections,
    journey: restored.journey ?? {},
    createdAt: restored.createdAt ?? new Date().toISOString(),
    updatedAt: restored.updatedAt ?? new Date().toISOString(),
  };
}

function requirePassphrase(passphrase: string): void {
  if (passphrase.length < 8) {
    throw new BackupError('Пароль от файла — не короче 8 символов');
  }
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
