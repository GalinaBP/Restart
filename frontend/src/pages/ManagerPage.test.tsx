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

/** Amounts are unreviewed placeholders in fees.yml, so allConfirmed is false (AI-021). */
const FEES = {
  lines: [
    { item: 'STATE_DUTY', amount: 300, confirmed: false, statutoryBasis: 'ст. 333.21 НК РФ (ПЛЕЙСХОЛДЕР)' },
    { item: 'MANAGER_DEPOSIT', amount: 25000, confirmed: false, statutoryBasis: 'ст. 20.6 127-ФЗ (ПЛЕЙСХОЛДЕР)' },
  ],
  total: 25300,
  allConfirmed: false,
  effectiveFrom: '2026-06-21',
};

const EMPTY_SRO = { key: 'MANAGER_SRO', order: 16, repeatable: false, fields: [], data: null, issues: [] };
const EMPTY_PAYMENTS = { key: 'PAYMENTS', order: 17, repeatable: false, fields: [], data: null, issues: [] };
const EMPTY_LOG = { key: 'MANAGER_CORRESPONDENCE', order: 23, repeatable: true, fields: [], data: null, issues: [] };

function stubFetch(routes: { match: (url: string, init?: RequestInit) => boolean; status: number; body: unknown }[]) {
  const calls: { url: string; method: string; body?: string }[] = [];
  // The screen loads the journey, the fees and three sections together; tests that don't care
  // about one get it empty for free, and can still override by declaring their own route first.
  const withDefaults = [...routes,
    { match: (url: string) => url.endsWith('/cases/current'), status: 200, body: CASE },
    { match: (url: string) => url.endsWith('/journey'), status: 200, body: JOURNEY },
    { match: (url: string) => url.endsWith('/fees'), status: 200, body: FEES },
    { match: (url: string) => url.endsWith('/sections/MANAGER_SRO'), status: 200, body: EMPTY_SRO },
    { match: (url: string) => url.endsWith('/sections/PAYMENTS'), status: 200, body: EMPTY_PAYMENTS },
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
  it('shows the loading state, then the three steps with the first one as the next action', async () => {
    stubFetch([]);
    const { container } = renderAtManager();

    expect(screen.getByText('Секунду…')).toBeInTheDocument();

    expect(await screen.findByText('Поиск финансового управляющего')).toBeInTheDocument();
    expect(screen.getByText('Черновик — проверяется юристом')).toBeInTheDocument();

    const steps = container.querySelectorAll('.manager-steps > li');
    expect(steps).toHaveLength(3);
    expect(steps[0].textContent).toContain('Выбрать организацию');
    expect(steps[1].textContent).toContain('Внести деньги на работу управляющего');
    expect(steps[2].textContent).toContain('Дождаться, когда управляющего утвердят');

    // Nothing is done yet, and only the first unfinished step is highlighted.
    expect(screen.getByText('Пройдено 0 из 3. Шаги идут по порядку, спешить некуда.'))
      .toBeInTheDocument();
    expect(steps[0].className).toContain('procedure-stage-current');
    expect(steps[1].className).not.toContain('procedure-stage-current');

    // One action offered at the top — the next step, per the one-action rule.
    const cta = screen.getByRole('link', { name: 'Указать организацию' });
    expect(cta).toHaveAttribute('href', '/journey/MANAGER_SRO');
  });

  it('substitutes the deposit amount from fees.yml and flags it as a draft', async () => {
    stubFetch([]);
    renderAtManager();

    await screen.findByText('Поиск финансового управляющего');
    // The copy carries a placeholder, never a number of its own — 25 000,00 ₽ comes from fees.yml.
    // (ru-RU groups with a non-breaking space, which the DOM text keeps.)
    expect(screen.getByText(/25\s000,00 ₽ на депозит суда/)).toBeInTheDocument();
    expect(screen.queryByText('{managerDeposit}')).not.toBeInTheDocument();
    expect(screen.getAllByText(/Сумма черновая/).length).toBeGreaterThan(0);
  });

  it('closes the steps that the case data already answers and moves the next action on', async () => {
    stubFetch([
      { match: (url) => url.endsWith('/sections/MANAGER_SRO'), status: 200,
        body: { ...EMPTY_SRO, data: { name: 'СРО «Содействие»', address: 'г. Москва' } } },
    ]);
    const { container } = renderAtManager();

    await screen.findByText('Поиск финансового управляющего');
    expect(screen.getByText('Пройдено 1 из 3. Шаги идут по порядку, спешить некуда.'))
      .toBeInTheDocument();

    const steps = container.querySelectorAll('.manager-steps > li');
    expect(steps[0].className).toContain('procedure-stage-done');
    expect(steps[1].className).toContain('procedure-stage-current');
    expect(screen.getByRole('link', { name: 'Отметить оплату' }))
      .toHaveAttribute('href', '/journey/PAYMENTS');
  });

  it('records the appointment on the stage itself and re-renders it as done', async () => {
    const done = {
      ...JOURNEY,
      stages: JOURNEY.stages.map((s) => ({ ...s, status: 'DONE', completedOn: '2026-08-04' })),
    };
    const calls = stubFetch([
      { match: (url, init) => url.endsWith('/journey/MANAGER_SELECTION') && init?.method === 'PUT',
        status: 200, body: done },
    ]);
    const user = userEvent.setup();
    const { container } = renderAtManager();

    await screen.findByText('Поиск финансового управляющего');
    await user.selectOptions(screen.getByRole('combobox'), 'DONE');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    const put = calls.find((c) => c.method === 'PUT');
    expect(put?.url).toContain('/cases/case-1/journey/MANAGER_SELECTION');
    expect(JSON.parse(put!.body!)).toEqual({
      status: 'DONE', startedOn: null, completedOn: null, note: null,
    });

    // Only that step closes — the organisation and the deposit are still unanswered, and this
    // screen never guesses them from the stage status.
    const steps = container.querySelectorAll('.manager-steps > li');
    expect(steps[2].className).toContain('procedure-stage-done');
    expect(screen.getByText('Пройдено 1 из 3. Шаги идут по порядку, спешить некуда.'))
      .toBeInTheDocument();
  });

  it('says so plainly once every step of the stage is behind the user', async () => {
    stubFetch([
      { match: (url) => url.endsWith('/sections/MANAGER_SRO'), status: 200,
        body: { ...EMPTY_SRO, data: { name: 'СРО «Содействие»' } } },
      { match: (url) => url.endsWith('/sections/PAYMENTS'), status: 200,
        body: { ...EMPTY_PAYMENTS, data: { depositPaidOn: '2026-08-01' } } },
      { match: (url) => url.endsWith('/journey'), status: 200, body: {
        ...JOURNEY,
        stages: JOURNEY.stages.map((s) => ({ ...s, status: 'DONE' })),
      } },
    ]);
    renderAtManager();

    expect(await screen.findByText(/Все шаги этого этапа пройдены/)).toBeInTheDocument();
    // Nothing is asked of the user any more, so no «next action» button is offered.
    expect(screen.queryByRole('link', { name: 'Указать организацию' })).not.toBeInTheDocument();
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
