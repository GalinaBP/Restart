import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import EligibilityPage from './EligibilityPage';

function mockCheckResponse(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/check']}>
      <EligibilityPage />
    </MemoryRouter>,
  );
}

async function answerAllQuestionsAsFitting(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'От 500 тысяч до 3 миллионов' }));
  await user.click(screen.getByRole('button', { name: 'Да, только это' }));
  for (let i = 0; i < 6; i += 1) {
    await user.click(screen.getByRole('button', { name: 'Нет' }));
  }
}

describe('EligibilityPage', () => {
  it('walks one question per screen and shows the fitting verdict', async () => {
    mockCheckResponse({ decision: 'SELF_SERVICE_OK', reasons: [] });
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText('Сколько ты всего должен?')).toBeInTheDocument();
    // One question per screen: while on the debt question, no yes/no buttons are shown.
    expect(screen.queryByRole('button', { name: 'Нет' })).not.toBeInTheDocument();

    await answerAllQuestionsAsFitting(user);

    expect(await screen.findByText('Отлично! Твой случай подходит')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('shows honest reasons when the case needs a lawyer', async () => {
    mockCheckResponse({
      decision: 'NEEDS_LAWYER',
      reasons: ['Машина — это имущество, которое суд будет оценивать отдельно.'],
    });
    const user = userEvent.setup();
    renderPage();

    await answerAllQuestionsAsFitting(user);

    expect(await screen.findByText('Скажем честно: тебе лучше с юристом')).toBeInTheDocument();
    expect(
      screen.getByText('Машина — это имущество, которое суд будет оценивать отдельно.'),
    ).toBeInTheDocument();
  });

  it('supports going back to the previous question', async () => {
    mockCheckResponse({ decision: 'SELF_SERVICE_OK', reasons: [] });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'До 500 тысяч' }));
    expect(screen.getByText(/кредиты, карты, микрозаймы/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '← Назад' }));
    expect(screen.getByText('Сколько ты всего должен?')).toBeInTheDocument();
  });
});
