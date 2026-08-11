import { request } from './client';

export type JourneyStageKey =
  | 'SCREENING'
  | 'DOCUMENT_PREPARATION'
  | 'MANAGER_SELECTION'
  | 'FEES_AND_DEPOSIT'
  | 'FILING'
  | 'COURT_DECISION'
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

export type ProcedureBranch = 'RESTRUCTURING' | 'REALIZATION' | 'SETTLEMENT';

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
  item: 'STATE_DUTY' | 'MANAGER_DEPOSIT';
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

export function getJourney(caseId: string): Promise<JourneyView> {
  return request<JourneyView>(`/cases/${caseId}/journey`);
}

export function getFees(caseId: string): Promise<FeeScheduleView> {
  return request<FeeScheduleView>(`/cases/${caseId}/fees`);
}

export function getClaimDeadline(caseId: string): Promise<ClaimDeadlineView> {
  return request<ClaimDeadlineView>(`/cases/${caseId}/claim-deadline`);
}

export function recordProcedureType(
  caseId: string,
  procedureType: ProcedureBranch | null,
): Promise<JourneyView> {
  return request<JourneyView>(`/cases/${caseId}/journey/procedure-type`, {
    method: 'PUT',
    body: { procedureType },
  });
}

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
