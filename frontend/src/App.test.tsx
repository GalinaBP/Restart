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
    expect(screen.getByText(/Начните новую финансовую жизнь/)).toBeInTheDocument();
    expect(screen.getByText(/Долги растут, звонят банки/)).toBeInTheDocument();
    expect(
      screen.getByText('Сервис для самостоятельного судебного банкротства'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Проверить мою ситуацию' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument();
  });

  it('says what happens after the button, and what the service will not do', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Как это работает' })).toBeInTheDocument();
    ['Ответите на вопросы', 'Получите план', 'Пойдёте по шагам'].forEach((step) => {
      expect(screen.getByText(step)).toBeInTheDocument();
    });

    // The trust block promises nothing it cannot keep: no discharge, no counts, no testimonials.
    expect(screen.getByRole('heading', { name: 'Честно о главном' })).toBeInTheDocument();
    expect(screen.getByText(/Мы не обещаем, что долги спишут/)).toBeInTheDocument();
    expect(screen.getByText(/документы вы подаёте сами/)).toBeInTheDocument();
    expect(screen.queryByText(/человек прошли/)).not.toBeInTheDocument();
  });
});
