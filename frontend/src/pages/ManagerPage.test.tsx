import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import ManagerPage from './ManagerPage';

const CASE = { id: 'case-1', caseType: 'PERSONAL_BANKRUPTCY', status: 'IN_PROGRESS' };

const EMPTY_SRO = { key: 'MANAGER_SRO', order: 16, repeatable: false, fields: [], data: null, issues: [] };

function stubFetch(routes: { match: (url: string, init?: RequestInit) => boolean; status: number; body: unknown }[]) {
  const calls: { url: string; method: string; body?: string }[] = [];
  // The screen reads the case and the СРО step, nothing else; tests that don't care about one get
  // it empty for free, and can still override by declaring their own route first.
  const withDefaults = [...routes,
    { match: (url: string) => url.endsWith('/cases/current'), status: 200, body: CASE },
    { match: (url: string) => url.endsWith('/sections/MANAGER_SRO'), status: 200, body: EMPTY_SRO }];
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
  it('shows the loading state, then the one step the stage asks for', async () => {
    stubFetch([]);
    const { container } = renderAtManager();

    expect(screen.getByText('Секунду…')).toBeInTheDocument();

    expect(await screen.findByText('Поиск финансового управляющего')).toBeInTheDocument();
    expect(screen.getByText('Черновик — проверяется юристом')).toBeInTheDocument();

    // Why a manager is needed at all, then the single step: naming the organisation, shown as a
    // card that says whether it is behind the user.
    expect(screen.getByText('Зачем нужен финансовый управляющий')).toBeInTheDocument();
    const step = container.querySelector('.manager-steps > li') as HTMLElement;
    expect(step.textContent).toContain('Выбрать организацию');
    expect(step.querySelector('.procedure-status')?.textContent?.trim()).toBe('Не начато');
    expect(step.className).toContain('procedure-stage-current');
    expect(screen.getByRole('link', { name: /Указать организацию/ }))
      .toHaveAttribute('href', '/journey/MANAGER_SRO');

    // The how-to lives on the step itself, next to the fields — not repeated before the link.
    expect(screen.queryByText('Как выбрать эту организацию?')).not.toBeInTheDocument();
    // Paying the deposit belongs to «Пошлина и депозит» and is not asked for a second time here.
    expect(screen.queryByRole('link', { name: /Отметить оплату/ })).not.toBeInTheDocument();
  });

  it('leaves the stage status and the journal to «Весь путь»', async () => {
    stubFetch([]);
    renderAtManager();

    await screen.findByText('Поиск финансового управляющего');
    // Recording the appointment and keeping the correspondence journal belong to the stage card
    // on «Весь путь»; this screen is only the one action.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText('Когда управляющего утвердят')).not.toBeInTheDocument();
    expect(screen.queryByText('Переписка с управляющим')).not.toBeInTheDocument();
  });

  it('explains why a manager is needed, and leaves the money to the fees screen', async () => {
    stubFetch([]);
    renderAtManager();

    await screen.findByText('Поиск финансового управляющего');
    expect(screen.getByText(/обязательный участник процедуры банкротства/)).toBeInTheDocument();
    // Amounts live on «Пошлина и депозит»; this screen names no sum, so none can go stale here.
    expect(screen.queryByText(/₽/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Сумма черновая/)).not.toBeInTheDocument();
  });

  it('marks the step done once an organisation is named', async () => {
    stubFetch([
      { match: (url) => url.endsWith('/sections/MANAGER_SRO'), status: 200,
        body: { ...EMPTY_SRO, data: { name: 'СРО «Содействие»', address: 'г. Москва' } } },
    ]);
    const { container } = renderAtManager();

    await screen.findByText('Поиск финансового управляющего');
    const step = container.querySelector('.manager-steps > li') as HTMLElement;
    expect(step.querySelector('.procedure-status')?.textContent?.trim()).toBe('Готово');
    expect(step.className).toContain('procedure-stage-done');
  });

  it('does not count a blank organisation name as a filled-in step', async () => {
    stubFetch([
      { match: (url) => url.endsWith('/sections/MANAGER_SRO'), status: 200,
        body: { ...EMPTY_SRO, data: { name: '   ' } } },
    ]);
    const { container } = renderAtManager();

    await screen.findByText('Поиск финансового управляющего');
    const step = container.querySelector('.manager-steps > li') as HTMLElement;
    expect(step.querySelector('.procedure-status')?.textContent?.trim()).toBe('Не начато');
  });

  it('carries the return route into the step, so a clean save comes back here', async () => {
    stubFetch([]);
    const user = userEvent.setup();
    renderAtManager();

    await user.click(await screen.findByRole('link', { name: /Указать организацию/ }));
    expect(await screen.findByText('sro-step')).toBeInTheDocument();
  });

  it('shows the failure state and recovers on retry', async () => {
    stubFetch([
      { match: (url) => url.endsWith('/sections/MANAGER_SRO'), status: 500,
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
