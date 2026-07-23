import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import AuthPage from './AuthPage';

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/auth']}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/journey" element={<p>journey-screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AuthPage', () => {
  it('registers, stores the tokens, and moves on to the journey', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      tokenType: 'Bearer',
      expiresInSeconds: 900,
    }), { status: 201 })));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/почта/i), 'anna@example.com');
    await user.type(screen.getByLabelText(/Пароль/), 'correct-horse-1');
    await user.click(screen.getByRole('button', { name: 'Создать аккаунт' }));

    expect(await screen.findByText('journey-screen')).toBeInTheDocument();
    expect(localStorage.getItem('restart.accessToken')).toBe('access-1');
    expect(localStorage.getItem('restart.refreshToken')).toBe('refresh-1');
  });

  it('requests a reset link and shows the enumeration-safe confirmation', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'У меня уже есть аккаунт' }));
    await user.click(screen.getByRole('button', { name: 'Забыли пароль?' }));
    await user.type(screen.getByLabelText(/почта/i), 'anna@example.com');
    await user.click(screen.getByRole('button', { name: 'Отправить ссылку' }));

    expect(await screen.findByText('Проверьте почту')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/auth/forgot-password');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'anna@example.com' });
  });

  it('shows the backend message as-is when login fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      status: 401,
      code: 'AUTHENTICATION_FAILED',
      message: 'Неверная почта или пароль',
    }), { status: 401 })));
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'У меня уже есть аккаунт' }));
    await user.type(screen.getByLabelText(/почта/i), 'anna@example.com');
    await user.type(screen.getByLabelText(/Пароль/), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Неверная почта или пароль');
    expect(localStorage.getItem('restart.accessToken')).toBeNull();
  });
});
