import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import SectionPage from './SectionPage';

const CASE = { id: 'case-1', caseType: 'PERSONAL_BANKRUPTCY', status: 'IN_PROGRESS' };

const PASSPORT_SECTION = {
  key: 'PASSPORT',
  order: 2,
  repeatable: false,
  fields: [
    { name: 'series', type: 'PASSPORT_SERIES', required: true },
    { name: 'number', type: 'PASSPORT_NUMBER', required: true },
    { name: 'issuedBy', type: 'STRING', required: true },
    { name: 'issueDate', type: 'DATE', required: true },
    { name: 'departmentCode', type: 'STRING', required: false },
  ],
  data: null,
  issues: [],
};

const CREDITORS_SECTION = {
  key: 'CREDITORS',
  order: 9,
  repeatable: true,
  fields: [
    { name: 'name', type: 'STRING', required: true },
    { name: 'debtAmount', type: 'MONEY', required: true },
  ],
  data: [{ name: 'ПАО «Банк Восход»', debtAmount: 1000000 }],
  issues: [],
};

const MARITAL_SECTION = {
  key: 'MARITAL_STATUS',
  order: 8,
  repeatable: false,
  fields: [{ name: 'status', type: 'STRING', required: true }],
  data: null,
  issues: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

function renderAt(sectionKey: string) {
  localStorage.setItem('restart.accessToken', 'access-1');
  localStorage.setItem('restart.refreshToken', 'refresh-1');
  render(
    <MemoryRouter initialEntries={[`/journey/${sectionKey}`]}>
      <Routes>
        <Route path="/journey" element={<p>journey-map</p>} />
        <Route path="/journey/:sectionKey" element={<SectionPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SectionPage', () => {
  it('renders the form from backend field metadata and returns to the map after a clean save', async () => {
    const calls: { url: string; body?: string }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, body: init?.body as string | undefined });
      if (url.endsWith('/cases/current')) {
        return new Response(JSON.stringify(CASE), { status: 200 });
      }
      if (url.endsWith('/sections/PASSPORT') && init?.method === 'PUT') {
        return new Response(JSON.stringify({ ...PASSPORT_SECTION, issues: [] }), { status: 200 });
      }
      return new Response(JSON.stringify(PASSPORT_SECTION), { status: 200 });
    }));
    const user = userEvent.setup();
    renderAt('PASSPORT');

    await user.type(await screen.findByLabelText('Серия — 4 цифры'), '4519');
    await user.type(screen.getByLabelText('Номер — 6 цифр'), '123456');
    await user.click(screen.getByRole('button', { name: 'Сохранить и дальше' }));

    expect(await screen.findByText('journey-map')).toBeInTheDocument();
    const saved = calls.find((c) => c.body !== undefined);
    expect(JSON.parse(saved!.body!)).toEqual({ series: '4519', number: '123456' });
  });

  it('keeps the user on the step and shows issues on the exact field after a save with problems', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/cases/current')) {
        return new Response(JSON.stringify(CASE), { status: 200 });
      }
      if (init?.method === 'PUT') {
        return new Response(JSON.stringify({
          ...PASSPORT_SECTION,
          issues: [{
            section: 'PASSPORT', entryIndex: null, field: 'series',
            code: 'INVALID_PASSPORT_SERIES', message: 'Серия паспорта — это 4 цифры',
          }],
        }), { status: 200 });
      }
      return new Response(JSON.stringify(PASSPORT_SECTION), { status: 200 });
    }));
    const user = userEvent.setup();
    renderAt('PASSPORT');

    await user.type(await screen.findByLabelText('Серия — 4 цифры'), '45');
    await user.click(screen.getByRole('button', { name: 'Сохранить и дальше' }));

    expect(await screen.findByText('Серия паспорта — это 4 цифры')).toBeInTheDocument();
    expect(screen.queryByText('journey-map')).not.toBeInTheDocument();
  });

  it('keeps the form and the typed data when the save itself fails (AI-004)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/cases/current')) {
        return new Response(JSON.stringify(CASE), { status: 200 });
      }
      if (init?.method === 'PUT') {
        throw new TypeError('network down');
      }
      return new Response(JSON.stringify(PASSPORT_SECTION), { status: 200 });
    }));
    const user = userEvent.setup();
    renderAt('PASSPORT');

    await user.type(await screen.findByLabelText('Серия — 4 цифры'), '4519');
    await user.click(screen.getByRole('button', { name: 'Сохранить и дальше' }));

    // No page swap, no data loss — an inline alert and the same form:
    expect(await screen.findByRole('alert')).toHaveTextContent('Не получилось сохранить');
    expect(screen.getByDisplayValue('4519')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Сохранить и дальше' })).toBeEnabled();
  });

  it('lets the user add and remove repeatable entries', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/cases/current')) {
        return new Response(JSON.stringify(CASE), { status: 200 });
      }
      return new Response(JSON.stringify(CREDITORS_SECTION), { status: 200 });
    }));
    const user = userEvent.setup();
    renderAt('CREDITORS');

    // The saved entry is prefilled:
    expect(await screen.findByDisplayValue('ПАО «Банк Восход»')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ Добавить долг' }));
    expect(screen.getByText('№ 2')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Убрать' })[0]);
    expect(screen.queryByDisplayValue('ПАО «Банк Восход»')).not.toBeInTheDocument();
  });

  it('offers the credit-bureau how-to on the debts step', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/cases/current')) {
        return new Response(JSON.stringify(CASE), { status: 200 });
      }
      return new Response(JSON.stringify(CREDITORS_SECTION), { status: 200 });
    }));
    renderAt('CREDITORS');

    expect(await screen.findByText('Как узнать, какие кредиты оформлены на ваше имя?'))
      .toBeInTheDocument();
    expect(screen.getByText(/перечень бюро кредитных историй/)).toBeInTheDocument();
    expect(screen.getByText(/бесплатный два раза в год/)).toBeInTheDocument();
  });

  it('warns on a step where the answer can put the case outside the service', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/cases/current')) {
        return new Response(JSON.stringify(CASE), { status: 200 });
      }
      return new Response(JSON.stringify(MARITAL_SECTION), { status: 200 });
    }));
    renderAt('MARITAL_STATUS');

    expect(await screen.findByRole('note'))
      .toHaveTextContent('рассчитан на тех, кто не состоит в браке');
  });
});
