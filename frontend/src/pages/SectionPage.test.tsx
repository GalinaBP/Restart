import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { seedCase, signIn, storedCase } from '../test/localCase';
import SectionPage from './SectionPage';

const saveBreaks = vi.hoisted(() => ({ value: false }));

vi.mock('../local/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../local/store')>();
  return {
    ...actual,
    saveCase: async (...args: Parameters<typeof actual.saveCase>) => {
      if (saveBreaks.value) {
        throw new Error('в браузере кончилось место');
      }
      return actual.saveCase(...args);
    },
  };
});

afterEach(() => {
  saveBreaks.value = false;
});

const PASSPORT = {
  series: '4519',
  number: '123456',
  issuedBy: 'ГУ МВД России по г. Москве',
  issueDate: '2019-06-14',
};

function renderAt(sectionKey: string, back?: string) {
  signIn();
  render(
    <MemoryRouter initialEntries={[{ pathname: `/journey/${sectionKey}`, state: back ? { back } : null }]}>
      <Routes>
        <Route path="/journey" element={<p>journey-map</p>} />
        <Route path="/journey/:sectionKey" element={<SectionPage />} />
        <Route path="/manager" element={<p>manager-screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillPassport(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Серия — 4 цифры'), PASSPORT.series);
  await user.type(screen.getByLabelText('Номер — 6 цифр'), PASSPORT.number);
  await user.type(screen.getByLabelText('Кем выдан — как в паспорте'), PASSPORT.issuedBy);
  fireEvent.change(screen.getByLabelText('Дата выдачи'), {
    target: { value: PASSPORT.issueDate },
  });
}

describe('SectionPage', () => {
  it('renders the form from the field metadata and keeps a clean save on the device', async () => {
    await seedCase();
    const user = userEvent.setup();
    renderAt('PASSPORT');

    await fillPassport(user);
    await user.click(screen.getByRole('button', { name: 'Сохранить и дальше' }));

    expect(await screen.findByRole('heading', { name: 'Где вы прописаны' }))
      .toBeInTheDocument();
    expect((await storedCase())?.sections.PASSPORT).toEqual(PASSPORT);
  });

  it('returns to the screen that sent the user here instead of walking on through the wizard', async () => {
    await seedCase();
    const user = userEvent.setup();
    renderAt('PASSPORT', '/manager');

    expect(await screen.findByRole('link', { name: '← Назад' }))
      .toHaveAttribute('href', '/manager');
    expect(screen.queryByRole('link', { name: /К списку шагов/ })).not.toBeInTheDocument();

    await fillPassport(user);
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('manager-screen')).toBeInTheDocument();
  });

  it('keeps the user on the step and shows issues on the exact field after a save with problems', async () => {
    await seedCase();
    const user = userEvent.setup();
    renderAt('PASSPORT');

    await user.type(await screen.findByLabelText('Серия — 4 цифры'), '45');
    await user.click(screen.getByRole('button', { name: 'Сохранить и дальше' }));

    expect(await screen.findByText('Серия паспорта — это 4 цифры')).toBeInTheDocument();
    expect(screen.queryByText('journey-map')).not.toBeInTheDocument();
  });

  it('keeps the form and the typed data when the save itself fails (AI-004)', async () => {
    await seedCase();
    saveBreaks.value = true;
    const user = userEvent.setup();
    renderAt('PASSPORT');

    await user.type(await screen.findByLabelText('Серия — 4 цифры'), '4519');
    await user.click(screen.getByRole('button', { name: 'Сохранить и дальше' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Не получилось сохранить');
    expect(screen.getByDisplayValue('4519')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Сохранить и дальше' })).toBeEnabled();
  });

  it('lets the user add and remove repeatable entries', async () => {
    await seedCase({
      sections: { CREDITORS: [{ name: 'ПАО «Банк Восход»', debtAmount: 1000000 }] },
    });
    const user = userEvent.setup();
    renderAt('CREDITORS');

    expect(await screen.findByDisplayValue('ПАО «Банк Восход»')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ Добавить долг' }));
    expect(screen.getByText('№ 2')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Убрать' })[0]);
    expect(screen.queryByDisplayValue('ПАО «Банк Восход»')).not.toBeInTheDocument();
  });

  it('offers the credit-bureau how-to on the debts step', async () => {
    await seedCase();
    renderAt('CREDITORS');

    expect(await screen.findByText('Как узнать, какие кредиты оформлены на ваше имя?'))
      .toBeInTheDocument();
    expect(screen.getByText(/перечень бюро кредитных историй/)).toBeInTheDocument();
    expect(screen.getByText(/бесплатный два раза в год/)).toBeInTheDocument();
  });

  it('warns on a step where the answer can put the case outside the service', async () => {
    await seedCase();
    renderAt('MARITAL_STATUS');

    expect(await screen.findByRole('note'))
      .toHaveTextContent('рассчитан на тех, кто не состоит в браке');
  });
});
