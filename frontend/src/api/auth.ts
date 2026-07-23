import { request, tokenStore } from './client';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
}

/** Creates the account and signs in (the backend auto-logs-in on register). */
export async function register(email: string, password: string): Promise<void> {
  const tokens = await request<TokenResponse>('/auth/register', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
  tokenStore.set(tokens.accessToken, tokens.refreshToken);
}

export async function login(email: string, password: string): Promise<void> {
  const tokens = await request<TokenResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
  tokenStore.set(tokens.accessToken, tokens.refreshToken);
}

/** Always resolves (204) — the backend never reveals whether the email is registered. */
export async function requestPasswordReset(email: string): Promise<void> {
  await request<void>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
    auth: false,
  });
}

export async function confirmPasswordReset(token: string, password: string): Promise<void> {
  await request<void>('/auth/reset-password', {
    method: 'POST',
    body: { token, password },
    auth: false,
  });
}

export function logout(): void {
  tokenStore.clear();
}

export function isSignedIn(): boolean {
  return tokenStore.get() !== null;
}
