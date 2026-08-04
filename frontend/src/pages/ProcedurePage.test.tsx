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
    { stage: 'MANAGER_SELECTION', order: 2, branch: null, status: 'NOT_STARTED',
      startedOn: null, completedOn: null, note: null,
      current: true, editable: true, statutoryBasis: 'ст. 213.4, 213.9 127-ФЗ (ПЛЕЙСХОЛДЕР)' },
    { stage: 'DOCUMENT_PREPARATION', order: 3, branch: null, status: 'IN_PROGRESS',
      startedOn: null, completedOn: null, note: null,
      current: false, editable: false, statutoryBasis: 'ст. 213.4 127-ФЗ (ПЛЕЙСХОЛДЕР)' },
    // Derived from the payments step since AI-021, so the backend sends editable: false.
    { stage: 'FEES_AND_DEPOSIT', order: 4, branch: null, status: 'NOT_STARTED',
      startedOn: null, completedOn: null, note: null,
      current: false, editable: false, statutoryBasis: 'ст. 213.4 127-ФЗ (ПЛЕЙСХОЛДЕР)' },
    // Derived from the submission step since AI-022, so the backend sends editable: false.
    { stage: 'FILING', order: 5, branch: null, status: 'NOT_STARTED',
      startedOn: null, completedOn: null, note: null,
      current: false, editable: false, statutoryBasis: 'ст. 213.4 127-ФЗ (ПЛЕЙСХОЛДЕР)' },
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
  currentStage: 'PROPERTY_INVENTORY',
  stages: [
    ...JOURNEY_COMMON.stages.slice(0, 6).map((s) => ({ ...s, status: 'DONE', current: false })),
    // The realization branch is its own three-stage sequence (AI-024):
    { stage: 'PROPERTY_INVENTORY', order: 10, branch: 'REALIZATION', status: 'IN_PROGRESS',
      startedOn: null, completedOn: null, note: null,
      current: true, editable: true, statutoryBasis: 'ст. 213.26 127-ФЗ (ПЛЕЙСХОЛДЕР)' },
    { stage: 'PROPERTY_REALIZATION', order: 11, branch: 'REALIZATION', status: 'NOT_STARTED',
      startedOn: null, completedOn: null, note: null,
      current: false, editable: true, statutoryBasis: 'ст. 213.26 127-ФЗ (ПЛЕЙСХОЛДЕР)' },
    { stage: 'CREDITOR_PAYOUTS', order: 12, branch: 'REALIZATION', status: 'NOT_STARTED',
      startedOn: null, completedOn: null, note: null,
      current: false, editable: true, statutoryBasis: 'ст. 213.27 127-ФЗ (ПЛЕЙСХОЛДЕР)' },
    { stage: 'CREDITOR_CLAIMS', order: 20, branch: null, status: 'NOT_STARTED',
      startedOn: null, completedOn: null, note: null,
      current: false, editable: true, statutoryBasis: 'ст. 213.7, 213.8 127-ФЗ (ПЛЕЙСХОЛДЕР)' },
    { stage: 'COMPLETION', order: 21, branch: null, status: 'NOT_STARTED',
      startedOn: null, completedOn: null, note: null,
      current: false, editable: true, statutoryBasis: 'ст. 213.28, 213.30 127-ФЗ (ПЛЕЙСХОЛДЕР)' },
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

/**
 * Formats money the way the component does. ru-RU groups thousands with a non-breaking space,
 * which Testing Library collapses to an ordinary one in the DOM text but NOT in the string it is
 * matched against — so the expectation has to be normalised here or nothing ever matches.
 */
function money(value: number): string {
  const formatted = value.toLocaleString('ru-RU',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${formatted} ₽`.replace(/[\u00a0\u202f]/g, ' ');
}

/** No hearing recorded is the common case — matches what the backend sends for an empty section. */
const NO_HEARINGS = { key: 'COURT_HEARINGS', order: 20, repeatable: true, fields: [], data: null, issues: [] };

/** No claim filed is the common case early in the procedure. */
const NO_CLAIMS = { key: 'FILED_CLAIMS', order: 22, repeatable: true, fields: [], data: null, issues: [] };

/** No manager correspondence recorded is the common case — matches what the backend sends for an empty section. */
const NO_CORRESPONDENCE = { key: 'MANAGER_CORRESPONDENCE', order: 23, repeatable: true, fields: [], data: null, issues: [] };

/** No ЕФРСБ publication recorded yet — nothing to compute a deadline from (backlog AI-025). */
const NO_DEADLINE = { publicationDate: null, deadlineDate: null, daysFromPublication: 60, confirmed: false };

function stubFetch(routes: { match: (url: string, init?: RequestInit) => boolean; status: number; body: unknown }[]) {
  const calls: { url: string; method: string; body?: string }[] = [];
  // The page loads the journey, the fees, the hearings, the claim deadline, the filed claims,
  // and the manager correspondence together; tests that don't care about any of these get them
  // for free, and can still override by declaring their own route first.
  const withDefaults = [...routes,
    { match: (url: string) => url.endsWith('/fees'), status: 200, body: FEES },
    { match: (url: string) => url.endsWith('/sections/COURT_HEARINGS'), status: 200, body: NO_HEARINGS },
    { match: (url: string) => url.endsWith('/claim-deadline'), status: 200, body: NO_DEADLINE },
    { match: (url: string) => url.endsWith('/sections/FILED_CLAIMS'), status: 200, body: NO_CLAIMS },
    { match: (url: string) => url.endsWith('/sections/MANAGER_CORRESPONDENCE'), status: 200, body: NO_CORRESPONDENCE }];
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

function renderAtProcedure() {
  localStorage.setItem('restart.accessToken', 'access-1');
  localStorage.setItem('restart.refreshToken', 'refresh-1');
  return render(
    <MemoryRouter initialEntries={['/procedure']}>
      <Routes>
        <Route path="/procedure" element={<ProcedurePage />} />
        <Route path="/journey" element={<p>journey-map</p>} />
        <Route path="/manager" element={<p>manager-screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Reads one stage row by its position in the fixture's stages array. */
function stageRow(container: HTMLElement, index: number): HTMLElement {
  const rows = container.querySelectorAll('.procedure-list > li');
  return rows[index] as HTMLElement;
}

/**
 * The card inside one stage row — the row itself, except for stages that link to a screen of
 * their own, where the card is the link inside the row. Highlight classes live on the card.
 */
function stageCard(container: HTMLElement, index: number): HTMLElement {
  const row = stageRow(container, index);
  return row.classList.contains('procedure-stage')
    ? row
    : row.querySelector('.procedure-stage') as HTMLElement;
}

describe('ProcedurePage', () => {
  it('shows what the filing costs, flagged as a draft while amounts are unreviewed', async () => {
    stubFetch([
      { match: (url) => url.endsWith('/cases/current'), status: 200, body: CASE },
      { match: (url) => url.endsWith('/journey'), status: 200, body: JOURNEY_COMMON },
    ]);
    renderAtProcedure();

    expect(await screen.findByText(money(300))).toBeInTheDocument();
    expect(screen.getByText(money(25000))).toBeInTheDocument();
    expect(screen.getByText(money(25300))).toBeInTheDocument();
    // Unconfirmed figures must never look authoritative — the user might go and pay them.
    // (Queried by text, not role: the page-level «Черновик» badge is a note too.)
    expect(screen.getByText(/Суммы черновые/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Отметить оплату/ }))
      .toHaveAttribute('href', '/journey/PAYMENTS');
  });

  it('drops the draft warning once the amounts are confirmed', async () => {
    stubFetch([
      { match: (url) => url.endsWith('/cases/current'), status: 200, body: CASE },
      { match: (url) => url.endsWith('/journey'), status: 200, body: JOURNEY_COMMON },
      { match: (url) => url.endsWith('/fees'), status: 200, body: {
        ...FEES,
        lines: FEES.lines.map((l) => ({ ...l, confirmed: true })),
        allConfirmed: true,
      } },
    ]);
    renderAtProcedure();

    expect(await screen.findByText(money(25300))).toBeInTheDocument();
    expect(screen.queryByText(/Суммы черновые/)).not.toBeInTheDocument();
  });

  it('sends the manager stage on to its own step-by-step screen', async () => {
    stubFetch([
      { match: (url) => url.endsWith('/cases/current'), status: 200, body: CASE },
      { match: (url) => url.endsWith('/journey'), status: 200, body: JOURNEY_COMMON },
    ]);
    const user = userEvent.setup();
    renderAtProcedure();

    // The stage is three actions weeks apart, so the card links out instead of expanding —
    // and offers no way to record the stage here.
    const link = await screen.findByRole('link', { name: /Поиск финансового управляющего/ });
    expect(link).toHaveAttribute('href', '/manager');
    expect(screen.queryByRole('button', { name: /Поиск финансового управляющего/ }))
      .not.toBeInTheDocument();

    await user.click(link);
    expect(await screen.findByText('manager-screen')).toBeInTheDocument();
  });

  it('sends the filing stage on to the step that records submission', async () => {
    stubFetch([
      { match: (url) => url.endsWith('/cases/current'), status: 200, body: CASE },
      { match: (url) => url.endsWith('/journey'), status: 200, body: JOURNEY_COMMON },
    ]);
    renderAtProcedure();

    // FILING is derived (not current, not editable), so its link is on screen without a click.
    const link = await screen.findByRole('link', { name: /Отметить подачу/ });
    expect(link).toHaveAttribute('href', '/journey/FILING_SUBMISSION');
  });

  it('shows both COURT_DECISION detail links, and the nearest upcoming hearing even collapsed', async () => {
    const futureHearings = {
      key: 'COURT_HEARINGS', order: 20, repeatable: true, fields: [],
      data: [
        { date: '2099-03-15', subject: 'Рассмотрение обоснованности заявления' },
        { date: '2099-01-01', subject: 'Более раннее заседание' },
      ],
      issues: [],
    };
    stubFetch([
      { match: (url) => url.endsWith('/cases/current'), status: 200, body: CASE },
      { match: (url) => url.endsWith('/journey'), status: 200, body: JOURNEY_COMMON },
      { match: (url) => url.endsWith('/sections/COURT_HEARINGS'), status: 200, body: futureHearings },
    ]);
    const user = userEvent.setup();
    renderAtProcedure();

    // Prominent even before the card is expanded — the earlier of the two future hearings wins.
    expect(await screen.findByText(/Ближайшее заседание: 01\.01\.2099 — Более раннее заседание/))
      .toBeInTheDocument();

    // COURT_DECISION is editable, so its links live in the collapsible body.
    await user.click(screen.getByRole('button', { name: /Решение суда/ }));

    expect(screen.getByRole('link', { name: /Дело в суде/ }))
      .toHaveAttribute('href', '/journey/COURT_CASE');
    expect(screen.getByRole('link', { name: /Заседания/ }))
      .toHaveAttribute('href', '/journey/COURT_HEARINGS');
  });

  it('shows no upcoming-hearing line when nothing is recorded or every hearing is past', async () => {
    stubFetch([
      { match: (url) => url.endsWith('/cases/current'), status: 200, body: CASE },
      { match: (url) => url.endsWith('/journey'), status: 200, body: JOURNEY_COMMON },
      // Falls back to the stub helper's default: COURT_HEARINGS section with no data at all.
    ]);
    renderAtProcedure();

    await screen.findByText('Весь путь');
    expect(screen.queryByText(/Ближайшее заседание/)).not.toBeInTheDocument();
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
      ['Поиск финансового управляющего', 'Не начато'],
      ['Подготовка документов', 'В процессе'],
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
    const current = stageCard(container, 1);
    expect(current.className).toContain('procedure-stage-current');
    expect(current.querySelector('.procedure-current-badge')).toHaveTextContent('Сейчас');
    [0, 2, 3, 4, 5, 6, 7].forEach((index) => {
      expect(stageCard(container, index).className).not.toContain('procedure-stage-current');
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
    const docPrepLink = screen.getByRole('link', { name: /Подготовка документов/ });
    expect(docPrepLink).toHaveAttribute('href', '/journey');

    await user.click(docPrepLink);
    expect(await screen.findByText('journey-map')).toBeInTheDocument();
  });

  it('records a stage through the PUT endpoint and re-renders with the new status', async () => {
    const updated = {
      ...JOURNEY_COMMON,
      stages: JOURNEY_COMMON.stages.map((s) =>
        s.stage === 'COURT_DECISION' ? { ...s, status: 'IN_PROGRESS' } : s),
    };
    const calls = stubFetch([
      { match: (url) => url.endsWith('/cases/current'), status: 200, body: CASE },
      { match: (url, init) => url.endsWith('/case-1/journey') && init?.method !== 'PUT',
        status: 200, body: JOURNEY_COMMON },
      { match: (url, init) => url.endsWith('/journey/COURT_DECISION') && init?.method === 'PUT',
        status: 200, body: updated },
    ]);
    const user = userEvent.setup();
    const { container } = renderAtProcedure();

    await screen.findByText('Весь путь');
    await user.click(screen.getByRole('button', { name: /Решение суда/ }));
    await user.selectOptions(await screen.findByRole('combobox'), 'IN_PROGRESS');
    await user.click(screen.getByRole('button', { name: 'Записать' }));

    const putCall = calls.find((c) => c.method === 'PUT');
    expect(putCall?.url).toContain('/cases/case-1/journey/COURT_DECISION');
    expect(JSON.parse(putCall!.body!)).toEqual({
      status: 'IN_PROGRESS', startedOn: null, completedOn: null, note: null,
    });

    // The panel closes and the badge reflects the recorded status.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    const row = stageRow(container, 5);
    expect(row.querySelector('.procedure-status')?.textContent?.trim()).toBe('В процессе');
  });

  it('shows the branch stage only once the court procedure is recorded', async () => {
    stubFetch([
      { match: (url) => url.endsWith('/cases/current'), status: 200, body: CASE },
      { match: (url) => url.endsWith('/case-1/journey'), status: 200, body: JOURNEY_REALIZATION },
    ]);
    renderAtProcedure();

    // The realization branch's own stages appear...
    expect(await screen.findByText('Опись имущества')).toBeInTheDocument();
    expect(screen.getByText('Продажа имущества')).toBeInTheDocument();
    expect(screen.getByText('Расчёты с кредиторами')).toBeInTheDocument();
    // ...and neither of the other two branches leaks in:
    expect(screen.queryByText('План выплат')).not.toBeInTheDocument();
    expect(screen.queryByText('Утверждение соглашения')).not.toBeInTheDocument();
    // The chosen procedure is named at the top:
    expect(screen.getByText(/Ваша процедура: Реализация имущества/)).toBeInTheDocument();
  });

  it('records the court procedure from the decision stage and reveals that branch', async () => {
    const calls = stubFetch([
      { match: (url) => url.endsWith('/cases/current'), status: 200, body: CASE },
      { match: (url, init) => url.endsWith('/procedure-type') && init?.method === 'PUT',
        status: 200, body: JOURNEY_REALIZATION },
      // First load: common path, court not yet decided. After the PUT the page re-renders from
      // the response, so this only needs to answer the initial GET.
      { match: (url) => url.endsWith('/case-1/journey'), status: 200, body: JOURNEY_COMMON },
    ]);
    const user = userEvent.setup();
    renderAtProcedure();

    await user.click(await screen.findByRole('button', { name: /Решение суда/ }));
    await user.click(screen.getByRole('button', { name: /Реализация имущества/ }));

    const put = calls.find((c) => c.method === 'PUT' && c.url.endsWith('/procedure-type'));
    expect(put).toBeDefined();
    expect(JSON.parse(put!.body as string)).toEqual({ procedureType: 'REALIZATION' });
    // The response's branch is now on screen:
    expect(await screen.findByText('Опись имущества')).toBeInTheDocument();
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

  it('shows the claim-filing deadline, a flagged summary, and both CREDITOR_CLAIMS detail links', async () => {
    const deadline = {
      publicationDate: '2026-06-01', deadlineDate: '2026-07-31',
      daysFromPublication: 60, confirmed: false,
    };
    const claims = {
      key: 'FILED_CLAIMS', order: 22, repeatable: true, fields: [],
      data: [
        { creditorName: 'Банк А', amount: 100000, filedOn: '2026-08-15', disputed: false },
        { creditorName: 'Банк Б', amount: 50000, filedOn: '2026-07-10', disputed: true },
      ],
      issues: [],
    };
    stubFetch([
      { match: (url) => url.endsWith('/cases/current'), status: 200, body: CASE },
      { match: (url) => url.endsWith('/journey'), status: 200, body: JOURNEY_COMMON },
      { match: (url) => url.endsWith('/claim-deadline'), status: 200, body: deadline },
      { match: (url) => url.endsWith('/sections/FILED_CLAIMS'), status: 200, body: claims },
    ]);
    const user = userEvent.setup();
    renderAtProcedure();

    // Prominent even before the card is expanded, mirroring the upcoming-hearing line:
    expect(await screen.findByText(/Срок предъявления требований: 31\.07\.2026/))
      .toBeInTheDocument();
    expect(screen.getByText(/Срок черновой, уточните на сайте суда\/в реестре/))
      .toBeInTheDocument();
    // One claim filed after the deadline, one disputed — flagged calmly, not as an error:
    expect(screen.getByText(/Есть требования с пометками: 1 позднее срока, 1 оспаривается/))
      .toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Требования кредиторов/ }));

    expect(screen.getByRole('link', { name: /Публикация в реестре/ }))
      .toHaveAttribute('href', '/journey/EFRSB_PUBLICATION');
    expect(screen.getByRole('link', { name: /Требования кредиторов/ }))
      .toHaveAttribute('href', '/journey/FILED_CLAIMS');
  });

  it('shows nothing for the claim deadline when no publication date is recorded', async () => {
    stubFetch([
      { match: (url) => url.endsWith('/cases/current'), status: 200, body: CASE },
      { match: (url) => url.endsWith('/journey'), status: 200, body: JOURNEY_COMMON },
      // Falls back to the stub helper's defaults: no deadline, no filed claims.
    ]);
    renderAtProcedure();

    await screen.findByText('Весь путь');
    expect(screen.queryByText(/Срок предъявления требований/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Есть требования с пометками/)).not.toBeInTheDocument();
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

  it('shows the most recent manager correspondence on the MANAGER_SELECTION card', async () => {
    const correspondence = {
      key: 'MANAGER_CORRESPONDENCE', order: 23, repeatable: true, fields: [],
      data: [
        { date: '2026-07-10', type: 'Письмо' },
        { date: '2026-07-20', type: 'Отчёт' },
      ],
      issues: [],
    };
    stubFetch([
      { match: (url) => url.endsWith('/cases/current'), status: 200, body: CASE },
      { match: (url) => url.endsWith('/journey'), status: 200, body: JOURNEY_COMMON },
      { match: (url) => url.endsWith('/sections/MANAGER_CORRESPONDENCE'), status: 200, body: correspondence },
    ]);
    renderAtProcedure();

    // Prominent even before the card is expanded, showing the newest date first:
    expect(await screen.findByText(/Последняя запись: 20\.07\.2026 — Отчёт/))
      .toBeInTheDocument();
  });
});
