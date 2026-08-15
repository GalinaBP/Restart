import { describe, expect, it } from 'vitest';
import templates from '../generated/templates.json';
import { CASE_DATA_SECTIONS, documentLabel, fieldLabel, sectionLabel, stageLabel } from '../api/labels';
import { FEES, SECTIONS, STAGES, section, stagesFor } from './rules';
import { derivedStageKeys, journeyStatusOf } from './journey';
import type { StoredCase } from './store';

const EMPTY_CASE: StoredCase = {
  id: 'case-1',
  caseType: 'PERSONAL_BANKRUPTCY',
  status: 'DRAFT',
  procedureType: null,
  sections: {},
  journey: {},
  createdAt: '2026-08-15T00:00:00.000Z',
  updatedAt: '2026-08-15T00:00:00.000Z',
};

describe('the generated rules and the screens that read them', () => {
  it('has a label for every section and every one of its fields', () => {
    for (const definition of SECTIONS) {
      expect(sectionLabel(definition.key).title, `section ${definition.key}`)
        .toBeTruthy();
      for (const field of definition.fields) {
        expect(fieldLabel(definition.key, field.name), `${definition.key}.${field.name}`)
          .toBeTruthy();
      }
    }
  });

  it('only lists sections in the wizard that the rules actually define', () => {
    for (const key of CASE_DATA_SECTIONS) {
      expect(section(key), `CASE_DATA_SECTIONS names ${key}`).toBeDefined();
    }
  });

  it('has a label for every journey stage', () => {
    for (const definition of STAGES) {
      expect(stageLabel(definition.key).title, `stage ${definition.key}`).toBeTruthy();
    }
  });

  it('has a derivation rule for every stage marked derived', () => {
    const derived = STAGES.filter((stage) => stage.derived).map((stage) => stage.key);

    expect([...derived].sort()).toEqual([...derivedStageKeys()].sort());
    for (const key of derived) {
      expect(() => journeyStatusOf(key, EMPTY_CASE, false, false)).not.toThrow();
    }
  });

  it('shows each procedure branch as one continuous path with unique positions', () => {
    for (const branch of ['RESTRUCTURING', 'REALIZATION', 'SETTLEMENT'] as const) {
      const orders = stagesFor(branch).map((stage) => stage.order);

      expect(orders, `branch ${branch}`).toEqual([...new Set(orders)]);
      expect(orders, `branch ${branch}`).toEqual([...orders].sort((a, b) => a - b));
    }
  });

  it('has a label and a template for every document in the filing package', () => {
    for (const { type, templateName } of templates.documents) {
      expect(documentLabel(type).title, `document ${type}`).toBeTruthy();
      expect(templates.sources[templateName as keyof typeof templates.sources], templateName)
        .toBeTruthy();
    }
  });

  it('keeps every fee amount a plain two-decimal string, not a float', () => {
    for (const line of FEES.items) {
      expect(typeof line.amount, `fee ${line.key}`).toBe('string');
      expect(line.amount, `fee ${line.key}`).toMatch(/^\d+\.\d{2}$/);
    }
  });

  it('marks the sections the filing cannot be built without', () => {
    const mandatory = SECTIONS.filter((definition) => definition.mandatory)
      .map((definition) => definition.key);

    expect(mandatory).toEqual([
      'PERSONAL_DETAILS',
      'PASSPORT',
      'REGISTRATION_ADDRESS',
      'CONTACT_INFO',
      'EMPLOYMENT',
      'MONTHLY_INCOME',
      'MARITAL_STATUS',
      'CREDITORS',
      'MANAGER_SRO',
    ]);
  });
});
