import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// This jsdom build does not expose localStorage; provide a minimal in-memory shim so the
// app's tokenStore works under test.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  const shim: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (key) => void store.delete(key),
    setItem: (key, value) => void store.set(key, String(value)),
  };
  Object.defineProperty(globalThis, 'localStorage', { value: shim, configurable: true });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});
