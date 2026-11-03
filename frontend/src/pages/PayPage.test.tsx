import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { tokenStore } from '../api/client';
import PayPage from './PayPage';

const assign = vi.fn();

beforeEach(() => {
  tokenStore.set('access-1', 'refresh-1');
  vi.stubGlobal('location', { ...window.location, assign });
});

afterEach(() => {
  vi.unstubAllGlobals();
  assign.mockReset();
});

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/pay']}>
      <Routes>
        <Route path="/pay" element={<PayPage />} />
        <Route path="/journey" element={<p>journey-screen</p>} />
        <Route path="/auth" element={<p>auth-screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe('PayPage', () => {
  it('shows the price and is honest about what it does not cover', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ granted: false, price: 1000, currency: 'RUB' })));
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Откройте весь путь' })).toBeInTheDocument();
    expect(screen.getByText(/^1\s000 ₽$/)).toBeInTheDocument();
    expect(screen.getByText(/госпошлина и вознаграждение управляющему/)).toBeInTheDocument();
    expect(screen.getByText(/Решение о списании долгов принимает только суд/)).toBeInTheDocument();
    expect(screen.getByText(/картой российского банка или через СБП/)).toBeInTheDocument();
  });

  it('starts the payment and sends the person to the checkout page', async () => {
    const fetchMock = vi.fn(async (url: string) => (url.endsWith('/access')
      ? json({ granted: false, price: 1000, currency: 'RUB' })
      : json({ paymentId: 'p-1', confirmationUrl: 'https://yoomoney.ru/checkout/yk-1' }, 201)));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await userEvent.setup().click(await screen.findByRole('button', { name: /^Оплатить 1\s000 ₽$/ }));

    expect(assign).toHaveBeenCalledWith('https://yoomoney.ru/checkout/yk-1');
    const [url, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/payments');
    expect(init.method).toBe('POST');
  });

  it('shows the server message when the payment cannot start', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.endsWith('/access')
      ? json({ granted: false, price: 1000, currency: 'RUB' })
      : json({ code: 'PAYMENT_UNAVAILABLE', message: 'Оплата сейчас не отвечает' }, 503))));
    renderPage();

    await userEvent.setup().click(await screen.findByRole('button', { name: /^Оплатить/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Оплата сейчас не отвечает');
    expect(assign).not.toHaveBeenCalled();
  });

  it('goes straight to the journey when access is already open', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ granted: true, price: 1000, currency: 'RUB' })));
    renderPage();

    expect(await screen.findByText('journey-screen')).toBeInTheDocument();
  });

  it('asks to sign in first', async () => {
    tokenStore.clear();
    renderPage();

    expect(await screen.findByText('auth-screen')).toBeInTheDocument();
  });
});
