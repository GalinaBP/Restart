import { beforeEach, describe, expect, it, vi } from 'vitest';
import { seedCase, signIn } from '../test/localCase';
import { importServerCaseOnce, resetServerImportForTests } from './serverImport';
import { loadCase } from './store';

const REMOTE_CASE = { id: 'server-case-1', caseType: 'PERSONAL_BANKRUPTCY', status: 'IN_PROGRESS' };

const OVERVIEW = [
  { key: 'PERSONAL_DETAILS', order: 1, repeatable: false, filled: true },
  { key: 'CREDITORS', order: 10, repeatable: true, filled: true },
  { key: 'VEHICLES', order: 13, repeatable: true, filled: false },
];

const PERSONAL = { data: { lastName: 'Иванова', firstName: 'Анна' } };
const CREDITORS = { data: [{ name: 'ПАО «Банк Восход»', debtAmount: 1000000 }] };

const JOURNEY = {
  procedureType: 'REALIZATION',
  currentStage: 'PROPERTY_INVENTORY',
  stages: [
    { stage: 'SCREENING', status: 'DONE', startedOn: null, completedOn: null, note: null, editable: false },
    { stage: 'COURT_DECISION', status: 'DONE', startedOn: '2026-07-01', completedOn: '2026-07-05', note: 'принято', editable: true },
    { stage: 'COMPLETION', status: 'NOT_STARTED', startedOn: null, completedOn: null, note: null, editable: true },
  ],
};

function stubServer(routes: Record<string, { status: number; body: unknown }>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const match = Object.entries(routes).find(([suffix]) => url.endsWith(suffix));
    if (!match) {
      throw new Error(`Unexpected fetch: ${url}`);
    }
    return new Response(JSON.stringify(match[1].body), { status: match[1].status });
  });
}

const FULL_SERVER = {
  '/cases/current': { status: 200, body: REMOTE_CASE },
  '/cases/server-case-1/sections': { status: 200, body: OVERVIEW },
  '/sections/PERSONAL_DETAILS': { status: 200, body: PERSONAL },
  '/sections/CREDITORS': { status: 200, body: CREDITORS },
  '/journey': { status: 200, body: JOURNEY },
};

beforeEach(() => {
  resetServerImportForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the one-time import of a case still held on the server', () => {
  it('pulls the answers and the recorded stages onto the device', async () => {
    signIn();
    vi.stubGlobal('fetch', stubServer(FULL_SERVER));

    await importServerCaseOnce();

    expect(await loadCase()).toMatchObject({
      id: 'server-case-1',
      status: 'IN_PROGRESS',
      procedureType: 'REALIZATION',
      sections: {
        PERSONAL_DETAILS: PERSONAL.data,
        CREDITORS: CREDITORS.data,
      },
      journey: {
        COURT_DECISION: {
          status: 'DONE', startedOn: '2026-07-01', completedOn: '2026-07-05', note: 'принято',
        },
      },
    });
  });

  it('leaves derived and untouched stages out of the recorded journey', async () => {
    signIn();
    vi.stubGlobal('fetch', stubServer(FULL_SERVER));

    await importServerCaseOnce();

    expect(Object.keys((await loadCase())?.journey ?? {})).toEqual(['COURT_DECISION']);
  });

  it('runs at most once, even across several calls', async () => {
    signIn();
    const fetchMock = stubServer(FULL_SERVER);
    vi.stubGlobal('fetch', fetchMock);

    await importServerCaseOnce();
    resetServerImportForTests();
    await importServerCaseOnce();

    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/cases/current')))
      .toHaveLength(1);
  });

  it('never overwrites a case the device already has', async () => {
    signIn();
    await seedCase({ sections: { PERSONAL_DETAILS: { lastName: 'Петрова' } } });
    vi.stubGlobal('fetch', stubServer(FULL_SERVER));

    await importServerCaseOnce();

    expect((await loadCase())?.sections.PERSONAL_DETAILS).toEqual({ lastName: 'Петрова' });
  });

  it('does nothing at all for a visitor who is not signed in', async () => {
    const fetchMock = stubServer(FULL_SERVER);
    vi.stubGlobal('fetch', fetchMock);

    await importServerCaseOnce();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await loadCase()).toBeUndefined();
  });

  it('stops asking once the server says there is no case', async () => {
    signIn();
    const fetchMock = stubServer({
      '/cases/current': {
        status: 404,
        body: { status: 404, code: 'RESOURCE_NOT_FOUND', message: 'У вас пока нет начатого дела' },
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    await importServerCaseOnce();
    resetServerImportForTests();
    await importServerCaseOnce();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await loadCase()).toBeUndefined();
  });

  it('keeps the door open after a network failure instead of losing the case', async () => {
    signIn();
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('network down'))));

    await importServerCaseOnce();

    resetServerImportForTests();
    vi.stubGlobal('fetch', stubServer(FULL_SERVER));
    await importServerCaseOnce();

    expect((await loadCase())?.sections.PERSONAL_DETAILS).toEqual(PERSONAL.data);
  });
});
