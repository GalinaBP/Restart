import { CLAIM_DEADLINE, FEES, stage as stageDefinition, stagesFor } from './rules';
import { loadDocuments, requireCase, saveCase, type StoredCase, type StoredStage } from './store';
import type { ProcedureBranch, SectionEntry, SectionPayload } from './types';

export type JourneyStageKey = string;

export type StageStatusKey = StoredStage['status'];

export type { ProcedureBranch };

export interface JourneyStageView {
  stage: JourneyStageKey;
  order: number;
  branch: ProcedureBranch | null;
  status: StageStatusKey;
  startedOn: string | null;
  completedOn: string | null;
  note: string | null;
  current: boolean;
  editable: boolean;
  statutoryBasis: string;
}

export interface JourneyView {
  stages: JourneyStageView[];
  procedureType: ProcedureBranch | null;
  currentStage: JourneyStageKey | null;
}

export interface RecordStageInput {
  status: StageStatusKey;
  startedOn: string | null;
  completedOn: string | null;
  note: string | null;
}

export interface FeeLineView {
  item: string;
  amount: number;
  confirmed: boolean;
  statutoryBasis: string;
}

export interface FeeScheduleView {
  lines: FeeLineView[];
  total: number;
  allConfirmed: boolean;
  effectiveFrom: string;
}

export interface ClaimDeadlineView {
  publicationDate: string | null;
  deadlineDate: string | null;
  daysFromPublication: number;
  confirmed: boolean;
}

export class DerivedStageError extends Error {
  constructor(stage: string) {
    super(`Этот шаг «Рестарт» отмечает сам: ${stage}`);
    this.name = 'DerivedStageError';
  }
}

export async function getJourney(): Promise<JourneyView> {
  const bankruptcyCase = await requireCase();
  return journeyOf(bankruptcyCase, await anyDocumentsFresh(), await anyDocuments());
}

export async function recordStage(
  stage: JourneyStageKey,
  input: RecordStageInput,
): Promise<JourneyView> {
  const bankruptcyCase = await requireCase();
  const definition = stageDefinition(stage);
  if (!definition) {
    throw new Error(`Такого шага нет: ${stage}`);
  }
  if (definition.derived) {
    throw new DerivedStageError(stage);
  }
  const updated: StoredCase = {
    ...bankruptcyCase,
    journey: { ...bankruptcyCase.journey, [stage]: { ...input } },
  };
  await saveCase(updated, new Date());
  return journeyOf(updated, await anyDocumentsFresh(), await anyDocuments());
}

export async function recordProcedureType(
  procedureType: ProcedureBranch | null,
): Promise<JourneyView> {
  const bankruptcyCase = await requireCase();
  const updated: StoredCase = { ...bankruptcyCase, procedureType };
  await saveCase(updated, new Date());
  return journeyOf(updated, await anyDocumentsFresh(), await anyDocuments());
}

export async function getFees(): Promise<FeeScheduleView> {
  await requireCase();
  return {
    lines: FEES.items.map((line) => ({
      item: line.key,
      amount: Number(line.amount),
      confirmed: line.confirmed,
      statutoryBasis: line.statutoryBasis,
    })),
    total: FEES.items.reduce((sum, line) => sum + Number(line.amount), 0),
    allConfirmed: FEES.items.every((line) => line.confirmed),
    effectiveFrom: FEES.effectiveFrom,
  };
}

export async function getClaimDeadline(): Promise<ClaimDeadlineView> {
  const bankruptcyCase = await requireCase();
  const publicationDate = text(single(bankruptcyCase.sections.EFRSB_PUBLICATION),
    'publicationDate');
  return {
    publicationDate: publicationDate === '' ? null : publicationDate,
    deadlineDate: publicationDate === ''
      ? null
      : plusDays(publicationDate, CLAIM_DEADLINE.daysFromPublication),
    daysFromPublication: CLAIM_DEADLINE.daysFromPublication,
    confirmed: CLAIM_DEADLINE.confirmed,
  };
}

function journeyOf(
  bankruptcyCase: StoredCase,
  documentsReady: boolean,
  documentsExist: boolean,
): JourneyView {
  const stages: JourneyStageView[] = [];
  let current: JourneyStageKey | null = null;

  for (const definition of stagesFor(bankruptcyCase.procedureType)) {
    const recorded = bankruptcyCase.journey[definition.key];
    const status = definition.derived
      ? journeyStatusOf(definition.key, bankruptcyCase, documentsReady, documentsExist)
      : recorded?.status ?? 'NOT_STARTED';
    const isCurrent = current === null && status !== 'DONE';
    if (isCurrent) {
      current = definition.key;
    }
    stages.push({
      stage: definition.key,
      order: definition.order,
      branch: definition.branch,
      status,
      startedOn: recorded?.startedOn ?? null,
      completedOn: recorded?.completedOn ?? null,
      note: recorded?.note ?? null,
      current: isCurrent,
      editable: !definition.derived,
      statutoryBasis: definition.statutoryBasis,
    });
  }

  return { stages, procedureType: bankruptcyCase.procedureType, currentStage: current };
}

type Derivation = (
  bankruptcyCase: StoredCase,
  documentsReady: boolean,
  documentsExist: boolean,
) => StageStatusKey;

const DERIVATIONS: Record<string, Derivation> = {
  SCREENING: () => 'DONE',

  DOCUMENT_PREPARATION: (bankruptcyCase, documentsReady, documentsExist) => {
    if (documentsReady) {
      return 'DONE';
    }
    const anythingCollected = Object.keys(bankruptcyCase.sections).length > 0;
    return anythingCollected || documentsExist ? 'IN_PROGRESS' : 'NOT_STARTED';
  },

  FEES_AND_DEPOSIT: (bankruptcyCase) => {
    const payments = single(bankruptcyCase.sections.PAYMENTS);
    const duty = text(payments, 'stateDutyPaidOn') !== '';
    const deposit = text(payments, 'depositPaidOn') !== '';
    if (duty && deposit) {
      return 'DONE';
    }
    return duty || deposit ? 'IN_PROGRESS' : 'NOT_STARTED';
  },

  FILING: (bankruptcyCase) =>
    (text(single(bankruptcyCase.sections.FILING_SUBMISSION), 'submissionDate') !== ''
      ? 'DONE'
      : 'NOT_STARTED'),
};

export function derivedStageKeys(): string[] {
  return Object.keys(DERIVATIONS);
}

export function journeyStatusOf(
  stage: string,
  bankruptcyCase: StoredCase,
  documentsReady: boolean,
  documentsExist: boolean,
): StageStatusKey {
  const derivation = DERIVATIONS[stage];
  if (derivation === undefined) {
    throw new Error(`Stage ${stage} is marked derived but has no derivation rule`);
  }
  return derivation(bankruptcyCase, documentsReady, documentsExist);
}

async function anyDocuments(): Promise<boolean> {
  return (await loadDocuments()).length > 0;
}

async function anyDocumentsFresh(): Promise<boolean> {
  const documents = await loadDocuments();
  return documents.length > 0 && documents.every((document) => !document.stale);
}

function single(payload: SectionPayload | undefined): SectionEntry | undefined {
  return payload === undefined || Array.isArray(payload) ? undefined : payload;
}

function text(entry: SectionEntry | undefined, field: string): string {
  const value = entry?.[field];
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
}

function plusDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}
