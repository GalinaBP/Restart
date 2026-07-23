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
  | 'RESTRUCTURING_PLAN'
  | 'PROPERTY_REALIZATION'
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

export function getJourney(caseId: string): Promise<JourneyView> {
  return request<JourneyView>(`/cases/${caseId}/journey`);
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
