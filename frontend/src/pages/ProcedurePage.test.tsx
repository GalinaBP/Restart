import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import ProcedurePage from './ProcedurePage';

const CASE = { id: 'case-1', caseType: 'PERSONAL_BANKRUPTCY', status: 'IN_PROGRESS' };

/** Common path only — the court has not decided yet, so no branch-specific stage appears. */
const JOURNEY_COMMON = {
  procedureType: null,
  currentStage: 'MANAGER_SELECTION',
  stages: [
    { stage: 'SCREENING', order: 1, branch: null, status: 'DONE',
      startedOn: null, completedOn: null, note: null,
      current: false, editable: false, statutoryBasis: 'ст. 213.4 127-ФЗ (ПЛЕЙСХОЛДЕР)' },
    { stage: 'DOCUMENT_PREPARATION', order: 2, branch: null, status: 'IN_PROGRESS',
      startedOn: null, completedOn: null, note: null,
      current: false, editable: false, statutoryBasis: 'ст. 213.4 127-ФЗ (ПЛЕЙСХОЛДЕР)' },
    { stage: 'MANAGER_SELECTION', order: 3, branch: null, status: 'NOT_STARTED',
      startedOn: null, completedOn: null, note: null,
      current: true, editable: true, statutoryBasis: 'ст. 213.4, 213.9 127-ФЗ (ПЛЕЙСХОЛДЕР)' },
    { stage: 'FEES_AND_DEPOSIT', order: 4, branch: null, status: 'NOT_STARTED',
      startedOn: null, completedOn: null, note: null,
      current: false, editable: true, statutoryBasis: 'ст. 213.4 127-ФЗ (ПЛЕЙСХОЛДЕР)' },
    { stage: 'FILING', order: 5, branch: null, status: 'NOT_STARTED',
      startedOn: null, completedOn: null, note: null,
      current: false, editable: true, statutoryBasis: 'ст. 213.4 127-ФЗ (ПЛЕЙСХОЛДЕР)' },
    { stage: 'COURT_DECISION', order: 6, branch: null, status: 'NOT_STARTED',
      startedOn: null, completedOn: null, note: null,
      current: false, editable: true, statutoryBasis: 'ст. 213.6 127-ФЗ (ПЛЕЙСХОЛДЕР)' },
    { stage: 'CREDITOR_CLAIMS', order: 8, branch: null, status: 'BLOCKED',
      startedOn: null, completedOn: null, note: null,
      current: false, editable: true, statutoryBasis: 'ст. 213.7, 213.8 127-ФЗ (ПЛЕЙСХОЛДЕР)' },
    { stage: 'COMPLETION', order: 9, branch: null, status: 'NOT_STARTED',
      startedOn: null, completedOn: null, note: null,
      current: false, editable: true, statutoryBasis: 'ст. 213.28, 213.30 127-ФЗ (ПЛЕЙСХОЛДЕР)' },
  ],
};

/** The court chose REALIZATION — its branch stage appears, the other two branches don't. */
const JOURNEY_REALIZATION = {
  procedureType: 'REALIZATION',
  currentStage: 'PROPERTY_REALIZATION',
  stages: [
    ...JOURNEY_COMMON.stages.slice(0, 6).map((s) => ({ ...s, status: 'DONE', current: false })),
    { stage: 'PROPERTY_REALIZATION', order: 7, branch: 'REALIZATION', status: 'IN_PROGRESS',
      startedOn: null, completedOn: null, note: null,
      current: true, editable: true, statutoryBasis: 'ст. 213.24–213.27 127-ФЗ (ПЛЕЙСХОЛДЕР)' },
    { stage: 'CREDITOR_CLAIMS', order: 8, branch: null, status: 'NOT_STARTED',
      startedOn: null, completedOn: null, note: null,
      current: false, editable: true, statutoryBasis: 'ст. 213.7, 213.8 127-ФЗ (ПЛЕЙСХОЛДЕР)' },
    { stage: 'COMPLETION', order: 9, branch: null, status: 'NOT_STARTED',
      startedOn: null, completedOn: null, note: null,
      current: false, editable: true, statutoryBasis: 'ст. 213.28, 213.30 127-ФЗ (ПЛЕЙСХОЛДЕР)' },
  ],
};

function stubFetch(routes: { match: (url: string, init?: RequestInit) => boolean; status: number; body: unknown }[]) {
  const calls: { url: string; method: string; body?: string }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, method: init?.method ?? 'GET', body: init?.body as string | undefined });
    const match = routes.find((r) => r.match(url, init));
    if (!match) throw new Error(`Unexpected fetch: ${init?.method ?? 'GET'} ${url}`);
    return new Response(JSON.stringify(match.body), { status: match.status });
  }));
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

function renderAtProcedure() {
  localStorage.setItem('restart.accessToken', 'access-1');
  localStorage.setItem('restart.refreshToken', 'refresh-1');
  return render(
    <MemoryRouter initialEntries={['/procedure']}>
      <Routes>
        <Route path="/procedure" element={<ProcedurePage />} />
        <Route path="/journey" element={<p>journey-map</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Reads one stage row by its position in the fixture's stages array. */
function stageRow(container: HTMLElement, index: number): HTMLElement {
  const rows = container.querySelectorAll('.procedure-list > li');
  return rows[index] as HTMLElement;
}

describe('ProcedurePage', () => {
  it('sends the manager stage on to the step that collects the СРО', async () => {
    stubFetch([
      { match: (url) => url.endsWith('/cases/current'), status: 200, body: CASE },
      { match: (url) => url.endsWith('/journey'), status: 200, body: JOURNEY_COMMON },
    ]);
    renderAtProcedure();

    // MANAGER_SELECTION is the current stage, so it opens on load and its data step is right there:
    const link = await screen.findByRole('link', { name: /Указать организацию/ });
    expect(link).toHaveAttribute('href', '/journey/MANAGER_SRO');
  });

  it('shows the loading state, then every stage with its status, highlighting the current one', async () => {
    stubFetch([
      { match: (url) => url.endsWith('/cases/current'), status: 200, body: CASE },
      { match: (url) => url.endsWith('/case-1/journey'), status: 200, body: JOURNEY_COMMON },
    ]);
    const { container } = renderAtProcedure();

    // Still loading — the fetches haven't resolved on this tick yet.
    expect(screen.getByText('Секунду…')).toBeInTheDocument();

    expect(await screen.findByText('Весь путь')).toBeInTheDocument();
    expect(screen.getByText('Черновик — проверяется юристом')).toBeInTheDocument();

    const rows = [
      ['Проверка перед стартом', 'Готово'],
      ['Сбор документов', 'В процессе'],
      ['Выбор управляющего', 'Не начато'],
      ['Пошлина и депозит', 'Не начато'],
      ['Подача в суд', 'Не начато'],
      ['Решение суда', 'Не начато'],
      ['Требования кредиторов', 'Ждём'],
      ['Завершение', 'Не начато'],
    ];
    rows.forEach(([title, status], index) => {
      const row = stageRow(container, index);
      expect(row.querySelector('.procedure-stage-title')?.textContent).toContain(title);
      expect(row.querySelector('.procedure-status')?.textContent?.trim()).toBe(status);
    });

    // Only the current stage carries the highlight and the "Сейчас" badge.
    const current = stageRow(container, 2);
    expect(current.className).toContain('procedure-stage-current');
    expect(current.querySelector('.procedure-current-badge')).toHaveTextContent('Сейчас');
    [0, 1, 3, 4, 5, 6, 7].forEach((index) => {
      expect(stageRow(container, index).className).not.toContain('procedure-stage-current');
    });

    // Branch-specific stages don't show up before the court has decided.
    expect(screen.queryByText('План выплат')).not.toBeInTheDocument();
    expect(screen.queryByText('Продажа имущества')).not.toBeInTheDocument();
    expect(screen.queryByText('Договорённость с кредиторами')).not.toBeInTheDocument();
  });

  it('offers no way to edit derived stages, and links document preparation to its own screen', async () => {
    stubFetch([
      { match: (url) => url.endsWith('/cases/current'), status: 200, body: CASE },
      { match: (url) => url.endsWith('/case-1/journey'), status: 200, body: JOURNEY_COMMON },
    ]);
    const user = userEvent.setup();
    renderAtProcedure();

    await screen.findByText('Весь путь');

    // Screening is derived: no button to record it by hand.
    expect(screen.queryByRole('button', { name: /Проверка перед стартом/ })).not.toBeInTheDocument();

    // Document preparation is derived too, but already has a screen — a plain link there.
    const docPrepLink = screen.getByRole('link', { name: /Сбор документов/ });
    expect(docPrepLink).toHaveAttribute('href', '/journey');

    await user.click(docPrepLink);
    expect(await screen.findByText('journey-map')).toBeInTheDocument();
  });

  it('records a stage through the PUT endpoint and re-renders with the new status', async () => {
    const updated = {
      ...JOURNEY_COMMON,
      stages: JOURNEY_COMMON.stages.map((s) =>
        s.stage === 'MANAGER_SELECTION' ? { ...s, status: 'IN_PROGRESS' } : s),
    };
    const calls = stubFetch([
      { match: (url) => url.endsWith('/cases/current'), status: 200, body: CASE },
      { match: (url, init) => url.endsWith('/case-1/journey') && init?.method !== 'PUT',
        status: 200, body: JOURNEY_COMMON },
      { match: (url, init) => url.endsWith('/journey/MANAGER_SELECTION') && init?.method === 'PUT',
        status: 200, body: updated },
    ]);
    const user = userEvent.setup();
    const { container } = renderAtProcedure();

    // MANAGER_SELECTION is the current, editable stage — its form is already open.
    await screen.findByText('Весь путь');
    const select = await screen.findByRole('combobox');
    await user.selectOptions(select, 'IN_PROGRESS');
    await user.click(screen.getByRole('button', { name: 'Записать' }));

    const putCall = calls.find((c) => c.method === 'PUT');
    expect(putCall?.url).toContain('/cases/case-1/journey/MANAGER_SELECTION');
    expect(JSON.parse(putCall!.body!)).toEqual({
      status: 'IN_PROGRESS', startedOn: null, completedOn: null, note: null,
    });

    // The panel closes and the badge reflects the recorded status.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    const row = stageRow(container, 2);
    expect(row.querySelector('.procedure-status')?.textContent?.trim()).toBe('В процессе');
  });

  it('shows the branch stage only once the court procedure is recorded', async () => {
    stubFetch([
      { match: (url) => url.endsWith('/cases/current'), status: 200, body: CASE },
      { match: (url) => url.endsWith('/case-1/journey'), status: 200, body: JOURNEY_REALIZATION },
    ]);
    renderAtProcedure();

    expect(await screen.findByText('Продажа имущества')).toBeInTheDocument();
    expect(screen.queryByText('План выплат')).not.toBeInTheDocument();
    expect(screen.queryByText('Договорённость с кредиторами')).not.toBeInTheDocument();
  });

  it('explains a BLOCKED stage without it reading like an error', async () => {
    stubFetch([
      { match: (url) => url.endsWith('/cases/current'), status: 200, body: CASE },
      { match: (url) => url.endsWith('/case-1/journey'), status: 200, body: JOURNEY_COMMON },
    ]);
    const user = userEvent.setup();
    renderAtProcedure();

    await screen.findByText('Весь путь');
    await user.click(screen.getByRole('button', { name: /Требования кредиторов/ }));

    expect(screen.getByText('Пока не зависит от вас — ждём суд, управляющего или поступление денег.'))
      .toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the failure state and recovers on retry', async () => {
    stubFetch([
      { match: (url) => url.endsWith('/cases/current'), status: 200, body: CASE },
      { match: (url) => url.endsWith('/case-1/journey'), status: 500,
        body: { status: 500, code: 'UNKNOWN', message: 'boom' } },
    ]);
    const user = userEvent.setup();
    renderAtProcedure();

    expect(await screen.findByText('Что-то пошло не так')).toBeInTheDocument();

    stubFetch([
      { match: (url) => url.endsWith('/cases/current'), status: 200, body: CASE },
      { match: (url) => url.endsWith('/case-1/journey'), status: 200, body: JOURNEY_COMMON },
    ]);
    await user.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByText('Весь путь')).toBeInTheDocument();
  });
});
