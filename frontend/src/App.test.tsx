import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

describe('App', () => {
  it('renders the landing screen with the single call to action', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Рестарт' })).toBeInTheDocument();
    // The page opens on the visitor's situation, not on what the service technically is.
    expect(screen.getByText(/Начните путь к списанию долгов/)).toBeInTheDocument();
    expect(screen.getByText(/Долги растут, звонят банки/)).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Проверить, подходит ли мне самостоятельное банкротство',
    })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument();
  });

  it('says what happens after the button, and what the service will not do', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Как это работает' })).toBeInTheDocument();
    ['Ответьте на несколько вопросов', 'Получите план', 'Пойдёте по шагам'].forEach((step) => {
      expect(screen.getByText(step)).toBeInTheDocument();
    });

    // Real help before any decision: the bank script from «Спокойно», shown in full, plus the
    // way into the section — which needs no account.
    expect(screen.getByRole('heading', { name: 'Звонят банки и коллекторы?' })).toBeInTheDocument();
    expect(screen.getByText(/По вопросам задолженности прошу общаться в письменной форме/))
      .toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Больше готовых ответов/ }))
      .toHaveAttribute('href', '/calm');

    // The trust block promises nothing it cannot keep: no discharge, no counts, no testimonials.
    expect(screen.getByRole('heading', { name: 'Честно о главном' })).toBeInTheDocument();
    expect(screen.getByText(/Решение о списании долгов принимает только суд/)).toBeInTheDocument();
    expect(screen.getByText(/это вы делаете сами/)).toBeInTheDocument();
    expect(screen.queryByText(/человек прошли/)).not.toBeInTheDocument();
  });
});
