import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { tokenStore } from '../api/client';
import PayReturnPage from './PayReturnPage';

beforeEach(() => {
  tokenStore.set('access-1', 'refresh-1');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/pay/return" element={<PayReturnPage pollMs={1} />} />
        <Route path="/pay" element={<p>pay-screen</p>} />
        <Route path="/journey" element={<p>journey-screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function statuses(...answers: string[]) {
  const queue = [...answers];
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({
    status: queue.length > 1 ? queue.shift() : queue[0],
  }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('PayReturnPage', () => {
  it('waits out a pending payment and opens the journey once it succeeds', async () => {
    const fetchMock = statuses('PENDING', 'PENDING', 'SUCCEEDED');
    renderAt('/pay/return?payment=p-1');

    expect(await screen.findByRole('heading', { name: 'Оплата прошла — спасибо!' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe('/api/v1/payments/p-1');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Перейти к делу' }));
    expect(screen.getByText('journey-screen')).toBeInTheDocument();
  });

  it('offers another try after a canceled payment', async () => {
    statuses('CANCELED');
    renderAt('/pay/return?payment=p-1');

    expect(await screen.findByRole('heading', { name: 'Оплата не прошла' })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Попробовать ещё раз' }));
    expect(screen.getByText('pay-screen')).toBeInTheDocument();
  });

  it('stops polling a slow payment and lets the person check again', async () => {
    const fetchMock = statuses('PENDING');
    renderAt('/pay/return?payment=p-1');

    expect(await screen.findByRole('heading', { name: 'Банк ещё подтверждает оплату' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(15);

    statuses('SUCCEEDED');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Проверить ещё раз' }));
    expect(await screen.findByRole('heading', { name: 'Оплата прошла — спасибо!' })).toBeInTheDocument();
  });

  it('explains a link without a payment id', () => {
    renderAt('/pay/return');

    expect(screen.getByRole('heading', { name: 'Ссылка открылась не целиком' })).toBeInTheDocument();
  });
});
