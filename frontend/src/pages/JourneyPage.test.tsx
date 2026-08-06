import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import JourneyPage from './JourneyPage';

const CASE = { id: 'case-1', caseType: 'PERSONAL_BANKRUPTCY', status: 'IN_PROGRESS' };
const STEPS = [
  { key: 'PERSONAL_DETAILS', order: 1, repeatable: false, filled: true },
  { key: 'PASSPORT', order: 2, repeatable: false, filled: false },
  { key: 'CREDITORS', order: 9, repeatable: true, filled: false },
];

function stubFetch(routes: Record<string, { status: number; body: unknown }>) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const match = Object.entries(routes).find(([suffix]) => url.includes(suffix));
    if (!match) throw new Error(`Unexpected fetch: ${url}`);
    return new Response(JSON.stringify(match[1].body), { status: match[1].status });
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

function renderSignedIn() {
  localStorage.setItem('restart.accessToken', 'access-1');
  localStorage.setItem('restart.refreshToken', 'refresh-1');
  render(
    <MemoryRouter initialEntries={['/journey']}>
      <JourneyPage />
    </MemoryRouter>,
  );
}

describe('JourneyPage', () => {
  it('offers to start a case when none exists, then shows the journey map', async () => {
    stubFetch({
      '/cases/current': {
        status: 404,
        body: { status: 404, code: 'RESOURCE_NOT_FOUND', message: 'У вас пока нет начатого дела' },
      },
    });
    renderSignedIn();

    expect(await screen.findByText('Начнём ваше дело')).toBeInTheDocument();

    stubFetch({
      '/cases/case-1/sections': { status: 200, body: STEPS },
      '/cases': { status: 201, body: CASE },
    });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Поехали' }));

    expect(await screen.findByText('Информация о вас')).toBeInTheDocument();
  });

  it('shows progress and points «Продолжить» at the first unfilled step', async () => {
    stubFetch({
      '/cases/current': { status: 200, body: CASE },
      '/cases/case-1/sections': { status: 200, body: STEPS },
    });
    renderSignedIn();

    expect(await screen.findByText('Заполнено 1 из 3. Продолжайте — всё сохраняется сразу.'))
      .toBeInTheDocument();
    // All the data steps now live behind one page, so «Продолжить» opens that.
    expect(screen.getByRole('link', { name: 'Продолжить' }))
      .toHaveAttribute('href', '/journey/all');
    expect(screen.getByText('Документы, которые нужно подготовить самостоятельно'))
      .toBeInTheDocument();
  });

  it('asks whether the user works, and lists the papers that answer proves', async () => {
    stubFetch({
      '/cases/current': { status: 200, body: CASE },
      '/cases/case-1/sections': { status: 200, body: STEPS },
    });
    const user = userEvent.setup();
    renderSignedIn();

    // Everyone needs these, so they are on screen before anything is asked.
    expect(await screen.findByText('Паспорт')).toBeInTheDocument();
    // Nothing about income is guessed for the user.
    expect(screen.getByText('Вы сейчас работаете?')).toBeInTheDocument();
    expect(screen.queryByText('Трудовая книжка')).not.toBeInTheDocument();
    expect(screen.queryByText('Справка из центра занятости')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Работаю' }));
    expect(screen.getByText('Трудовая книжка')).toBeInTheDocument();
    expect(screen.getByText('Справки о доходах (2-НДФЛ) за три года')).toBeInTheDocument();
    expect(screen.queryByText('Справка из центра занятости')).not.toBeInTheDocument();

    // The answer can be corrected — the other branch replaces the first, never adds to it.
    await user.click(screen.getByRole('button', { name: 'Не работаю' }));
    expect(screen.getByText('Справка из центра занятости')).toBeInTheDocument();
    expect(screen.getByText('Выписка из трудовой книжки')).toBeInTheDocument();
    expect(screen.queryByText('Трудовая книжка')).not.toBeInTheDocument();
    expect(screen.queryByText('Справки о доходах (2-НДФЛ) за три года')).not.toBeInTheDocument();
  });

  it('links up to the stage overview (AI-019)', async () => {
    stubFetch({
      '/cases/current': { status: 200, body: CASE },
      '/cases/case-1/sections': { status: 200, body: STEPS },
    });
    renderSignedIn();

    expect(await screen.findByRole('link', { name: 'Весь путь' })).toHaveAttribute('href', '/procedure');
  });
});
