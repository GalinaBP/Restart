import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const RESOURCES = join(REPO, 'src', 'main', 'resources');
const JAVA = join(REPO, 'src', 'main', 'java', 'ru', 'restart', 'app');
const OUT = join(HERE, '..', 'src', 'generated');

function yml(...parts) {
  return parse(readFileSync(join(RESOURCES, ...parts), 'utf8'));
}

function enumConstants(...parts) {
  const source = readFileSync(join(JAVA, ...parts), 'utf8');
  const body = source.slice(source.indexOf('{') + 1, source.lastIndexOf('}'));
  return body
    .split(/[,;]/)
    .map((entry) => entry.trim().match(/^([A-Z][A-Z0-9_]*)\b/))
    .filter(Boolean)
    .map((match) => match[1]);
}

function assertSameKeys(what, expected, actual) {
  const missing = expected.filter((key) => !actual.includes(key));
  const unknown = actual.filter((key) => !expected.includes(key));
  if (missing.length || unknown.length) {
    throw new Error(
      `${what} is out of sync with the Java enum` +
        (missing.length ? `; missing: ${missing.join(', ')}` : '') +
        (unknown.length ? `; unknown: ${unknown.join(', ')}` : ''),
    );
  }
}

function byOrder(a, b) {
  return a.order - b.order;
}

function sections() {
  const parsed = yml('casefile', 'sections.yml').sections;
  assertSameKeys(
    'sections.yml',
    enumConstants('casefile', 'domain', 'SectionKey.java'),
    parsed.map((section) => section.key),
  );
  return parsed
    .map((section) => ({
      key: section.key,
      order: section.order,
      repeatable: Boolean(section.repeatable),
      mandatory: Boolean(section.mandatory),
      uniqueBy: section.uniqueBy ?? [],
      fields: section.fields.map((field) => ({
        name: field.name,
        type: field.type,
        required: Boolean(field.required),
      })),
    }))
    .sort(byOrder);
}

function journey() {
  const parsed = yml('casefile', 'journey.yml').stages;
  assertSameKeys(
    'journey.yml',
    enumConstants('casefile', 'domain', 'JourneyStage.java'),
    parsed.map((stage) => stage.key),
  );
  return parsed
    .map((stage) => ({
      key: stage.key,
      order: stage.order,
      branch: stage.branch === 'ALL' ? null : stage.branch,
      derived: Boolean(stage.derived),
      statutoryBasis: stage.statutoryBasis,
    }))
    .sort(byOrder);
}

function fees() {
  const parsed = yml('casefile', 'fees.yml');
  assertSameKeys(
    'fees.yml',
    enumConstants('casefile', 'domain', 'FeeItem.java'),
    parsed.items.map((item) => item.key),
  );
  return {
    effectiveFrom: parsed.effectiveFrom,
    items: parsed.items.map((item) => ({
      key: item.key,
      amount: item.amount,
      confirmed: Boolean(item.confirmed),
      statutoryBasis: item.statutoryBasis,
    })),
  };
}

function courts() {
  return yml('casefile', 'courts.yml').courts.map((entry) => ({
    court: entry.court,
    keywords: entry.keywords.map((keyword) => keyword.toLowerCase().replaceAll('ё', 'е')),
  }));
}

function claimDeadline() {
  const parsed = yml('casefile', 'claim-deadline.yml');
  return {
    daysFromPublication: parsed.daysFromPublication,
    confirmed: Boolean(parsed.confirmed),
  };
}

function templates() {
  const activeVersion = yml('doctemplates', 'manifest.yml').activeVersion;
  const documentTypes = readFileSync(
    join(JAVA, 'doctemplate', 'api', 'DocumentType.java'),
    'utf8',
  );
  const names = [...documentTypes.matchAll(/\("([a-z_]+)"\)/g)].map((match) => match[1]);
  const partials = ['partials/applicant', 'partials/court_header', 'partials/draft_warning',
    'partials/signature'];
  const sources = {};
  for (const name of [...names, ...partials]) {
    sources[name] = readFileSync(
      join(RESOURCES, 'doctemplates', activeVersion, `${name}.mustache`),
      'utf8',
    );
  }
  return { activeVersion, documentTypes: names, sources };
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
copyFileSync(
  join(RESOURCES, 'fonts', 'DejaVuSansMono.ttf'),
  join(OUT, 'DejaVuSansMono.ttf'),
);

process.stdout.write(`Wrote rule assets to ${OUT}\n`);
