import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import type { SectionPayload } from '../local/types';
import { seedCase, seedDocument, signIn, storedCase } from '../test/localCase';
import ProcedurePage from './ProcedurePage';

const feesConfirmed = vi.hoisted(() => ({ value: false }));
const readBreaks = vi.hoisted(() => ({ value: false }));

vi.mock('../local/rules', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../local/rules')>();
  return {
    ...actual,
    get FEES() {
      return feesConfirmed.value
        ? { ...actual.FEES, items: actual.FEES.items.map((line) => ({ ...line, confirmed: true })) }
        : actual.FEES;
    },
  };
});

vi.mock('../local/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../local/store')>();
  return {
    ...actual,
    requireCase: async () => {
      if (readBreaks.value) {
        throw new Error('хранилище недоступно');
      }
      return actual.requireCase();
    },
  };
});

afterEach(() => {
  feesConfirmed.value = false;
  readBreaks.value = false;
});

const BASE_SECTIONS: Record<string, SectionPayload> = {
  PERSONAL_DETAILS: { lastName: 'Иванова', firstName: 'Анна' },
};

const BLOCKED_CLAIMS = {
  CREDITOR_CLAIMS: {
    status: 'BLOCKED' as const, startedOn: null, completedOn: null, note: null,
  },
};

const DONE = { status: 'DONE' as const, startedOn: null, completedOn: null, note: null };

function seedCommon(sections: Record<string, SectionPayload> = {}) {
  return seedCase({
    sections: { ...BASE_SECTIONS, ...sections },
    journey: { ...BLOCKED_CLAIMS },
  });
}

async function seedRealization() {
  await seedDocument();
  return seedCase({
    procedureType: 'REALIZATION',
    sections: {
      ...BASE_SECTIONS,
      PAYMENTS: { stateDutyPaidOn: '2026-07-20', depositPaidOn: '2026-07-21' },
      FILING_SUBMISSION: { submissionDate: '2026-07-22' },
    },
    journey: { MANAGER_SELECTION: DONE, COURT_DECISION: DONE },
  });
}

function money(value: number): string {
  const formatted = value.toLocaleString('ru-RU',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${formatted} ₽`.replace(/[\u00a0\u202f]/g, ' ');
}

function renderAtProcedure() {
  signIn();
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

function stageRow(container: HTMLElement, index: number): HTMLElement {
  const rows = container.querySelectorAll('.procedure-list > li');
  return rows[index] as HTMLElement;
}

function stageCard(container: HTMLElement, index: number): HTMLElement {
  const row = stageRow(container, index);
  return row.classList.contains('procedure-stage')
    ? row
    : row.querySelector('.procedure-stage') as HTMLElement;
}

describe('ProcedurePage', () => {
  it('shows what the filing costs, flagged as a draft while amounts are unreviewed', async () => {
    await seedCommon();
    renderAtProcedure();

    expect(await screen.findByText(money(300))).toBeInTheDocument();
    expect(screen.getByText(money(25000))).toBeInTheDocument();
    expect(screen.getByText(money(25300))).toBeInTheDocument();
    expect(screen.getByText(/Суммы черновые/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Отметить оплату/ }))
      .toHaveAttribute('href', '/journey/PAYMENTS');
  });

  it('drops the draft warning once the amounts are confirmed', async () => {
    feesConfirmed.value = true;
    await seedCommon();
    renderAtProcedure();

    expect(await screen.findByText(money(25300))).toBeInTheDocument();
    expect(screen.queryByText(/Суммы черновые/)).not.toBeInTheDocument();
  });

  it('leaves the manager stage to its own screen, with nothing to fill in here', async () => {
    await seedCommon();
    renderAtProcedure();

    await screen.findByText('Весь путь');

    expect(screen.getByRole('link', { name: /Начать/ })).toHaveAttribute('href', '/manager');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Записать' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Переписка с управляющим/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/у организации есть пять дней/)).not.toBeInTheDocument();
  });

  it('sends the filing stage on to the step that records submission', async () => {
    await seedCommon();
    renderAtProcedure();

    const link = await screen.findByRole('link', { name: /Отметить подачу/ });
    expect(link).toHaveAttribute('href', '/journey/FILING_SUBMISSION');
  });

  it('shows both COURT_DECISION detail links, and the nearest upcoming hearing even collapsed', async () => {
    await seedCommon({
      COURT_HEARINGS: [
        { date: '2099-03-15', subject: 'Рассмотрение обоснованности заявления' },
        { date: '2099-01-01', subject: 'Более раннее заседание' },
      ],
    });
    const user = userEvent.setup();
    renderAtProcedure();

    expect(await screen.findByText(/Ближайшее заседание: 01\.01\.2099 — Более раннее заседание/))
      .toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Решение суда/ }));

    expect(screen.getByRole('link', { name: /Дело в суде/ }))
      .toHaveAttribute('href', '/journey/COURT_CASE');
    expect(screen.getByRole('link', { name: /Заседания/ }))
      .toHaveAttribute('href', '/journey/COURT_HEARINGS');
  });

  it('shows no upcoming-hearing line when nothing is recorded or every hearing is past', async () => {
    await seedCommon();
    renderAtProcedure();

    await screen.findByText('Весь путь');
    expect(screen.queryByText(/Ближайшее заседание/)).not.toBeInTheDocument();
  });

  it('shows the loading state, then every stage with its status, highlighting the current one', async () => {
    await seedCommon();
    const { container } = renderAtProcedure();

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

    const current = stageCard(container, 1);
    expect(current.className).toContain('procedure-stage-current');
    expect(current.querySelector('.procedure-current-badge')).toHaveTextContent('Сейчас');
    [0, 2, 3, 4, 5, 6, 7].forEach((index) => {
      expect(stageCard(container, index).className).not.toContain('procedure-stage-current');
    });

    expect(screen.queryByText('План выплат')).not.toBeInTheDocument();
    expect(screen.queryByText('Продажа имущества')).not.toBeInTheDocument();
    expect(screen.queryByText('Договорённость с кредиторами')).not.toBeInTheDocument();
  });

  it('offers no way to edit derived stages, and links document preparation to its own screen', async () => {
    await seedCommon();
    const user = userEvent.setup();
    renderAtProcedure();

    await screen.findByText('Весь путь');

    expect(screen.queryByRole('button', { name: /Проверка перед стартом/ })).not.toBeInTheDocument();

    const docPrepLink = screen.getByRole('link', { name: /Подготовка документов/ });
    expect(docPrepLink).toHaveAttribute('href', '/journey');

    await user.click(docPrepLink);
    expect(await screen.findByText('journey-map')).toBeInTheDocument();
  });

  it('records a stage on the device and re-renders with the new status', async () => {
    await seedCommon();
    const user = userEvent.setup();
    const { container } = renderAtProcedure();

    await screen.findByText('Весь путь');
    await user.click(screen.getByRole('button', { name: /Решение суда/ }));
    await user.selectOptions(await screen.findByRole('combobox'), 'IN_PROGRESS');
    await user.click(screen.getByRole('button', { name: 'Записать' }));

    await waitFor(() => expect(screen.queryByRole('combobox')).not.toBeInTheDocument());

    expect((await storedCase())?.journey.COURT_DECISION).toEqual({
      status: 'IN_PROGRESS', startedOn: null, completedOn: null, note: null,
    });
    const row = stageRow(container, 5);
    expect(row.querySelector('.procedure-status')?.textContent?.trim()).toBe('В процессе');
  });

  it('shows the branch stage only once the court procedure is recorded', async () => {
    await seedRealization();
    renderAtProcedure();

    expect(await screen.findByText('Опись имущества')).toBeInTheDocument();
    expect(screen.getByText('Продажа имущества')).toBeInTheDocument();
    expect(screen.getByText('Расчёты с кредиторами')).toBeInTheDocument();
    expect(screen.queryByText('План выплат')).not.toBeInTheDocument();
    expect(screen.queryByText('Утверждение соглашения')).not.toBeInTheDocument();
    expect(screen.getByText(/Ваша процедура: Реализация имущества/)).toBeInTheDocument();
  });

  it('records the court procedure from the decision stage and reveals that branch', async () => {
    await seedCommon();
    const user = userEvent.setup();
    renderAtProcedure();

    await user.click(await screen.findByRole('button', { name: /Решение суда/ }));
    await user.click(screen.getByRole('button', { name: /Реализация имущества/ }));

    expect(await screen.findByText('Опись имущества')).toBeInTheDocument();
    expect((await storedCase())?.procedureType).toBe('REALIZATION');
  });

  it('explains a BLOCKED stage without it reading like an error', async () => {
    await seedCommon();
    const user = userEvent.setup();
    renderAtProcedure();

    await screen.findByText('Весь путь');
    await user.click(screen.getByRole('button', { name: /Требования кредиторов/ }));

    expect(screen.getByText('Пока не зависит от вас — ждём суд, управляющего или поступление денег.'))
      .toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the claim-filing deadline, a flagged summary, and both CREDITOR_CLAIMS detail links', async () => {
    await seedCommon({
      EFRSB_PUBLICATION: { publicationDate: '2026-06-01' },
      FILED_CLAIMS: [
        { creditorName: 'Банк А', amount: 100000, filedOn: '2026-08-15', disputed: false },
        { creditorName: 'Банк Б', amount: 50000, filedOn: '2026-07-10', disputed: true },
      ],
    });
    const user = userEvent.setup();
    renderAtProcedure();

    expect(await screen.findByText(/Срок предъявления требований: 31\.07\.2026/))
      .toBeInTheDocument();
    expect(screen.getByText(/Срок черновой, уточните на сайте суда\/в реестре/))
      .toBeInTheDocument();
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
    await seedCommon();
    renderAtProcedure();

    await screen.findByText('Весь путь');
    expect(screen.queryByText(/Срок предъявления требований/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Есть требования с пометками/)).not.toBeInTheDocument();
  });

  it('shows the failure state and recovers on retry', async () => {
    await seedCommon();
    readBreaks.value = true;
    const user = userEvent.setup();
    renderAtProcedure();

    expect(await screen.findByText('Что-то пошло не так')).toBeInTheDocument();

    readBreaks.value = false;
    await user.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByText('Весь путь')).toBeInTheDocument();
  });

  it('shows the most recent manager correspondence on the MANAGER_SELECTION card', async () => {
    await seedCommon({
      MANAGER_CORRESPONDENCE: [
        { date: '2026-07-10', type: 'Письмо' },
        { date: '2026-07-20', type: 'Отчёт' },
      ],
    });
    renderAtProcedure();

    expect(await screen.findByText(/Последняя запись: 20\.07\.2026 — Отчёт/))
      .toBeInTheDocument();
  });
});
