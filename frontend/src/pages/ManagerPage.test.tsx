import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import ManagerPage from './ManagerPage';

const CASE = { id: 'case-1', caseType: 'PERSONAL_BANKRUPTCY', status: 'IN_PROGRESS' };

const JOURNEY = {
  procedureType: null,
  currentStage: 'MANAGER_SELECTION',
  stages: [
    { stage: 'MANAGER_SELECTION', order: 2, branch: null, status: 'NOT_STARTED',
      startedOn: null, completedOn: null, note: null,
      current: true, editable: true, statutoryBasis: 'ст. 213.4, 213.9 127-ФЗ (ПЛЕЙСХОЛДЕР)' },
  ],
};

const EMPTY_LOG = { key: 'MANAGER_CORRESPONDENCE', order: 23, repeatable: true, fields: [], data: null, issues: [] };

function stubFetch(routes: { match: (url: string, init?: RequestInit) => boolean; status: number; body: unknown }[]) {
  const calls: { url: string; method: string; body?: string }[] = [];
  // The screen loads the journey and the correspondence journal; tests that don't care
  // about one get it empty for free, and can still override by declaring their own route first.
  const withDefaults = [...routes,
    { match: (url: string) => url.endsWith('/cases/current'), status: 200, body: CASE },
    { match: (url: string) => url.endsWith('/journey'), status: 200, body: JOURNEY },
    { match: (url: string) => url.endsWith('/sections/MANAGER_CORRESPONDENCE'), status: 200, body: EMPTY_LOG }];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, method: init?.method ?? 'GET', body: init?.body as string | undefined });
    const match = withDefaults.find((r) => r.match(url, init));
    if (!match) throw new Error(`Unexpected fetch: ${init?.method ?? 'GET'} ${url}`);
    return new Response(JSON.stringify(match.body), { status: match.status });
  }));
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

function renderAtManager() {
  localStorage.setItem('restart.accessToken', 'access-1');
  localStorage.setItem('restart.refreshToken', 'refresh-1');
  return render(
    <MemoryRouter initialEntries={['/manager']}>
      <Routes>
        <Route path="/manager" element={<ManagerPage />} />
        <Route path="/journey/MANAGER_SRO" element={<p>sro-step</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ManagerPage', () => {
  it('shows the loading state, then the one action the stage asks for', async () => {
    stubFetch([]);
    renderAtManager();

    expect(screen.getByText('Секунду…')).toBeInTheDocument();

    expect(await screen.findByText('Поиск финансового управляющего')).toBeInTheDocument();
    expect(screen.getByText('Черновик — проверяется юристом')).toBeInTheDocument();

    // Why a manager is needed at all, then the single action: naming the organisation.
    expect(screen.getByText('Зачем нужен финансовый управляющий')).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: 'Указать организацию' });
    expect(cta).toHaveAttribute('href', '/journey/MANAGER_SRO');

    // The how-to lives on the step itself, next to the fields — not repeated before the button.
    expect(screen.queryByText('Как выбрать эту организацию?')).not.toBeInTheDocument();
    // Paying the deposit belongs to «Пошлина и депозит» and is not asked for a second time here.
    expect(screen.queryByRole('link', { name: /Отметить оплату/ })).not.toBeInTheDocument();
  });

  it('explains why a manager is needed, and leaves the money to the fees screen', async () => {
    stubFetch([]);
    renderAtManager();

    await screen.findByText('Поиск финансового управляющего');
    expect(screen.getByText('Зачем нужен финансовый управляющий')).toBeInTheDocument();
    expect(screen.getByText(/обязательный участник процедуры банкротства/)).toBeInTheDocument();
    // Amounts live on «Пошлина и депозит»; this screen names no sum, so none can go stale here.
    expect(screen.queryByText(/₽/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Сумма черновая/)).not.toBeInTheDocument();
  });

  it('records the appointment on the stage itself', async () => {
    const done = {
      ...JOURNEY,
      stages: JOURNEY.stages.map((s) => ({ ...s, status: 'DONE', completedOn: '2026-08-04' })),
    };
    const calls = stubFetch([
      { match: (url, init) => url.endsWith('/journey/MANAGER_SELECTION') && init?.method === 'PUT',
        status: 200, body: done },
    ]);
    const user = userEvent.setup();
    renderAtManager();

    await screen.findByText('Поиск финансового управляющего');
    await user.selectOptions(screen.getByRole('combobox'), 'DONE');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    const put = calls.find((c) => c.method === 'PUT');
    expect(put?.url).toContain('/cases/case-1/journey/MANAGER_SELECTION');
    expect(JSON.parse(put!.body!)).toEqual({
      status: 'DONE', startedOn: null, completedOn: null, note: null,
    });
  });

  it('offers no way to record a stage the backend derives', async () => {
    stubFetch([
      { match: (url) => url.endsWith('/journey'), status: 200, body: {
        ...JOURNEY,
        stages: JOURNEY.stages.map((s) => ({ ...s, editable: false })),
      } },
    ]);
    renderAtManager();

    await screen.findByText('Поиск финансового управляющего');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText('Когда управляющего утвердят')).not.toBeInTheDocument();
  });

  it('shows the newest correspondence entry and leads to the journal', async () => {
    stubFetch([
      { match: (url) => url.endsWith('/sections/MANAGER_CORRESPONDENCE'), status: 200, body: {
        ...EMPTY_LOG,
        data: [{ date: '2026-07-10', type: 'Письмо' }, { date: '2026-07-20', type: 'Отчёт' }],
      } },
    ]);
    renderAtManager();

    expect(await screen.findByText(/Последняя запись: 20\.07\.2026 — Отчёт/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Открыть журнал/ }))
      .toHaveAttribute('href', '/journey/MANAGER_CORRESPONDENCE');
  });

  it('shows the failure state and recovers on retry', async () => {
    stubFetch([
      { match: (url) => url.endsWith('/journey'), status: 500,
        body: { status: 500, code: 'UNKNOWN', message: 'boom' } },
    ]);
    const user = userEvent.setup();
    renderAtManager();

    expect(await screen.findByText('Что-то пошло не так')).toBeInTheDocument();

    stubFetch([]);
    await user.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByText('Поиск финансового управляющего')).toBeInTheDocument();
  });
});
