import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { CALM_CARDS } from './pages/calmContent';

describe('App', () => {
  it('renders the landing screen with the single call to action', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Рестарт' })).toBeInTheDocument();
    expect(screen.getByText(/Начните путь к списанию долгов/)).toBeInTheDocument();
    expect(screen.getByText(/Долги растут, звонят банки/)).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Проверить, подходит ли мне самостоятельное банкротство',
    })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Войти' })).toHaveAttribute('href', '/auth?mode=login');
  });

  it('opens the sign-in form from «Войти», not the sign-up one', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    await userEvent.setup().click(screen.getByRole('link', { name: 'Войти' }));

    expect(await screen.findByRole('heading', { name: 'С возвращением!' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument();
    expect(screen.getByText(/Документы хранятся на устройстве/)).toBeInTheDocument();
  });

  it('says what happens after the button, and what the service will not do', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Как это работает' })).toBeInTheDocument();
    ['Ответьте на несколько вопросов', 'Получите план', 'Пройдёте процедуру по шагам'].forEach((step) => {
      expect(screen.getByText(step)).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: 'Звонят банки и коллекторы?' })).toBeInTheDocument();
    const bankScript = CALM_CARDS.find((card) => card.script)?.script;
    expect(bankScript).toBeTruthy();
    expect(screen.getByText(bankScript as string)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Больше готовых ответов/ }))
      .toHaveAttribute('href', '/calm');

    expect(screen.getByRole('heading', { name: 'Честно о главном' })).toBeInTheDocument();
    expect(screen.getByText(/Решение о списании долгов принимает только суд/)).toBeInTheDocument();
    expect(screen.getByText(/это вы делаете сами/)).toBeInTheDocument();
    expect(screen.queryByText(/человек прошли/)).not.toBeInTheDocument();
  });
});
