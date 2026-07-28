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
    expect(screen.getByText(/Начните новую финансовую главу/)).toBeInTheDocument();
    expect(
      screen.getByText('Сервис для самостоятельного судебного банкротства'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Проверьте, подходит ли вам самостоятельное банкротство',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument();
  });
});
