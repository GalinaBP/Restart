import { StrictMode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { VALID_CASE } from '../local/caseFixture';
import { seedCase, signIn } from '../test/localCase';
import AboutYouPage from './AboutYouPage';

function renderPage() {
  signIn();
  render(
    <StrictMode>
      <MemoryRouter initialEntries={['/journey/all']}>
        <Routes>
          <Route path="/journey" element={<p>journey-map</p>} />
          <Route path="/journey/all" element={<AboutYouPage />} />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  );
}

function watchConsole() {
  const collected: string[] = [];
  const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    collected.push(args.map(String).join(' '));
  });
  return {
    controlledWarnings: () => collected.filter((line) => line.includes('controlled input')),
    stop: () => spy.mockRestore(),
  };
}

const values = (label: string) => screen.getAllByLabelText(label)
  .map((field) => (field as HTMLInputElement | HTMLSelectElement).value);

describe('AboutYouPage', () => {
  it('keeps every field controlled when entries are added, dropped and reported back with problems', async () => {
    const watcher = watchConsole();
    await seedCase({ sections: VALID_CASE });
    renderPage();

    expect(await screen.findByLabelText('Фамилия')).toHaveValue('Иванова');
    expect(screen.getByText('Черновик — проверяется юристом')).toBeInTheDocument();
    expect(values('Название банка или МФО')).toEqual(['ПАО «Банк Восход»', 'МФО «Деньги-Быстро»']);
    expect(values('ИНН кредитора (есть в договоре)')).toEqual(['7707083893', '']);
    expect(values('С какого числа не получается платить — год')).toEqual(['2026', '']);

    fireEvent.click(screen.getByRole('button', { name: '+ Добавить долг' }));
    const added = screen.getAllByLabelText('Название банка или МФО').at(-1)!;
    expect(added).toHaveValue('');
    fireEvent.change(added, { target: { value: 'ПАО «Банк Заря»' } });

    const first = screen.getAllByLabelText('Название банка или МФО')[0];
    fireEvent.click(within(first.closest('fieldset')!).getByRole('button', { name: 'Убрать' }));

    expect(values('Название банка или МФО')).toEqual(['МФО «Деньги-Быстро»', 'ПАО «Банк Заря»']);
    expect(values('ИНН кредитора (есть в договоре)')).toEqual(['', '']);
    expect(values('Сколько должны, ₽')).toEqual(['250000.5', '']);
    expect(values('С какого числа не получается платить — год')).toEqual(['', '']);
    expect(values('С какого числа не получается платить — месяц')).toEqual(['', '']);

    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByText(/Осталось поправить пару мест/)).toBeInTheDocument();

    watcher.stop();
    expect(watcher.controlledWarnings()).toEqual([]);
  });
});
