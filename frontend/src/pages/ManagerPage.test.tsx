import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import type { SectionEntry } from '../local/case';
import { seedCase, signIn } from '../test/localCase';
import ManagerPage from './ManagerPage';

const readBreaks = vi.hoisted(() => ({ value: false }));

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
  readBreaks.value = false;
});

function seedSro(sro?: SectionEntry) {
  return seedCase({ sections: sro ? { MANAGER_SRO: sro } : {} });
}

function renderAtManager() {
  signIn();
  return render(
    <MemoryRouter initialEntries={['/manager']}>
      <Routes>
        <Route path="/manager" element={<ManagerPage />} />
        <Route path="/journey/MANAGER_SRO" element={<p>sro-step</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ManagerPage', () => {
  it('shows the loading state, then the one step the stage asks for', async () => {
    await seedSro();
    const { container } = renderAtManager();

    expect(screen.getByText('Секунду…')).toBeInTheDocument();

    expect(await screen.findByText('Поиск финансового управляющего')).toBeInTheDocument();
    expect(screen.getByText('Черновик — проверяется юристом')).toBeInTheDocument();

    expect(screen.getByText('Зачем нужен финансовый управляющий')).toBeInTheDocument();
    const step = container.querySelector('.manager-steps > li') as HTMLElement;
    expect(step.textContent).toContain('Выбрать организацию');
    expect(step.querySelector('.procedure-status')?.textContent?.trim()).toBe('Не начато');
    expect(step.className).toContain('procedure-stage-current');
    expect(screen.getByRole('link', { name: /Указать организацию/ }))
      .toHaveAttribute('href', '/journey/MANAGER_SRO');

    expect(screen.queryByText('Как выбрать эту организацию?')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Отметить оплату/ })).not.toBeInTheDocument();
  });

  it('leaves the stage status and the journal to «Весь путь»', async () => {
    await seedSro();
    renderAtManager();

    await screen.findByText('Поиск финансового управляющего');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText('Когда управляющего утвердят')).not.toBeInTheDocument();
    expect(screen.queryByText('Переписка с управляющим')).not.toBeInTheDocument();
  });

  it('explains why a manager is needed, and leaves the money to the fees screen', async () => {
    await seedSro();
    renderAtManager();

    await screen.findByText('Поиск финансового управляющего');
    expect(screen.getByText(/обязательный участник процедуры банкротства/)).toBeInTheDocument();
    expect(screen.queryByText(/₽/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Сумма черновая/)).not.toBeInTheDocument();
  });

  it('marks the step done once an organisation is named', async () => {
    await seedSro({ name: 'СРО «Содействие»', address: 'г. Москва' });
    const { container } = renderAtManager();

    await screen.findByText('Поиск финансового управляющего');
    const step = container.querySelector('.manager-steps > li') as HTMLElement;
    expect(step.querySelector('.procedure-status')?.textContent?.trim()).toBe('Готово');
    expect(step.className).toContain('procedure-stage-done');
  });

  it('does not count a blank organisation name as a filled-in step', async () => {
    await seedSro({ name: '   ' });
    const { container } = renderAtManager();

    await screen.findByText('Поиск финансового управляющего');
    const step = container.querySelector('.manager-steps > li') as HTMLElement;
    expect(step.querySelector('.procedure-status')?.textContent?.trim()).toBe('Не начато');
  });

  it('carries the return route into the step, so a clean save comes back here', async () => {
    await seedSro();
    const user = userEvent.setup();
    renderAtManager();

    await user.click(await screen.findByRole('link', { name: /Указать организацию/ }));
    expect(await screen.findByText('sro-step')).toBeInTheDocument();
  });

  it('shows the failure state and recovers on retry', async () => {
    await seedSro();
    readBreaks.value = true;
    const user = userEvent.setup();
    renderAtManager();

    expect(await screen.findByText('Что-то пошло не так')).toBeInTheDocument();

    readBreaks.value = false;
    await user.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByText('Поиск финансового управляющего')).toBeInTheDocument();
  });
});
