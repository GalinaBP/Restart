import { describe, expect, it } from 'vitest';
import { BackupError, backupFilename, exportBackup, importBackup } from './backup';
import { VALID_CASE } from './caseFixture';
import { seedCase, seedDocument } from '../test/localCase';
import { loadCase, loadDocuments } from './store';

const PASSPHRASE = 'коробка-с-документами';
const NOW = new Date('2026-08-15T10:00:00Z');

describe('the export file', () => {
  it('carries the case only as ciphertext', async () => {
    await seedCase({ sections: VALID_CASE });

    const text = await (await exportBackup(PASSPHRASE, NOW)).text();

    expect(text).not.toContain('Иванова');
    expect(text).not.toContain('4519');
    expect(JSON.parse(text)).toMatchObject({
      format: 'restart-case',
      formatVersion: 1,
      cipher: 'AES-GCM',
      kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 300000 },
    });
  });

  it('is named after the day it was made', () => {
    expect(backupFilename(NOW)).toBe('restart-delo-2026-08-15.restart');
  });

  it('refuses to export a case that does not exist yet', async () => {
    await expect(exportBackup(PASSPHRASE, NOW)).rejects.toThrow(BackupError);
  });

  it('refuses a passphrase too short to be worth anything', async () => {
    await seedCase({ sections: VALID_CASE });

    await expect(exportBackup('1234', NOW)).rejects.toThrow('не короче 8 символов');
  });
});

describe('importing an export file', () => {
  it('restores the whole case on a device that never saw it', async () => {
    const original = await seedCase({
      sections: VALID_CASE,
      procedureType: 'REALIZATION',
      journey: { COURT_DECISION: { status: 'DONE', startedOn: '2026-07-01', completedOn: null, note: 'принято' } },
    });
    const file = await exportBackup(PASSPHRASE, NOW);

    await importBackup(file, PASSPHRASE);

    expect(await loadCase()).toMatchObject({
      id: original.id,
      sections: VALID_CASE,
      procedureType: 'REALIZATION',
      journey: { COURT_DECISION: { status: 'DONE', startedOn: '2026-07-01' } },
    });
  });

  it('drops documents on import, because they are rebuilt from the restored answers', async () => {
    await seedCase({ sections: VALID_CASE });
    const file = await exportBackup(PASSPHRASE, NOW);
    await seedDocument();

    await importBackup(file, PASSPHRASE);

    expect(await loadDocuments()).toEqual([]);
  });

  it('says plainly that the passphrase is wrong', async () => {
    await seedCase({ sections: VALID_CASE });
    const file = await exportBackup(PASSPHRASE, NOW);

    await expect(importBackup(file, 'другой-пароль')).rejects.toThrow('Не подошёл пароль');
  });

  it('rejects a file that is not an export at all', async () => {
    const file = new Blob(['просто текст']);

    await expect(importBackup(file, PASSPHRASE)).rejects.toThrow('не похоже на файл с копией');
  });

  it('rejects an export written by a different format version', async () => {
    await seedCase({ sections: VALID_CASE });
    const envelope = JSON.parse(await (await exportBackup(PASSPHRASE, NOW)).text());

    const file = new Blob([JSON.stringify({ ...envelope, formatVersion: 99 })]);

    await expect(importBackup(file, PASSPHRASE)).rejects.toThrow('другой версией');
  });
});
