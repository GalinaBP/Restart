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

/** Dismisses the consequences intro so the question flow begins. */
async function startCheck(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Понятно, продолжить' }));
}

async function answerAllQuestionsAsFitting(user: ReturnType<typeof userEvent.setup>) {
  await startCheck(user);
  await user.click(screen.getByRole('button', { name: 'От 500 тысяч до 3 миллионов' }));
  await user.click(screen.getByRole('button', { name: 'Да, только это' }));
  // Six current-asset questions plus the two forward-looking ones, all answered "Нет".
  for (let i = 0; i < 8; i += 1) {
    await user.click(screen.getByRole('button', { name: 'Нет' }));
  }
}

describe('EligibilityPage', () => {
  it('opens with the consequences checklist before any question', () => {
    mockCheckResponse({ decision: 'SELF_SERVICE_OK', reasons: [] });
    renderPage();

    expect(screen.getByText('Сначала — что важно знать')).toBeInTheDocument();
    expect(screen.getByText('Черновик — проверяется юристом')).toBeInTheDocument();
    expect(screen.getByText(/имущество, кроме единственного жилья/i)).toBeInTheDocument();
    // The question flow has not started yet.
    expect(screen.queryByText('Сколько вы всего должны?')).not.toBeInTheDocument();
  });

  it('walks one question per screen and shows the fitting verdict', async () => {
    mockCheckResponse({ decision: 'SELF_SERVICE_OK', reasons: [] });
    const user = userEvent.setup();
    renderPage();

    await startCheck(user);
    expect(screen.getByText('Сколько вы всего должны?')).toBeInTheDocument();
    // One question per screen: while on the debt question, no yes/no buttons are shown.
    expect(screen.queryByRole('button', { name: 'Нет' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'От 500 тысяч до 3 миллионов' }));
    await user.click(screen.getByRole('button', { name: 'Да, только это' }));
    for (let i = 0; i < 8; i += 1) {
      await user.click(screen.getByRole('button', { name: 'Нет' }));
    }

    expect(await screen.findByText('Отлично! Ваш случай подходит')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('asks the forward-looking business question', async () => {
    mockCheckResponse({ decision: 'SELF_SERVICE_OK', reasons: [] });
    const user = userEvent.setup();
    renderPage();

    await startCheck(user);
    await user.click(screen.getByRole('button', { name: 'От 500 тысяч до 3 миллионов' }));
    await user.click(screen.getByRole('button', { name: 'Да, только это' }));
    for (let i = 0; i < 6; i += 1) {
      await user.click(screen.getByRole('button', { name: 'Нет' }));
    }

    expect(
      screen.getByText(/Планируете открыть свой бизнес/i),
    ).toBeInTheDocument();
  });

  it('shows honest reasons when the case needs a lawyer', async () => {
    mockCheckResponse({
      decision: 'NEEDS_LAWYER',
      reasons: ['Машина — это имущество, которое суд будет оценивать отдельно.'],
    });
    const user = userEvent.setup();
    renderPage();

    await answerAllQuestionsAsFitting(user);

    expect(await screen.findByText('Скажем честно: вам лучше с юристом')).toBeInTheDocument();
    expect(
      screen.getByText('Машина — это имущество, которое суд будет оценивать отдельно.'),
    ).toBeInTheDocument();
  });

  it('supports going back to the previous question', async () => {
    mockCheckResponse({ decision: 'SELF_SERVICE_OK', reasons: [] });
    const user = userEvent.setup();
    renderPage();

    await startCheck(user);
    await user.click(screen.getByRole('button', { name: 'До 500 тысяч' }));
    expect(screen.getByText(/кредиты, карты, микрозаймы/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '← Назад' }));
    expect(screen.getByText('Сколько вы всего должны?')).toBeInTheDocument();
  });
});
