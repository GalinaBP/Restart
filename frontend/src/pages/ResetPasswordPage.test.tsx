import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import ResetPasswordPage from './ResetPasswordPage';

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/auth/reset" element={<ResetPasswordPage />} />
        <Route path="/auth" element={<p>auth-screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ResetPasswordPage', () => {
  it('saves the new password and leads back to the sign-in screen', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderAt('/auth/reset?token=abc123');

    await user.type(screen.getByLabelText(/Новый пароль/), 'new-password-2');
    await user.click(screen.getByRole('button', { name: 'Сохранить новый пароль' }));

    expect(await screen.findByText('Пароль изменён')).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/auth/reset-password');
    expect(JSON.parse(init.body as string)).toEqual({ token: 'abc123', password: 'new-password-2' });

    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(await screen.findByText('auth-screen')).toBeInTheDocument();
  });

  it('shows the backend message as-is for a stale link', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      status: 400,
      code: 'RESET_LINK_INVALID',
      message: 'Ссылка не подходит или устарела. Запросите новую на экране входа',
    }), { status: 400 })));
    const user = userEvent.setup();
    renderAt('/auth/reset?token=stale-token');

    await user.type(screen.getByLabelText(/Новый пароль/), 'new-password-2');
    await user.click(screen.getByRole('button', { name: 'Сохранить новый пароль' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ссылка не подходит или устарела');
  });

  it('explains what to do when the token is missing from the URL', () => {
    renderAt('/auth/reset');

    expect(screen.getByText('Ссылка открылась не целиком')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'К экрану входа' })).toBeInTheDocument();
  });
});
