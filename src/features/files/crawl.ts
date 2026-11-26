import { isHidden } from '../../lib/files/filter';

export interface Listed {
  type: string;
  name: string;
  display_name?: string;
}

export interface Found<E extends Listed> {
  entry: E;
  /// The folder's path for the printer (8.3 names), relative to the USB root.
  dir: string;
  /// The same path as people read it.
  where: string;
}

/// At most this many folders are listed per search: the printer answers one
/// listing at a time, and a stick with hundreds of folders would keep it busy
/// for minutes.
export const MAX_FOLDERS = 100;

const label = (e: Listed) => e.display_name ?? e.name;

/// Folder listings searches have read, by path; dropped whenever the page
/// lists a folder again (an upload or a refresh may have changed it).
export const listings = new Map<string, Listed[]>();

/// Files whose names contain `query`, in the folders below `start`, found by
/// listing one folder after another. Listings are cached for the visit, so a
/// second search costs the printer nothing. Stops when `signal` aborts.
export async function searchBelow<E extends Listed>(
  start: { dir: string; where: string },
  query: string,
  list: (dir: string) => Promise<E[]>,
  cache: Map<string, E[]>,
  signal: AbortSignal,
  onFound: (found: Found<E>[], folders: number) => void,
): Promise<{ folders: number; capped: boolean }> {
  const needle = query.trim().toLowerCase();
  const queue = [start];
  let folders = 0;
  while (queue.length && !signal.aborted) {
    if (folders >= MAX_FOLDERS) return { folders, capped: true };
    const folder = queue.shift();
    if (!folder) break;
    let entries = cache.get(folder.dir);
    if (!entries) {
      try {
        entries = await list(folder.dir);
      } catch {
        continue;
      }
      cache.set(folder.dir, entries);
    }
    folders += 1;
    const visible = entries.filter(
      (e) => !isHidden(label(e)) && !isHidden(e.name),
    );
    for (const e of visible.filter((x) => x.type === 'FOLDER'))
      queue.push({
        dir: folder.dir ? `${folder.dir}/${e.name}` : e.name,
        where: folder.where ? `${folder.where} / ${label(e)}` : label(e),
      });
    if (folder.dir === start.dir) continue;
    const hits = visible
      .filter(
        (e) => e.type !== 'FOLDER' && label(e).toLowerCase().includes(needle),
      )
      .map((entry) => ({ entry, dir: folder.dir, where: folder.where }));
    if (hits.length) onFound(hits, folders);
  }
  return { folders, capped: false };
}
