import { request } from './client';

export interface PaymentAccess {
  granted: boolean;
  price: number;
  currency: string;
}

export interface StartedPayment {
  paymentId: string;
  confirmationUrl: string;
}

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'CANCELED';

let grantedForToken: string | null = null;

export function rememberAccess(token: string | null): void {
  grantedForToken = token;
}

export function hasRememberedAccess(token: string | null): boolean {
  return token !== null && token === grantedForToken;
}

export function getAccess(): Promise<PaymentAccess> {
  return request<PaymentAccess>('/payments/access');
}

export function startPayment(): Promise<StartedPayment> {
  return request<StartedPayment>('/payments', { method: 'POST' });
}

export async function paymentStatus(paymentId: string): Promise<PaymentStatus> {
  const response = await request<{ status: PaymentStatus }>(
    `/payments/${encodeURIComponent(paymentId)}`,
  );
  return response.status;
}

export function formatPrice(price: number, currency: string): string {
  const amount = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(price);
  return `${amount} ${currency === 'RUB' ? '₽' : currency}`;
}
