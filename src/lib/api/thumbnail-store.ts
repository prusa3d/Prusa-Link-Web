/// Printer thumbnails kept in the browser between visits (IndexedDB: it also
/// works on a printer's plain-HTTP address, where the Cache API does not).
/// Finding a picture costs the printer a pass over the G-code file, so a
/// picture is asked for once per file version: the key is the file's path
/// plus its modification time and size, and a file replaced under the same
/// name gets a new key. At most MAX pictures are kept, oldest out first.

const DB = 'prusalink-thumbnails';
const STORE = 'pictures';
const MAX = 400;

let opened: Promise<IDBDatabase | undefined> | undefined;

function db(): Promise<IDBDatabase | undefined> {
  opened ??= new Promise((resolve) => {
    try {
      const request = globalThis.indexedDB.open(DB, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE).createIndex('at', 'at');
      };
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        resolve(undefined);
      };
    } catch {
      resolve(undefined);
    }
  });
  return opened;
}

const done = <T>(request: IDBRequest<T>) =>
  new Promise<T | undefined>((resolve) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      resolve(undefined);
    };
  });

export async function storedThumbnail(key: string): Promise<Blob | undefined> {
  const base = await db();
  if (!base) return undefined;
  const entry = (await done(
    base.transaction(STORE).objectStore(STORE).get(key),
  )) as { blob?: Blob } | undefined;
  return entry?.blob;
}

export async function storeThumbnail(key: string, blob: Blob) {
  const base = await db();
  if (!base) return;
  const store = base.transaction(STORE, 'readwrite').objectStore(STORE);
  await done(store.put({ blob, at: Date.now() }, key));
  const count = (await done(store.count())) ?? 0;
  if (count <= MAX) return;
  let extra = count - MAX;
  const cursor = store.index('at').openCursor();
  cursor.onsuccess = () => {
    const c = cursor.result;
    if (!c || extra <= 0) return;
    c.delete();
    extra -= 1;
    c.continue();
  };
}
