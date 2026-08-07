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

/** Answers the nth «Нет» on the current screen — several questions share that label. */
async function clickNth(user: User, name: RegExp, index: number) {
  await user.click(screen.getAllByRole('button', { name })[index]);
}

/** Walks every screen picking the answers of a straightforward, fitting case. */
async function answerEverythingAsFitting(
  user: User,
  lastChoice = /Хочу пройти всё самостоятельно/,
) {
  await startCheck(user);
  // 1 — Долги
  await click(user, /500 тыс\. – 1 млн/);
  await click(user, /Кредиты и кредитные карты/);
  await click(user, /Далее/);
  // 2 — Платежи
  await click(user, /Не могу платить по большинству/);
  await click(user, /Больше года назад/);
  await click(user, /^Нет$/); // новые займы после проблем
  await click(user, /Далее/);
  // 3 — Имущество и бизнес
  await click(user, /Ничего, кроме обычных личных вещей/);
  await click(user, /^Нет$/); // ИП или бизнес
  await click(user, /Далее/);
  // 4 — Сделки и семья
  await clickNth(user, /^Нет$/, 0); // сделки за 3 года
  await clickNth(user, /^Нет$/, 1); // брак
  await click(user, /Далее/);
  // 5 — Суды и счета
  await clickNth(user, /^Нет$/, 0); // имущество за границей
  await clickNth(user, /^Нет$/, 1); // судебные дела
  await clickNth(user, /^Нет$/, 2); // приставы
  await click(user, /Далее/);
  // 6 — Деньги и обязательства
  await click(user, /^Нет$/); // крупные операции
  await click(user, /^Ничего из этого$/);
  await click(user, /Далее/);
  // 7 — Как продолжить
  await click(user, /^Да$/); // готов к расходам
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

    expect(screen.getByText(/Долги · шаг 1 из 7/)).toBeInTheDocument();
    expect(screen.getByText(/Сколько у вас долгов/)).toBeInTheDocument();
    expect(screen.getByText(/Какие у вас долги/)).toBeInTheDocument();
  });

  it('refuses to advance until every question on the screen is answered', async () => {
    mockCheckResponse({ decision: 'SELF_SERVICE_OK', reasons: [] });
    const user = userEvent.setup();
    renderPage();

    await startCheck(user);
    await click(user, /500 тыс\. – 1 млн/); // only one of the two answered
    await click(user, /Далее/);

    expect(screen.getByRole('alert')).toHaveTextContent('Ответьте на все вопросы');
    expect(screen.getByText(/Долги · шаг 1 из 7/)).toBeInTheDocument();
  });

  it('asks about good faith only when the loans are fresh', async () => {
    mockCheckResponse({ decision: 'SELF_SERVICE_OK', reasons: [] });
    const user = userEvent.setup();
    renderPage();

    await startCheck(user);
    await click(user, /500 тыс\. – 1 млн/);
    await click(user, /Кредиты и кредитные карты/);
    await click(user, /Далее/);
    await click(user, /Не могу платить по большинству/);

    // Old loans: the follow-up stays away.
    await click(user, /Больше года назад/);
    expect(screen.queryByText(/уже понимая, что не сможете их погашать/)).not.toBeInTheDocument();

    // Loans of the last three months: the question that actually matters appears.
    await click(user, /В последние 3 месяца/);
    expect(screen.getByText(/уже понимая, что не сможете их погашать/)).toBeInTheDocument();
  });

  it('asks what was sold only after «Да» to deals', async () => {
    mockCheckResponse({ decision: 'SELF_SERVICE_OK', reasons: [] });
    const user = userEvent.setup();
    renderPage();

    await startCheck(user);
    await click(user, /500 тыс\. – 1 млн/);
    await click(user, /Кредиты и кредитные карты/);
    await click(user, /Далее/);
    await click(user, /Не могу платить по большинству/);
    await click(user, /Больше года назад/);
    await click(user, /^Нет$/);
    await click(user, /Далее/);
    await click(user, /Ничего, кроме обычных личных вещей/);
    await click(user, /^Нет$/);
    await click(user, /Далее/);

    expect(screen.queryByText(/Что именно вы продавали или дарили/)).not.toBeInTheDocument();
    await clickNth(user, /^Да$/, 0);
    expect(screen.getByText(/Что именно вы продавали или дарили/)).toBeInTheDocument();
  });

  it('goes back to the previous group, and from the first group to the consequences', async () => {
    mockCheckResponse({ decision: 'SELF_SERVICE_OK', reasons: [] });
    const user = userEvent.setup();
    renderPage();

    await startCheck(user);
    await click(user, /500 тыс\. – 1 млн/);
    await click(user, /Кредиты и кредитные карты/);
    await click(user, /Далее/);
    expect(screen.getByText(/Платежи · шаг 2 из 7/)).toBeInTheDocument();

    await click(user, /← Назад/);
    expect(screen.getByText(/Долги · шаг 1 из 7/)).toBeInTheDocument();

    await click(user, /← Назад/);
    expect(screen.getByText('Сначала — что важно знать')).toBeInTheDocument();
  });

  it('lets a multi-select question take several answers', async () => {
    mockCheckResponse({ decision: 'SELF_SERVICE_OK', reasons: [] });
    const user = userEvent.setup();
    renderPage();

    await startCheck(user);
    await click(user, /500 тыс\. – 1 млн/);
    await click(user, /Кредиты и кредитные карты/);
    await click(user, /Микрозаймы/);
    expect(screen.getByRole('button', { name: /Кредиты и кредитные карты/ }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Микрозаймы/ }))
      .toHaveAttribute('aria-pressed', 'true');

    // «Не знаю» is exclusive — it clears the other picks. (The first one on this screen belongs
    // to the debt-size question; this is the one inside «Какие у вас долги?».)
    await clickNth(user, /^Не знаю$/, 1);
    expect(screen.getByRole('button', { name: /Кредиты и кредитные карты/ }))
      .toHaveAttribute('aria-pressed', 'false');
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
      debtRange: 'FROM_500K_TO_1M',
      debtTypes: ['CREDITS'],
      paymentStatus: 'CANNOT_PAY_MOST',
      loanAge: 'OVER_YEAR_AGO',
      newLoansAfterTrouble: 'NO',
      property: ['NOTHING'],
      businessStatus: 'NONE',
      soldOrGiftedAssets: 'NO',
      maritalStatus: 'NO',
      hasForeignAssets: false,
      hasLawsuits: 'NO',
      hasEnforcementProceedings: 'NO',
      unusualMoneyOperations: 'NO',
      specialCircumstances: ['NONE'],
      costsReadiness: 'READY',
      preferredPath: 'SELF_SERVICE',
    });
    // Follow-ups that were never shown are not invented.
    expect(body.knewCouldNotRepay).toBeUndefined();
    expect(body.dealAssets).toBeUndefined();
    expect(body.moneyOperations).toBeUndefined();
  });

  it('shows the "not recommended" screen without routing to a lawyer', async () => {
    // The decision is server-driven: debts that survive bankruptcy come back as NOT_RECOMMENDED.
    mockCheckResponse({
      decision: 'NOT_RECOMMENDED',
      reasons: ['Долги по алиментам не спишутся — они останутся с вами и после процедуры.'],
    });
    const user = userEvent.setup();
    renderPage();

    await answerEverythingAsFitting(user);

    expect(
      await screen.findByText('Похоже, банкротство вам сейчас не поможет'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Долги по алиментам не спишутся/)).toBeInTheDocument();
    // It must not look like the lawyer outcome.
    expect(screen.queryByText(/вам лучше с юристом/)).not.toBeInTheDocument();
  });

  it('shows the "not ready for costs" screen', async () => {
    mockCheckResponse({ decision: 'NOT_READY_FOR_COSTS', reasons: [] });
    const user = userEvent.setup();
    renderPage();

    await answerEverythingAsFitting(user);

    expect(
      await screen.findByText('Пока лучше подождать: будут обязательные расходы'),
    ).toBeInTheDocument();
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
