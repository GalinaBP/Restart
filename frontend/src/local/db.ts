const DB_NAME = 'restart';
const DB_VERSION = 1;

export const CASE_STORE = 'case';
export const DOCUMENT_STORE = 'documents';

let open: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (open === null) {
    open = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(CASE_STORE)) {
          db.createObjectStore(CASE_STORE);
        }
        if (!db.objectStoreNames.contains(DOCUMENT_STORE)) {
          db.createObjectStore(DOCUMENT_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB недоступен'));
      request.onblocked = () => reject(new Error('IndexedDB заблокирован другой вкладкой'));
    });
  }
  return open;
}

async function run<T>(
  store: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const request = action(transaction.objectStore(store));
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error ?? new Error('Не удалось обратиться к хранилищу'));
  });
}

export function get<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  return run<T | undefined>(store, 'readonly', (objectStore) => objectStore.get(key));
}

export function getAll<T>(store: string): Promise<T[]> {
  return run<T[]>(store, 'readonly', (objectStore) => objectStore.getAll());
}

export function put(store: string, key: IDBValidKey, value: unknown): Promise<void> {
  return run(store, 'readwrite', (objectStore) => objectStore.put(value, key));
}

export function remove(store: string, key: IDBValidKey): Promise<void> {
  return run(store, 'readwrite', (objectStore) => objectStore.delete(key));
}

export function clear(store: string): Promise<void> {
  return run(store, 'readwrite', (objectStore) => objectStore.clear());
}

export function isAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}
