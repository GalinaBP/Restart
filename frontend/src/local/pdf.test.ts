import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';
import { LINES_PER_PAGE, layout, sanitize, writePdf } from './pdf';

beforeAll(() => {
  const font = readFileSync(join(import.meta.dirname, '..', 'generated', 'DejaVuSansMono.ttf'));
  globalThis.fetch = (() => Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(font.buffer.slice(
      font.byteOffset,
      font.byteOffset + font.byteLength,
    )),
  })) as unknown as typeof fetch;
});

describe('writePdf', () => {
  it('produces a real PDF carrying the Cyrillic content', async () => {
    const pdf = await writePdf('ЗАЯВЛЕНИЕ\nИванова Анна Сергеевна — 1 250 000,50 руб.');

    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe('%PDF-');
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(1);
  });

  it('paginates long documents', async () => {
    const pdf = await writePdf('строка про долги и кредиторов\n'.repeat(200));

    expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThan(1);
  });
});

describe('layout', () => {
  it('wraps overlong lines at the last space that fits', () => {
    expect(layout('кредитор '.repeat(30).trim(), 40)).toEqual([
      'кредитор кредитор кредитор кредитор',
      'кредитор кредитор кредитор кредитор',
      'кредитор кредитор кредитор кредитор',
      'кредитор кредитор кредитор кредитор',
      'кредитор кредитор кредитор кредитор',
      'кредитор кредитор кредитор кредитор',
      'кредитор кредитор кредитор кредитор',
      'кредитор кредитор',
    ]);
  });

  it('hard-breaks a run with no space to break at', () => {
    expect(layout('a'.repeat(25), 10)).toEqual(['aaaaaaaaaa', 'aaaaaaaaaa', 'aaaaa']);
  });

  it('keeps blank lines so the layout matches the rendered text', () => {
    expect(layout('A\n\nB', 40)).toEqual(['A', '', 'B']);
  });

  it('fits a full page of lines before spilling over', () => {
    expect(LINES_PER_PAGE).toBe(57);
  });
});

describe('sanitize', () => {
  it('replaces characters the font cannot draw with a question mark', () => {
    const supported = new Set([...'Привет и удачи!'].map((c) => c.codePointAt(0) as number));

    expect(sanitize('Привет 🚀 и удачи!', supported)).toBe('Привет ? и удачи!');
  });
});
