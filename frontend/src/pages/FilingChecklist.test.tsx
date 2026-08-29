import { render, screen, within } from '@testing-library/react';
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
      ['Заявление и приложения готовы', '/documents'],
      ['Квитанция о госпошлине готова', '/journey/PAYMENTS'],
      ['Указана выбранная СРО финансового управляющего', '/journey/MANAGER_SRO'],
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
      'Заявление и приложения готовы',
      'Квитанция о госпошлине готова',
      'Подтверждение депозита на финансового управляющего готово',
      'Указана выбранная СРО финансового управляющего',
    ]) {
      const row = rowFor(title);
      expect(within(row).getByText('Готово')).toBeInTheDocument();
      expect(within(row).queryByRole('link')).not.toBeInTheDocument();
    }

    for (const title of [
      'Документы о доходах и имуществе приложены',
      'Документы по долгам приложены',
      'Все копии и реквизиты проверены',
    ]) {
      expect(within(rowFor(title)).getByText('Проверьте сами')).toBeInTheDocument();
    }
  });

  it('does not claim the documents are ready while they are stale', async () => {
    await seedCase();
    await seedDocument({ stale: true });
    renderFiling();

    await screen.findByText('Перед подачей проверьте');

    expect(within(rowFor('Заявление и приложения готовы')).getByText('Не готово'))
      .toBeInTheDocument();
  });

  it('names the save button after what it records', async () => {
    await seedCase();
    renderFiling();

    expect(await screen.findByRole('button', { name: 'Я подал заявление' })).toBeInTheDocument();
    expect(screen.getByText('Черновик — проверяется юристом')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Сохранить и дальше' })).not.toBeInTheDocument();
  });
});
