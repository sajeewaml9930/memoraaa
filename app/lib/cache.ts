import type {
  Album,
  CollaboratorOption,
  Memory,
  MemorySender,
} from "@/app/types";

const DB_NAME = "memoraa-cache";
const DB_VERSION = 1;
export const MAX_MESSAGES_PER_ALBUM = 20;
const MAX_MESSAGES_TOTAL = 10000;

interface CachedMemory extends Memory {
  albumId: number;
  cacheKey: string;
  cachedAt: number;
}

interface CachedCollaborators {
  albumId: number;
  collaborators: CollaboratorOption[];
  cachedAt: number;
}

let databasePromise: Promise<IDBDatabase> | null = null;

function isBrowser() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDatabase(): Promise<IDBDatabase> {
  if (!isBrowser()) {
    return Promise.reject(new Error("Browser storage is unavailable"));
  }

  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const database = request.result;
      const messages = database.objectStoreNames.contains("messages")
        ? request.transaction!.objectStore("messages")
        : database.createObjectStore("messages", { keyPath: "cacheKey" });
      if (!messages.indexNames.contains("albumId")) {
        messages.createIndex("albumId", "albumId", { unique: false });
      }
      if (!messages.indexNames.contains("cachedAt")) {
        messages.createIndex("cachedAt", "cachedAt", { unique: false });
      }
      if (!database.objectStoreNames.contains("albums")) {
        database.createObjectStore("albums", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("users")) {
        database.createObjectStore("users", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("collaborators")) {
        database.createObjectStore("collaborators", { keyPath: "albumId" });
      }
      if (!database.objectStoreNames.contains("meta")) {
        database.createObjectStore("meta", { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });

  return databasePromise;
}

async function runTransaction<T>(
  stores: string[],
  mode: IDBTransactionMode,
  operation: (transaction: IDBTransaction) => T,
): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(stores, mode);
    const result = operation(transaction);
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function messageKey(albumId: number, memoryId: number) {
  return `${albumId}:${memoryId}`;
}

function messageTimestamp(memory: Memory) {
  const timestamp = new Date(memory.createdAt || memory.memoryDate).getTime();
  return Number.isNaN(timestamp) ? memory.id : timestamp;
}

function newestMessages<T extends Memory>(memories: T[]): T[] {
  return [...memories]
    .sort((a, b) => messageTimestamp(b) - messageTimestamp(a) || b.id - a.id)
    .slice(0, MAX_MESSAGES_PER_ALBUM);
}

export async function initializeCache() {
  if (!isBrowser()) return;
  try {
    await openDatabase();
    if (navigator.storage?.persist) {
      await navigator.storage.persist();
    }
  } catch (error) {
    console.warn("Memoraa cache is unavailable:", error);
  }
}

export async function getMessages(albumId: number): Promise<Memory[]> {
  if (!isBrowser()) return [];
  try {
    const records = await runTransaction(
      ["messages"],
      "readonly",
      (transaction) => {
        const request = transaction
          .objectStore("messages")
          .index("albumId")
          .getAll(albumId);
        return new Promise<CachedMemory[]>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      },
    );
    return newestMessages(
      records.map((record) => {
        const { cacheKey, cachedAt, ...memory } = record;
        void cacheKey;
        void cachedAt;
        return memory as Memory;
      }),
    ).sort((a, b) => messageTimestamp(a) - messageTimestamp(b) || a.id - b.id);
  } catch {
    return [];
  }
}

export async function saveMessages(albumId: number, memories: Memory[]) {
  if (!isBrowser()) return;
  try {
    await runTransaction(["messages"], "readwrite", (transaction) => {
      const store = transaction.objectStore("messages");
      const now = Date.now();
      newestMessages(memories).forEach((memory) => {
        store.put({
          ...memory,
          albumId,
          cacheKey: messageKey(albumId, memory.id),
          cachedAt: now,
        } satisfies CachedMemory);
      });
    });
    await pruneMessages(albumId);
  } catch (error) {
    console.warn("Unable to save messages to cache:", error);
  }
}

export async function replaceMessages(albumId: number, memories: Memory[]) {
  if (!isBrowser()) return;
  try {
    await runTransaction(["messages"], "readwrite", (transaction) => {
      const store = transaction.objectStore("messages");
      const request = store.index("albumId").getAllKeys(albumId);
      request.onsuccess = () => {
        request.result.forEach((key) => store.delete(key));
        const now = Date.now();
        newestMessages(memories).forEach((memory) => {
          store.put({
            ...memory,
            albumId,
            cacheKey: messageKey(albumId, memory.id),
            cachedAt: now,
          } satisfies CachedMemory);
        });
      };
    });
    await pruneMessages(albumId);
  } catch (error) {
    console.warn("Unable to replace messages in cache:", error);
  }
}

export async function saveMessage(albumId: number, memory: Memory) {
  return saveMessages(albumId, [memory]);
}

export async function removeMessage(albumId: number, memoryId: number) {
  if (!isBrowser()) return;
  try {
    await runTransaction(["messages"], "readwrite", (transaction) => {
      transaction.objectStore("messages").delete(messageKey(albumId, memoryId));
    });
  } catch {
    // Cache failures must never block the application.
  }
}

async function pruneMessages(albumId: number) {
  await runTransaction(["messages"], "readwrite", (transaction) => {
    const store = transaction.objectStore("messages");
    const request = store.getAll();
    request.onsuccess = () => {
      const records = request.result as CachedMemory[];
      const albumRecords = records.filter(
        (record) => record.albumId === albumId,
      );
      const keep = new Set(
        newestMessages(albumRecords).map((record) => record.cacheKey),
      );
      albumRecords
        .filter((record) => !keep.has(record.cacheKey))
        .forEach((record) => store.delete(record.cacheKey));
      const remaining = records.filter((record) => record.albumId !== albumId);
      remaining
        .sort((a, b) => a.cachedAt - b.cachedAt)
        .slice(0, Math.max(0, remaining.length - MAX_MESSAGES_TOTAL))
        .forEach((record) => store.delete(record.cacheKey));
    };
  });
}

export async function saveAlbum(album: Album) {
  if (!isBrowser()) return;
  try {
    await runTransaction(["albums"], "readwrite", (transaction) => {
      transaction.objectStore("albums").put(album);
    });
  } catch {
    // Cache failures must never block the application.
  }
}

export async function getAlbums(): Promise<Album[]> {
  if (!isBrowser()) return [];
  try {
    return await runTransaction(["albums"], "readonly", (transaction) => {
      const request = transaction.objectStore("albums").getAll();
      return new Promise<Album[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  } catch {
    return [];
  }
}

export async function saveAlbums(albums: Album[]) {
  await Promise.all(albums.map((album) => saveAlbum(album)));
}

export async function getAlbum(albumId: number): Promise<Album | null> {
  if (!isBrowser()) return null;
  try {
    return await runTransaction(["albums"], "readonly", (transaction) => {
      const request = transaction.objectStore("albums").get(albumId);
      return new Promise<Album | null>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
      });
    });
  } catch {
    return null;
  }
}

export async function saveUsers(users: MemorySender[]) {
  if (!isBrowser() || users.length === 0) return;
  try {
    await runTransaction(["users"], "readwrite", (transaction) => {
      const store = transaction.objectStore("users");
      users.forEach((user) => store.put(user));
    });
  } catch {
    // Cache failures must never block the application.
  }
}

export async function saveCollaborators(
  albumId: number,
  collaborators: CollaboratorOption[],
) {
  if (!isBrowser()) return;
  try {
    await runTransaction(["collaborators"], "readwrite", (transaction) => {
      transaction.objectStore("collaborators").put({
        albumId,
        collaborators,
        cachedAt: Date.now(),
      } satisfies CachedCollaborators);
    });
  } catch {
    // Cache failures must never block the application.
  }
}

export async function getCollaborators(
  albumId: number,
): Promise<CollaboratorOption[]> {
  if (!isBrowser()) return [];
  try {
    const record = await runTransaction(
      ["collaborators"],
      "readonly",
      (transaction) => {
        const request = transaction.objectStore("collaborators").get(albumId);
        return new Promise<CachedCollaborators | null>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result ?? null);
          request.onerror = () => reject(request.error);
        });
      },
    );
    return record?.collaborators ?? [];
  } catch {
    return [];
  }
}

export async function invalidateCache(albumId?: number) {
  if (!isBrowser()) return;
  try {
    await runTransaction(
      albumId == null
        ? ["messages", "albums", "collaborators"]
        : ["messages", "albums", "collaborators"],
      "readwrite",
      (transaction) => {
        const messages = transaction.objectStore("messages");
        const albums = transaction.objectStore("albums");
        const collaborators = transaction.objectStore("collaborators");
        if (albumId == null) {
          messages.clear();
          albums.clear();
          collaborators.clear();
          return;
        }
        const request = messages.index("albumId").getAllKeys(albumId);
        request.onsuccess = () =>
          request.result.forEach((key) => messages.delete(key));
        albums.delete(albumId);
        collaborators.delete(albumId);
      },
    );
    if (albumId == null && "caches" in window) {
      await caches.delete("memoraa-media-v1");
    }
  } catch (error) {
    console.warn("Unable to clear Memoraa cache:", error);
  }
}

export const clearCache = () => invalidateCache();
