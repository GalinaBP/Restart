import type { ApiErrorBody } from './types';

// Absolute base URL baked in at build time (VITE_API_BASE); the dev server proxies /api to the
// backend, so the same-origin default works with `npm run dev`.
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1';

const TOKEN_KEY = 'restart.accessToken';

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/** Error thrown for any non-2xx response, carrying the backend's stable ApiError payload when present. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly body?: ApiErrorBody;

  constructor(status: number, code: string, message: string, body?: ApiErrorBody) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = tokenStore.get();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const errorBody = payload as ApiErrorBody | undefined;
    throw new ApiError(
      response.status,
      errorBody?.code ?? 'UNKNOWN',
      errorBody?.message ?? response.statusText,
      errorBody,
    );
  }

  return payload as T;
}
