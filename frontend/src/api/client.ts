import type { ApiErrorBody } from './types';

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1';

const TOKEN_KEY = 'restart.accessToken';
const REFRESH_KEY = 'restart.refreshToken';

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  getRefresh: (): string | null => localStorage.getItem(REFRESH_KEY),
  set: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

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
  retried?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, retried = false } = options;

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

  if (response.status === 401 && auth && !retried && tokenStore.getRefresh()) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, { method, body, auth, retried: true });
    }
  }

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

export async function download(path: string, method: string = 'GET'): Promise<Blob> {
  const token = tokenStore.get();
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const text = await response.text();
    let body: ApiErrorBody | undefined;
    try {
      body = text ? (JSON.parse(text) as ApiErrorBody) : undefined;
    } catch {
      body = undefined;
    }
    throw new ApiError(response.status, body?.code ?? 'DOWNLOAD_FAILED',
      body?.message ?? 'Не получилось скачать файл', body);
  }
  return response.blob();
}

async function tryRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokenStore.getRefresh() }),
    });
    if (!response.ok) {
      tokenStore.clear();
      return false;
    }
    const tokens = (await response.json()) as { accessToken: string; refreshToken: string };
    tokenStore.set(tokens.accessToken, tokens.refreshToken);
    return true;
  } catch {
    return false;
  }
}
