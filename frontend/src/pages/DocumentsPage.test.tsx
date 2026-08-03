import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import DocumentsPage from './DocumentsPage';

const CASE = { id: 'case-1', caseType: 'PERSONAL_BANKRUPTCY', status: 'IN_PROGRESS' };

const DOCS = [
  { id: 'd1', type: 'BANKRUPTCY_APPLICATION', format: 'PDF', templateVersion: '2026-06-21.1',
    filename: 'bankruptcy_application.pdf', sizeBytes: 4000, stale: false },
  { id: 'd3', type: 'CREDITOR_LIST', format: 'PDF', templateVersion: '2026-06-21.1',
    filename: 'creditor_list.pdf', sizeBytes: 3000, stale: true },
];

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

function renderPage() {
  localStorage.setItem('restart.accessToken', 'access-1');
  localStorage.setItem('restart.refreshToken', 'refresh-1');
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
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/cases/current')) {
        return new Response(JSON.stringify(CASE), { status: 200 });
      }
      if (init?.method === 'POST') {
        return new Response(JSON.stringify({
          status: 409,
          code: 'GENERATION_BLOCKED',
          message: 'Пока нельзя собрать документы — сначала заполните обязательные разделы',
          missing: [
            { step: 'PASSPORT', entryIndex: null, field: 'issueDate',
              code: 'REQUIRED_FIELD_MISSING', message: 'Заполните это поле' },
            { step: 'CREDITORS', entryIndex: 1, field: 'address',
              code: 'REQUIRED_FIELD_MISSING', message: 'Заполните это поле' },
          ],
        }), { status: 409 });
      }
      return new Response(JSON.stringify([]), { status: 200 });
    }));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Собрать документы' }));

    expect(await screen.findByText('Почти готово! Осталось дозаполнить:')).toBeInTheDocument();
    const passportLink = screen.getByRole('link', { name: /Паспорт — Дата выдачи/ });
    expect(passportLink).toHaveAttribute('href', '/journey/PASSPORT');
    expect(screen.getByRole('link', { name: /Кому и сколько вы должны.*запись № 2/ }))
      .toHaveAttribute('href', '/journey/CREDITORS');

    // The link leads straight to the step screen:
    await user.click(passportLink);
    expect(await screen.findByText('section-screen')).toBeInTheDocument();
  });

  it('lists generated documents with download buttons, stale badge, and the zip export', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/cases/current')) {
        return new Response(JSON.stringify(CASE), { status: 200 });
      }
      return new Response(JSON.stringify(DOCS), { status: 200 });
    }));
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
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/cases/current')) {
        return new Response(JSON.stringify(CASE), { status: 200 });
      }
      if (url.endsWith('/documents/d1')) {
        return new Response(new Blob(['PK-docx-bytes']), { status: 200 });
      }
      return new Response(JSON.stringify([DOCS[0]]), { status: 200 });
    }));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Скачать PDF' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:restart');
  });
});
