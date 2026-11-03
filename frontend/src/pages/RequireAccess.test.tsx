import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { tokenStore } from '../api/client';
import { rememberAccess } from '../api/payment';
import RequireAccess from './RequireAccess';

afterEach(() => {
  vi.unstubAllGlobals();
  rememberAccess(null);
});

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<RequireAccess />}>
          <Route path="/journey" element={<p>journey-screen</p>} />
        </Route>
        <Route path="/pay" element={<p>pay-screen</p>} />
        <Route path="/auth" element={<p>auth-screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function accessIs(granted: boolean) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({
    granted,
    price: 1000,
    currency: 'RUB',
  }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('RequireAccess', () => {
  it('sends a visitor who is not signed in to sign in', async () => {
    const fetchMock = accessIs(true);
    renderAt('/journey');

    expect(await screen.findByText('auth-screen')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends an account without a payment to the payment screen', async () => {
    tokenStore.set('access-unpaid', 'refresh-1');
    accessIs(false);
    renderAt('/journey');

    expect(await screen.findByText('pay-screen')).toBeInTheDocument();
    expect(screen.queryByText('journey-screen')).not.toBeInTheDocument();
  });

  it('opens the journey for a paid account and does not ask again on the next screen', async () => {
    tokenStore.set('access-paid', 'refresh-1');
    const fetchMock = accessIs(true);
    renderAt('/journey');

    expect(await screen.findByText('journey-screen')).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/payments/access');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer access-paid');

    renderAt('/journey');
    expect(screen.getAllByText('journey-screen')).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('offers a retry when the check fails', async () => {
    tokenStore.set('access-offline', 'refresh-1');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    renderAt('/journey');

    expect(await screen.findByText('Что-то пошло не так')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
  });
});
