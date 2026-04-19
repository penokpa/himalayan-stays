import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "hs-pms-local";
const DB_VERSION = 1;
const STORE = "docs";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "_id" });
        }
      },
    });
  }
  return dbPromise;
}

/** Get a document by ID, returns null if not found */
export async function getDoc<T>(id: string): Promise<T | null> {
  const db = await getDB();
  const doc = await db.get(STORE, id);
  return (doc as T) ?? null;
}

/** Put (create or update) a document — must have _id field */
export async function putDoc<T extends { _id: string }>(doc: T): Promise<void> {
  const db = await getDB();
  await db.put(STORE, doc);
}

/** Delete a document by ID */
export async function deleteDoc(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, id);
}

/** Get all documents matching a key prefix (e.g. "tab:default:") */
export async function getDocsByPrefix<T>(prefix: string): Promise<T[]> {
  const db = await getDB();
  const all = await db.getAll(STORE);
  return all.filter((doc: { _id: string }) => doc._id.startsWith(prefix)) as T[];
}

/** Get all documents in the store */
export async function getAllDocs<T>(): Promise<T[]> {
  const db = await getDB();
  return (await db.getAll(STORE)) as T[];
}
