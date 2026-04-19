/**
 * In-memory mock of the IndexedDB-based db module for testing.
 */
const store = new Map<string, unknown>();

export function clearStore() {
  store.clear();
}

export async function getDoc<T>(id: string): Promise<T | null> {
  return (store.get(id) as T) ?? null;
}

export async function putDoc<T extends { _id: string }>(doc: T): Promise<void> {
  store.set(doc._id, structuredClone(doc));
}

export async function deleteDoc(id: string): Promise<void> {
  store.delete(id);
}

export async function getDocsByPrefix<T>(prefix: string): Promise<T[]> {
  const results: T[] = [];
  for (const [key, val] of store) {
    if (key.startsWith(prefix)) results.push(val as T);
  }
  return results;
}

export async function getAllDocs<T>(): Promise<T[]> {
  return [...store.values()] as T[];
}
