import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { seedCase, seedDocument, signIn } from '../test/localCase';
import SectionPage from './SectionPage';

function renderFiling() {
  signIn();
  render(
    <MemoryRouter initialEntries={['/journey/FILING_SUBMISSION']}>
      <Routes>
        <Route path="/journey/:sectionKey" element={<SectionPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function rowFor(title: string): HTMLElement {
  return screen.getByText(title).closest('li')!;
}

describe('the checklist before filing', () => {
  it('marks nothing done on a bare case, and points at the step that fills each gap', async () => {
    await seedCase();
    renderFiling();

    expect(await screen.findByText('Перед подачей проверьте')).toBeInTheDocument();

    for (const [title, href] of [
      ['Заявление готово', '/documents'],
      ['Госпошлина оплачена', '/journey/PAYMENTS'],
      ['СРО выбрана', '/journey/MANAGER_SRO'],
    ] as const) {
      const row = rowFor(title);
      expect(within(row).getByText('Не готово')).toBeInTheDocument();
      expect(within(row).getByRole('link')).toHaveAttribute('href', href);
    }
  });

  it('ticks what the case already proves and leaves the rest to the user', async () => {
    await seedCase({
      sections: {
        PAYMENTS: { stateDutyPaidOn: '2026-07-20', depositPaidOn: '2026-07-21' },
        MANAGER_SRO: { name: 'Ассоциация «Содействие»', address: 'г. Москва' },
      },
    });
    await seedDocument();
    renderFiling();

    expect(await screen.findByText('Перед подачей проверьте')).toBeInTheDocument();

    for (const title of [
      'Заявление готово',
      'Госпошлина оплачена',
      'Депозит внесён',
      'СРО выбрана',
    ]) {
      const row = rowFor(title);
      expect(within(row).getByText('Готово')).toBeInTheDocument();
      expect(within(row).queryByRole('link')).not.toBeInTheDocument();
    }

    for (const title of [
      'Справки о доходах и имуществе на руках',
      'Договоры и справки по долгам на руках',
      'Копии заявления для кредиторов готовы',
    ]) {
      expect(within(rowFor(title)).getByText('Проверьте сами')).toBeInTheDocument();
    }
  });

  it('does not claim the documents are ready while they are stale', async () => {
    await seedCase();
    await seedDocument({ stale: true });
    renderFiling();

    await screen.findByText('Перед подачей проверьте');

    expect(within(rowFor('Заявление готово')).getByText('Не готово'))
      .toBeInTheDocument();
  });

  it('shows one route at a time, and only after it is chosen', async () => {
    await seedCase();
    const user = userEvent.setup();
    renderFiling();

    expect(await screen.findByText('Как подать')).toBeInTheDocument();
    expect(screen.getByText(/арбитражный суд по месту прописки/)).toBeInTheDocument();
    expect(screen.getByText(/Копию заявления нужно отправить/)).toBeInTheDocument();
    expect(screen.queryByText(/Войдите на «Мой арбитр»/)).not.toBeInTheDocument();
    expect(screen.queryByText(/заказным письмом с описью/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Почтой/ }));

    expect(screen.getByText(/заказным письмом с описью/)).toBeInTheDocument();
    expect(screen.queryByText(/Войдите на «Мой арбитр»/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Онлайн/ }));

    expect(screen.getByText(/Войдите на «Мой арбитр»/)).toBeInTheDocument();
    expect(screen.queryByText(/заказным письмом с описью/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Открыть «Мой арбитр»' }))
      .toHaveAttribute('href', 'https://my.arbitr.ru');
  });

  it('names the save button after what it records', async () => {
    await seedCase();
    renderFiling();

    expect(await screen.findByRole('button', { name: 'Я подал заявление' })).toBeInTheDocument();
    expect(screen.getByText('Черновик — проверяется юристом')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Сохранить и дальше' })).not.toBeInTheDocument();
  });
});
