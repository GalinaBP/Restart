import claimDeadlineJson from '../generated/claim-deadline.json';
import courtsJson from '../generated/courts.json';
import feesJson from '../generated/fees.json';
import journeyJson from '../generated/journey.json';
import sectionsJson from '../generated/sections.json';
import type {
  FeeItem, FeeSchedule, ProcedureBranch, SectionDefinition, StageDefinition,
} from './types';

export const SECTIONS = sectionsJson as SectionDefinition[];

export const STAGES = journeyJson as StageDefinition[];

export const FEES = feesJson as FeeSchedule;

export const CLAIM_DEADLINE = claimDeadlineJson as {
  daysFromPublication: number;
  confirmed: boolean;
};

const COURTS = courtsJson as { court: string; keywords: string[] }[];

export const COURT_PLACEHOLDER = 'Арбитражный суд по месту регистрации должника — [УТОЧНЯЕТСЯ]';

export function section(key: string): SectionDefinition | undefined {
  return SECTIONS.find((definition) => definition.key === key);
}

export function stage(key: string): StageDefinition | undefined {
  return STAGES.find((definition) => definition.key === key);
}

export function stagesFor(procedure: ProcedureBranch | null): StageDefinition[] {
  return STAGES.filter((definition) => definition.branch === null
    || definition.branch === procedure);
}

export function feeLine(item: FeeItem): FeeSchedule['items'][number] {
  const line = FEES.items.find((candidate) => candidate.key === item);
  if (!line) {
    throw new Error(`No fee configured for ${item}`);
  }
  return line;
}

export function feeTotal(): number {
  return FEES.items.reduce((sum, line) => sum + Number(line.amount), 0);
}

export function feesAllConfirmed(): boolean {
  return FEES.items.every((line) => line.confirmed);
}

export function courtFor(regionFreeText: string): string | null {
  if (!regionFreeText.trim()) {
    return null;
  }
  const haystack = normalize(regionFreeText);
  for (const entry of COURTS) {
    if (entry.keywords.some((keyword) => haystack.includes(keyword))) {
      return entry.court;
    }
  }
  return null;
}

function normalize(text: string): string {
  return text.toLowerCase().replaceAll('ё', 'е');
}
