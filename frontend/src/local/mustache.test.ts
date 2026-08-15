import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import templates from '../generated/templates.json';
import { render } from './mustache';
import { SAMPLE_MODEL } from './sampleModel';

const GOLDEN_DIR = join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  'src',
  'test',
  'resources',
  'doctemplate',
  'golden',
  templates.activeVersion,
);

describe('the browser template renderer', () => {
  it.each(templates.documents.map((document) => document.templateName))(
    'reproduces the %s golden file',
    (name) => {
      const golden = readFileSync(join(GOLDEN_DIR, `${name}.txt`), 'utf8');

      const rendered = render(
        templates.sources[name as keyof typeof templates.sources],
        SAMPLE_MODEL,
        templates.sources,
      );

      expect(rendered).toBe(golden);
    },
  );
});

describe('the jmustache whitespace rules the templates were written against', () => {
  const partials = { p: 'PA\nPB\n' };
  const view = { x: 'X', list: [1, 2] };
  const out = (template: string) => render(template, view, partials);

  it('removes a standalone comment line, including the first line of a template', () => {
    expect(out('{{! c }}\nA\n')).toBe('A\n');
    expect(out('Z\n{{! c }}\nA\n')).toBe('Z\nA\n');
  });

  it('removes standalone section and inverted-section lines', () => {
    expect(out('Z\n{{#x}}\nIN\n{{/x}}\nA\n')).toBe('Z\nIN\nA\n');
    expect(out('{{^nope}}\nIN\n{{/nope}}\nA\n')).toBe('IN\nA\n');
    expect(out('Z\n   {{#x}}\nIN\n   {{/x}}\nA\n')).toBe('Z\nIN\nA\n');
    expect(out('Z\n{{#list}}\nITEM\n{{/list}}\nA\n')).toBe('Z\nITEM\nITEM\nA\n');
  });

  it('swallows the newline after a standalone partial, but not on the first line', () => {
    expect(out('A\n{{> p}}\nB\n')).toBe('A\nPA\nPB\nB\n');
    expect(out('{{> p}}\nAFTER\n')).toBe('PA\nPB\n\nAFTER\n');
    expect(out('{{> p}}\n{{> p}}\n\nB\n')).toBe('PA\nPB\n\nPA\nPB\n\nB\n');
    expect(out('A\n{{> p}}\n')).toBe('A\nPA\nPB\n');
  });

  it('keeps the newline after a partial that shares its line with text', () => {
    expect(out('PRE {{> p}}\nAFTER\n')).toBe('PRE PA\nPB\n\nAFTER\n');
  });

  it('indents the body of an indented standalone partial', () => {
    expect(out('Z\n   {{> p}}\nA\n')).toBe('Z\n   PA\n   PB\nA\n');
  });
});
