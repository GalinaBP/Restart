import { isSignedIn } from '../api/auth';
import { ApiError, request } from '../api/client';
import { loadCase, saveCase, type StoredCase, type StoredStage } from './store';
import type { SectionPayload } from './types';

const MARKER = 'restart.serverCaseImported';

interface RemoteCase {
  id: string;
  status: StoredCase['status'];
}

interface RemoteSectionStatus {
  key: string;
  filled: boolean;
}

interface RemoteSection {
  data: SectionPayload | null;
}

interface RemoteStage {
  stage: string;
  status: StoredStage['status'];
  startedOn: string | null;
  completedOn: string | null;
  note: string | null;
  editable: boolean;
}

interface RemoteJourney {
  stages: RemoteStage[];
  procedureType: StoredCase['procedureType'];
}

let running: Promise<void> | null = null;

export function importServerCaseOnce(): Promise<void> {
  if (running === null) {
    running = run();
  }
  return running;
}

export function resetServerImportForTests(): void {
  running = null;
}

async function run(): Promise<void> {
  if (localStorage.getItem(MARKER) === 'done' || !isSignedIn()) {
    return;
  }
  if (await loadCase()) {
    markDone();
    return;
  }
  try {
    const remote = await request<RemoteCase>('/cases/current');
    await saveCase(await pull(remote), new Date());
  } catch (error) {
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
      markDone();
    }
    return;
  }
  markDone();
}

async function pull(remote: RemoteCase): Promise<StoredCase> {
  const overview = await request<RemoteSectionStatus[]>(`/cases/${remote.id}/sections`);
  const sections: Record<string, SectionPayload> = {};
  for (const status of overview.filter((section) => section.filled)) {
    const section = await request<RemoteSection>(`/cases/${remote.id}/sections/${status.key}`);
    if (section.data !== null) {
      sections[status.key] = section.data;
    }
  }

  const journey = await pullJourney(remote.id);
  const now = new Date().toISOString();
  return {
    id: remote.id,
    caseType: 'PERSONAL_BANKRUPTCY',
    status: remote.status,
    procedureType: journey.procedureType,
    sections,
    journey: journey.recorded,
    createdAt: now,
    updatedAt: now,
  };
}

async function pullJourney(caseId: string): Promise<{
  procedureType: StoredCase['procedureType'];
  recorded: Record<string, StoredStage>;
}> {
  try {
    const journey = await request<RemoteJourney>(`/cases/${caseId}/journey`);
    const recorded: Record<string, StoredStage> = {};
    for (const stage of journey.stages) {
      if (stage.editable && stage.status !== 'NOT_STARTED') {
        recorded[stage.stage] = {
          status: stage.status,
          startedOn: stage.startedOn,
          completedOn: stage.completedOn,
          note: stage.note,
        };
      }
    }
    return { procedureType: journey.procedureType, recorded };
  } catch {
    return { procedureType: null, recorded: {} };
  }
}

function markDone(): void {
  localStorage.setItem(MARKER, 'done');
}
