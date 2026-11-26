import type { PlateObject } from './objects-info';

/// Object outlines by the file's place on the printer (`dir/long name`):
/// read from the file itself on upload, or downloaded once per job. Kept in
/// the tab's session too, so a reload does not download them again.
const STORE = 'prusalink.objects:';
const memory = new Map<string, PlateObject[]>();

export const objectsKey = (dir: string, name: string) =>
  dir ? `${dir}/${name}` : name;

export function rememberObjects(key: string, objects: PlateObject[]) {
  memory.set(key, objects);
  try {
    globalThis.sessionStorage.setItem(STORE + key, JSON.stringify(objects));
  } catch {
    // Too large for the session, or no storage: kept in memory only.
  }
}

export function knownObjects(key: string): PlateObject[] | undefined {
  let objects = memory.get(key);
  if (!objects) {
    try {
      const saved = globalThis.sessionStorage.getItem(STORE + key);
      objects = saved ? (JSON.parse(saved) as PlateObject[]) : undefined;
    } catch {
      objects = undefined;
    }
    if (objects) memory.set(key, objects);
  }
  return objects;
}
