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

    expect(await screen.findByText('Немного о вас')).toBeInTheDocument();
  });

  it('shows progress and points «Продолжить» at the first unfilled step', async () => {
    stubFetch({
      '/cases/current': { status: 200, body: CASE },
      '/cases/case-1/sections': { status: 200, body: STEPS },
    });
    renderSignedIn();

    expect(await screen.findByText('Заполнено 1 из 3. Продолжайте — всё сохраняется сразу.'))
      .toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Продолжить' }))
      .toHaveAttribute('href', '/journey/PASSPORT');
    expect(screen.getByText('Кому и сколько вы должны')).toBeInTheDocument();
  });
});
