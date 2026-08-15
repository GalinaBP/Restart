import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { VALID_CASE } from '../local/caseFixture';
import { seedCase, seedDocument, signIn } from '../test/localCase';
import DocumentsPage from './DocumentsPage';

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderPage() {
  signIn();
  render(
    <MemoryRouter initialEntries={['/documents']}>
      <Routes>
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/journey/:sectionKey" element={<p>section-screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DocumentsPage', () => {
  it('shows the missing items as links to the exact steps when generation is blocked', async () => {
    const sections = { ...VALID_CASE };
    delete sections.PASSPORT;
    sections.CREDITORS = [
      { name: 'ПАО «Банк Восход»', address: 'г. Москва', debtAmount: 1000000 },
      { name: 'МФО «Деньги-Быстро»', debtAmount: 250000 },
    ];
    await seedCase({ sections });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Собрать документы' }));

    expect(await screen.findByText('Почти готово! Осталось дозаполнить:')).toBeInTheDocument();
    const passportLink = screen.getByRole('link', { name: /^Паспорт$/ });
    expect(passportLink).toHaveAttribute('href', '/journey/PASSPORT');
    expect(screen.getByRole('link', { name: /Кому и сколько вы должны.*запись № 2/ }))
      .toHaveAttribute('href', '/journey/CREDITORS');

    await user.click(passportLink);
    expect(await screen.findByText('section-screen')).toBeInTheDocument();
  });

  it('lists generated documents with download buttons, stale badge, and the zip export', async () => {
    await seedCase({ sections: VALID_CASE });
    await seedDocument();
    await seedDocument({
      id: 'document-2',
      type: 'CREDITOR_LIST',
      filename: 'creditor_list.pdf',
      stale: true,
    });
    renderPage();

    expect(await screen.findByText('Заявление в суд')).toBeInTheDocument();
    expect(screen.getByText('Список кредиторов')).toBeInTheDocument();
    expect(screen.getByText('устарел')).toBeInTheDocument();
    expect(screen.getByText(/эти файлы устарели/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Скачать PDF' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Собрать заново' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Скачать всё одним архивом' }))
      .toBeInTheDocument();
  });

  it('downloads a file through a blob link', async () => {
    const createObjectURL = vi.fn(() => 'blob:restart');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(Object.create(URL), { createObjectURL, revokeObjectURL }));
    await seedCase({ sections: VALID_CASE });
    await seedDocument();
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Скачать PDF' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:restart');
  });
});
