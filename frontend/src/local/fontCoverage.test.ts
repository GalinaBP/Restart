import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { beforeAll, describe, expect, it } from 'vitest';
import templates from '../generated/templates.json';
import { VALID_CASE } from './caseFixture';
import { assembleModel } from './model';
import { render } from './mustache';
import { layout } from './pdf';

let supported: Set<number>;

beforeAll(() => {
  const bytes = readFileSync(join(import.meta.dirname, '..', 'generated', 'DejaVuSansMono.ttf'));
  const font = fontkit.create(bytes) as { characterSet: number[] };
  supported = new Set(font.characterSet);
});

function missing(text: string): string[] {
  return [...new Set([...text])]
    .filter((character) => !supported.has(character.codePointAt(0) as number))
    .sort();
}

describe('the subset font', () => {
  it('draws every character the five documents can produce', () => {
    const model = assembleModel(VALID_CASE, new Date(2026, 6, 17));

    for (const { templateName } of templates.documents) {
      const text = render(
        templates.sources[templateName as keyof typeof templates.sources],
        model,
        templates.sources,
      );
      const drawn = layout(text, 90).join('');
      expect(missing(drawn), `${templateName} needs glyphs the subset does not have`).toEqual([]);
    }
  });

  it('covers the Russian alphabet in both cases, ё included', () => {
    const lower = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';

    expect(missing(lower + lower.toUpperCase())).toEqual([]);
  });

  it('covers Latin letters, digits and the punctuation the templates use', () => {
    expect(missing('abcdefghijklmnopqrstuvwxyz'.toUpperCase())).toEqual([]);
    expect(missing('abcdefghijklmnopqrstuvwxyz0123456789')).toEqual([]);
    expect(missing('«»—–…№§°%()[]{}<>/\\|@#$&*+=_-:;,.!?\'"`^~')).toEqual([]);
  });

  it('covers accented Latin and Ukrainian or Belarusian letters a name may carry', () => {
    expect(missing('äöüßéèêçñåøæÄÖÜÉÑ')).toEqual([]);
    expect(missing('їієґЇІЄҐўЎ')).toEqual([]);
  });

  it('has actually been subset, not shipped whole', () => {
    const bytes = readFileSync(join(import.meta.dirname, '..', 'generated', 'DejaVuSansMono.ttf'));

    expect(bytes.length).toBeLessThan(120_000);
  });

  it('leaves out what the documents will never need, so the trim is real', () => {
    expect(missing('日本語')).toHaveLength(3);
    expect(missing('🚀')).toHaveLength(1);
  });
});
