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

export function logout(): void {
  tokenStore.clear();
}

export function isSignedIn(): boolean {
  return tokenStore.get() !== null;
}
