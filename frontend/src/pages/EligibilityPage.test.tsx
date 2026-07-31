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

type User = ReturnType<typeof userEvent.setup>;

/** Dismisses the consequences intro so the grouped question flow begins. */
async function startCheck(user: User) {
  await user.click(screen.getByRole('button', { name: 'Понятно, продолжить' }));
}

const click = (user: User, name: RegExp) =>
  user.click(screen.getByRole('button', { name }));

/** Walks all five groups picking the answers of a straightforward, fitting case. */
async function answerEverythingAsFitting(user: User, lastChoice = /Хочу всё сделать сам/) {
  await startCheck(user);
  // 1 — Долги
  await click(user, /350 тыс – 3 млн/);
  await click(user, /Кредиты, карты, микрозаймы/);
  await click(user, /5 или меньше/);
  await click(user, /Далее/);
  // 2 — Имущество и бизнес
  await click(user, /Ничего такого нет/);
  await click(user, /^Нет$/);
  await click(user, /Далее/);
  // 3 — Ваша ситуация
  const noButtons = screen.getAllByRole('button', { name: /^Нет$/ });
  await user.click(noButtons[0]); // крупные сделки
  await user.click(noButtons[1]); // брак / развод
  await click(user, /^Ничего из этого$/);
  await click(user, /Далее/);
  // 4 — Важные детали
  await click(user, /Ничего из этого нет/);
  await click(user, /Далее/);
  // 5 — Как продолжить
  await click(user, /Да, готов\(а\) к таким расходам/);
  await click(user, lastChoice);
  await click(user, /Показать результат/);
}

describe('EligibilityPage', () => {
  it('opens with the consequences menu before any question', () => {
    mockCheckResponse({ decision: 'SELF_SERVICE_OK', reasons: [] });
    renderPage();

    expect(screen.getByText('Сначала — что важно знать')).toBeInTheDocument();
    expect(screen.getByText('Черновик — проверяется юристом')).toBeInTheDocument();
    expect(screen.getByText(/Имущество могут продать на торгах/i)).toBeInTheDocument();
    // The question flow has not started yet.
    expect(screen.queryByText(/Сколько у вас долгов/)).not.toBeInTheDocument();
  });

  it('groups questions per screen', async () => {
    mockCheckResponse({ decision: 'SELF_SERVICE_OK', reasons: [] });
    const user = userEvent.setup();
    renderPage();

    await startCheck(user);

    // First screen holds the whole «Долги» group — all its questions at once.
    expect(screen.getByText(/Долги · шаг 1 из 5/)).toBeInTheDocument();
    expect(screen.getByText(/Сколько у вас долгов/)).toBeInTheDocument();
    expect(screen.getByText(/Из чего состоят ваши долги/)).toBeInTheDocument();
    expect(screen.getByText(/Скольким банкам, компаниям или людям/)).toBeInTheDocument();
  });

  it('refuses to advance until every question on the screen is answered', async () => {
    mockCheckResponse({ decision: 'SELF_SERVICE_OK', reasons: [] });
    const user = userEvent.setup();
    renderPage();

    await startCheck(user);
    await click(user, /350 тыс – 3 млн/); // only one of the three answered
    await click(user, /Далее/);

    expect(screen.getByRole('alert')).toHaveTextContent('Ответьте на все вопросы');
    expect(screen.getByText(/Долги · шаг 1 из 5/)).toBeInTheDocument();
  });

  it('goes back to the previous group, and from the first group to the consequences', async () => {
    mockCheckResponse({ decision: 'SELF_SERVICE_OK', reasons: [] });
    const user = userEvent.setup();
    renderPage();

    await startCheck(user);
    await click(user, /350 тыс – 3 млн/);
    await click(user, /Кредиты, карты, микрозаймы/);
    await click(user, /5 или меньше/);
    await click(user, /Далее/);
    expect(screen.getByText(/Имущество и бизнес · шаг 2 из 5/)).toBeInTheDocument();

    await click(user, /← Назад/);
    expect(screen.getByText(/Долги · шаг 1 из 5/)).toBeInTheDocument();

    await click(user, /← Назад/);
    expect(screen.getByText('Сначала — что важно знать')).toBeInTheDocument();
  });

  it('lets a multi-select question take several answers', async () => {
    mockCheckResponse({ decision: 'SELF_SERVICE_OK', reasons: [] });
    const user = userEvent.setup();
    renderPage();

    await startCheck(user);
    await click(user, /350 тыс – 3 млн/);
    await click(user, /Кредиты, карты, микрозаймы/);
    await click(user, /5 или меньше/);
    await click(user, /Далее/);

    await click(user, /Машина или мотоцикл/);
    await click(user, /Недвижимость/);
    expect(screen.getByRole('button', { name: /Машина или мотоцикл/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Недвижимость/ })).toHaveAttribute('aria-pressed', 'true');

    // «Ничего такого нет» is exclusive — it clears the other picks.
    await click(user, /Ничего такого нет/);
    expect(screen.getByRole('button', { name: /Машина или мотоцикл/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('sends the collected answers and shows the fitting verdict', async () => {
    mockCheckResponse({ decision: 'SELF_SERVICE_OK', reasons: [] });
    const user = userEvent.setup();
    renderPage();

    await answerEverythingAsFitting(user);

    expect(await screen.findByText('Отлично! Ваш случай подходит')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    expect(body).toMatchObject({
      debtRange: 'FROM_350K_TO_3M',
      onlyConsumerDebts: true,
      manyCreditors: false,
      hasCar: false,
      hasExtraRealEstate: false,
      hasBusiness: false,
      soldOrGiftedAssetsRecently: false,
      marriedOrDivorcing: false,
      hasForeignAssets: false,
      hasLawsuits: false,
      hasEnforcementProceedings: false,
      movedMoneyBeforeFiling: false,
      hasAlimonyDebt: false,
      hasLifeHealthHarmDebt: false,
      hasEconomicCriminalCase: false,
      guaranteedOthersDebt: false,
      incomeUnofficial: false,
      largeThirdPartyDeposits: false,
      preferredPath: 'SELF_SERVICE',
    });
  });

  it('shows the "debt too small" screen without routing to a lawyer', async () => {
    // The decision is server-driven; a sub-threshold debt comes back as DEBT_TOO_SMALL.
    mockCheckResponse({ decision: 'DEBT_TOO_SMALL', reasons: [] });
    const user = userEvent.setup();
    renderPage();

    await answerEverythingAsFitting(user);

    expect(
      await screen.findByText('Для такого долга банкротство обычно не нужно'),
    ).toBeInTheDocument();
    // It must not look like the lawyer outcome.
    expect(screen.queryByText(/вам лучше с юристом/)).not.toBeInTheDocument();
  });

  it('passes the lawyer choice through and shows honest reasons', async () => {
    mockCheckResponse({
      decision: 'NEEDS_LAWYER',
      reasons: ['Вы сами выбрали пройти процедуру с юристом — это разумно.'],
    });
    const user = userEvent.setup();
    renderPage();

    await answerEverythingAsFitting(user, /Хочу помощь юриста/);

    expect(await screen.findByText('Скажем честно: вам лучше с юристом')).toBeInTheDocument();
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    expect(body.preferredPath).toBe('LAWYER');
  });
});
