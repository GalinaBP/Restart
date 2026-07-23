import { request } from './client';

/**
 * The stage overview of the court procedure (backlog AI-018/AI-019) — the map behind the stepper
 * screen at `/procedure`. Distinct from `cases.ts`'s section wizard: that is the questionnaire
 * *inside* the DOCUMENT_PREPARATION stage, this is every stage of the procedure around it.
 */

export type JourneyStageKey =
  | 'SCREENING'
  | 'DOCUMENT_PREPARATION'
  | 'MANAGER_SELECTION'
  | 'FEES_AND_DEPOSIT'
  | 'FILING'
  | 'COURT_DECISION'
  // One branch per procedure the court can apply (AI-024); only one is ever visible.
  | 'RESTRUCTURING_PLAN'
  | 'RESTRUCTURING_PLAN_APPROVAL'
  | 'RESTRUCTURING_EXECUTION'
  | 'PROPERTY_INVENTORY'
  | 'PROPERTY_REALIZATION'
  | 'CREDITOR_PAYOUTS'
  | 'SETTLEMENT_TERMS'
  | 'SETTLEMENT_AGREEMENT'
  | 'CREDITOR_CLAIMS'
  | 'COMPLETION';

export type StageStatusKey = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';

/** Only set on a stage once the court's chosen procedure applies to it (AI-024). */
export type ProcedureBranch = 'RESTRUCTURING' | 'REALIZATION' | 'SETTLEMENT';

export interface JourneyStageView {
  stage: JourneyStageKey;
  order: number;
  branch: ProcedureBranch | null;
  status: StageStatusKey;
  startedOn: string | null;
  completedOn: string | null;
  note: string | null;
  /** The one stage the user should look at right now. */
  current: boolean;
  /**
   * false for a stage whose status is derived from the case data itself (screening, document
   * preparation) — the backend refuses to let those be recorded by hand.
   */
  editable: boolean;
  /** 127-ФЗ traceability for the lawyer review only — never shown to the user. */
  statutoryBasis: string;
}

export interface JourneyView {
  stages: JourneyStageView[];
  /** null until the court has decided; only the common path is listed then. */
  procedureType: ProcedureBranch | null;
  /** null once every stage is done. */
  currentStage: JourneyStageKey | null;
}

export interface RecordStageInput {
  status: StageStatusKey;
  startedOn: string | null;
  completedOn: string | null;
  note: string | null;
}

/** What the filing costs (backlog AI-021); amounts come from the backend's fees.yml. */
export interface FeeLineView {
  item: 'STATE_DUTY' | 'MANAGER_DEPOSIT';
  amount: number;
  /** false while the amount is an unreviewed placeholder — must be shown as a draft. */
  confirmed: boolean;
  /** For the lawyer review only — never shown to the user. */
  statutoryBasis: string;
}

export interface FeeScheduleView {
  lines: FeeLineView[];
  total: number;
  allConfirmed: boolean;
  effectiveFrom: string;
}

export function getJourney(caseId: string): Promise<JourneyView> {
  return request<JourneyView>(`/cases/${caseId}/journey`);
}

export function getFees(caseId: string): Promise<FeeScheduleView> {
  return request<FeeScheduleView>(`/cases/${caseId}/fees`);
}

/**
 * Records which procedure the court applied, switching the journey to that branch (AI-024).
 * `null` clears it and returns the case to the common path — the user may have recorded the
 * wrong one, and the app never guesses the court's decision.
 */
export function recordProcedureType(
  caseId: string,
  procedureType: ProcedureBranch | null,
): Promise<JourneyView> {
  return request<JourneyView>(`/cases/${caseId}/journey/procedure-type`, {
    method: 'PUT',
    body: { procedureType },
  });
}

/** Records where an editable stage stands. 409s if the stage is derived. */
export function recordStage(
  caseId: string,
  stage: JourneyStageKey,
  input: RecordStageInput,
): Promise<JourneyView> {
  return request<JourneyView>(`/cases/${caseId}/journey/${stage}`, {
    method: 'PUT',
    body: input,
  });
}
