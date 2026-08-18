import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';
import { parse } from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const RULES = join(REPO, 'rules');
const OUT = join(HERE, '..', 'src', 'generated');

const FIELD_TYPES = ['STRING', 'BOOLEAN', 'INTEGER', 'MONEY', 'DATE',
  'PASSPORT_SERIES', 'PASSPORT_NUMBER', 'INN'];
const BRANCHES = ['ALL', 'RESTRUCTURING', 'REALIZATION', 'SETTLEMENT'];

function fail(resource, message) {
  throw new Error(`${resource}: ${message}`);
}

function yml(...parts) {
  return parse(readFileSync(join(RULES, ...parts), 'utf8'));
}

function requireText(resource, value, what) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(resource, `${what} is missing`);
  }
  return value;
}

function requireWholeNumber(resource, value, what) {
  if (!Number.isInteger(value)) {
    fail(resource, `${what} must be a whole number, got ${JSON.stringify(value)}`);
  }
  return value;
}

function requireUnique(resource, values, what) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      fail(resource, `duplicate ${what} ${value}`);
    }
    seen.add(value);
  }
}

function byOrder(a, b) {
  return a.order - b.order;
}

function sections() {
  const resource = 'rules/sections.yml';
  const parsed = yml('sections.yml').sections;
  if (!Array.isArray(parsed) || parsed.length === 0) {
    fail(resource, 'no sections configured');
  }
  requireUnique(resource, parsed.map((section) => section.key), 'section');

  return parsed
    .map((section) => {
      const key = requireText(resource, section.key, 'section key');
      requireText(resource, section.statutoryBasis, `section ${key} statutoryBasis`);
      requireWholeNumber(resource, section.order, `section ${key} order`);
      if (!Array.isArray(section.fields) || section.fields.length === 0) {
        fail(resource, `section ${key} has no fields`);
      }
      const fields = section.fields.map((field) => {
        const name = requireText(resource, field.name, `a field name in section ${key}`);
        if (!FIELD_TYPES.includes(field.type)) {
          fail(resource, `field ${key}.${name} has unknown type ${field.type}`);
        }
        return { name, type: field.type, required: Boolean(field.required) };
      });
      requireUnique(resource, fields.map((field) => field.name), `field in section ${key}`);

      const uniqueBy = section.uniqueBy ?? [];
      const known = new Set(fields.map((field) => field.name));
      for (const name of uniqueBy) {
        if (!known.has(name)) {
          fail(resource, `section ${key} uniqueBy references unknown field ${name}`);
        }
      }
      if (uniqueBy.length > 0 && !section.repeatable) {
        fail(resource, `section ${key} is not repeatable, so uniqueBy means nothing`);
      }

      return {
        key,
        order: section.order,
        repeatable: Boolean(section.repeatable),
        mandatory: Boolean(section.mandatory),
        uniqueBy,
        fields,
      };
    })
    .sort(byOrder);
}

function journey() {
  const resource = 'rules/journey.yml';
  const parsed = yml('journey.yml').stages;
  if (!Array.isArray(parsed) || parsed.length === 0) {
    fail(resource, 'no stages configured');
  }
  requireUnique(resource, parsed.map((stage) => stage.key), 'stage');

  return parsed
    .map((stage) => {
      const key = requireText(resource, stage.key, 'stage key');
      requireText(resource, stage.statutoryBasis, `stage ${key} statutoryBasis`);
      requireWholeNumber(resource, stage.order, `stage ${key} order`);
      if (!BRANCHES.includes(stage.branch)) {
        fail(resource, `stage ${key} has unknown branch ${stage.branch}`);
      }
      return {
        key,
        order: stage.order,
        branch: stage.branch === 'ALL' ? null : stage.branch,
        derived: Boolean(stage.derived),
        statutoryBasis: stage.statutoryBasis,
      };
    })
    .sort(byOrder);
}

function fees() {
  const resource = 'rules/fees.yml';
  const parsed = yml('fees.yml');
  requireText(resource, parsed.effectiveFrom, 'effectiveFrom');
  if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
    fail(resource, 'no items configured');
  }
  requireUnique(resource, parsed.items.map((item) => item.key), 'fee');

  return {
    effectiveFrom: parsed.effectiveFrom,
    items: parsed.items.map((item) => {
      const key = requireText(resource, item.key, 'fee key');
      requireText(resource, item.statutoryBasis, `fee ${key} statutoryBasis`);
      if (typeof item.amount === 'number') {
        fail(resource, `amount of ${key} must be quoted in the YAML so it is not parsed as a`
          + ` floating-point number — write amount: "${item.amount.toFixed(2)}"`);
      }
      requireText(resource, item.amount, `fee ${key} amount`);
      if (!/^\d+(\.\d{1,2})?$/.test(item.amount)) {
        fail(resource, `amount of ${key} is not a plain rouble amount: ${item.amount}`);
      }
      return {
        key,
        amount: item.amount,
        confirmed: Boolean(item.confirmed),
        statutoryBasis: item.statutoryBasis,
      };
    }),
  };
}

function courts() {
  const resource = 'rules/courts.yml';
  const parsed = yml('courts.yml').courts;
  if (!Array.isArray(parsed) || parsed.length === 0) {
    fail(resource, 'no courts configured');
  }
  return parsed.map((entry) => {
    const court = requireText(resource, entry.court, 'a court name');
    if (!Array.isArray(entry.keywords) || entry.keywords.length === 0) {
      fail(resource, `court ${court} has no keywords`);
    }
    return {
      court,
      keywords: entry.keywords.map((keyword) => keyword.toLowerCase().replaceAll('ё', 'е')),
    };
  });
}

function claimDeadline() {
  const resource = 'rules/claim-deadline.yml';
  const parsed = yml('claim-deadline.yml');
  requireText(resource, parsed.statutoryBasis, 'statutoryBasis');
  requireWholeNumber(resource, parsed.daysFromPublication, 'daysFromPublication');
  return {
    daysFromPublication: parsed.daysFromPublication,
    confirmed: Boolean(parsed.confirmed),
  };
}

function templates() {
  const resource = 'rules/doctemplates/manifest.yml';
  const manifest = yml('doctemplates', 'manifest.yml');
  const activeVersion = requireText(resource, manifest.activeVersion, 'activeVersion');
  if (!Array.isArray(manifest.documents) || manifest.documents.length === 0) {
    fail(resource, 'no documents configured');
  }
  requireUnique(resource, manifest.documents.map((document) => document.type), 'document type');

  const documents = manifest.documents.map((document) => ({
    type: requireText(resource, document.type, 'a document type'),
    templateName: requireText(resource, document.template,
      `template of ${document.type}`),
  }));

  const sources = {};
  const names = [...documents.map((document) => document.templateName),
    ...(manifest.partials ?? [])];
  for (const name of names) {
    const path = join(RULES, 'doctemplates', activeVersion, `${name}.mustache`);
    if (!existsSync(path)) {
      fail(resource, `template file missing: ${activeVersion}/${name}.mustache`);
    }
    sources[name] = readFileSync(path, 'utf8');
  }
  for (const [name, source] of Object.entries(sources)) {
    for (const [, referenced] of source.matchAll(/\{\{>\s*([^}\s]+)\s*\}\}/g)) {
      if (sources[referenced] === undefined) {
        fail(resource, `${name}.mustache pulls in the partial ${referenced},`
          + ' which the manifest does not list');
      }
    }
  }

  return { activeVersion, documents, sources };
}

const FONT_RANGES = [
  [0x0020, 0x007e],
  [0x00a0, 0x00ff],
  [0x0100, 0x017f],
  [0x0400, 0x04ff],
  [0x0500, 0x052f],
  [0x2010, 0x205e],
  [0x20a0, 0x20bf],
  [0x2116, 0x2116],
];

function keptCharacters() {
  let text = '';
  for (const [first, last] of FONT_RANGES) {
    for (let codePoint = first; codePoint <= last; codePoint += 1) {
      text += String.fromCodePoint(codePoint);
    }
  }
  return text;
}

async function font() {
  const full = readFileSync(join(RULES, 'fonts', 'DejaVuSansMono.ttf'));
  return subsetFont(full, keptCharacters(), { targetFormat: 'truetype' });
}

function write(name, value) {
  writeFileSync(join(OUT, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

mkdirSync(OUT, { recursive: true });
write('sections.json', sections());
write('journey.json', journey());
write('fees.json', fees());
write('courts.json', courts());
write('claim-deadline.json', claimDeadline());
write('templates.json', templates());
writeFileSync(join(OUT, 'DejaVuSansMono.ttf'), await font());

process.stdout.write(`Wrote rule assets to ${OUT}\n`);
