import { api } from '../../lib/api/client';
import { fileHeader } from '../../lib/api/download';
import { fileKey } from '../../lib/files/header-cache';
import { objectsOf, type PlateObject } from '../../lib/files/header';
import type { JobFile } from '../../lib/stores/printer.svelte';

/// One object of the print: the printer's id and state, with its outline
/// from the file when the page has it.
export interface PlateItem {
  id: number;
  name: string;
  canceled: boolean;
  /// Being printed now.
  current: boolean;
  polygon?: PlateObject['polygon'] | undefined;
}

interface Listing {
  current?: number | undefined;
  objects: { id: number; canceled: boolean; name?: string | undefined }[];
}

type FetchList = (job: number, fresh?: boolean) => Promise<Listing | undefined>;
type FetchShapes = (
  path: string,
  key: string,
) => Promise<PlateObject[] | undefined>;
type Cancel = (job: number, id: number, cancel: boolean) => Promise<boolean>;

const fetchList: FetchList = async (job, fresh) => {
  const { data, response } = await api.GET('/api/v1/job/{id}/objects', {
    params: { path: { id: job } },
    ...(fresh && { cache: 'no-store' as const }),
  });
  return response.ok ? data : undefined;
};

const cancelObject: Cancel = async (job, id, cancel) => {
  const params = { params: { path: { id: job, object_id: id } } };
  return (
    cancel
      ? await api.PUT('/api/v1/job/{id}/objects/{object_id}/cancel', params)
      : await api.PUT('/api/v1/job/{id}/objects/{object_id}/uncancel', params)
  ).response.ok;
};

/// How long the printer has to report a cancel it took, and how often the
/// page asks meanwhile.
const CONFIRM_MS = 5000;
const CONFIRM_EVERY_MS = 400;

const download: FetchShapes = async (path, key) =>
  objectsOf(await fileHeader(path, key));

/// The objects of the current print (PrusaLink 2 cancel object). The list
/// is fetched when the status's `cancel_object_revision` changes; the
/// outlines once per job, from the upload's own reading or the file's head.
export class PlateObjects {
  #list = $state<Listing | undefined>();
  #shapes = $state<PlateObject[] | undefined>();
  #cancelling = $state<number | undefined>();
  #failed = $state<number | undefined>();
  #listFor: string | undefined;
  #shapesFor: string | undefined;
  #job: number | undefined;
  #fetchList: FetchList;
  #fetchShapes: FetchShapes;
  #cancel: Cancel;

  constructor(
    list: FetchList = fetchList,
    shapes: FetchShapes = download,
    cancel: Cancel = cancelObject,
  ) {
    this.#fetchList = list;
    this.#fetchShapes = shapes;
    this.#cancel = cancel;
  }

  get items(): PlateItem[] {
    const list = this.#list;
    if (!list) return [];
    return list.objects.map((o) => {
      const shape = this.#shapes?.[o.id];
      return {
        id: o.id,
        name: o.name ?? shape?.name ?? `#${String(o.id + 1)}`,
        canceled: o.canceled,
        current: list.current === o.id,
        polygon: shape?.polygon,
      };
    });
  }

  /// The object whose cancel is on its way.
  get cancelling() {
    return this.#cancelling;
  }

  /// Fed the job, its file and the objects revision on every status.
  async follow(
    job: number | undefined,
    revision: number | undefined,
    file: JobFile | undefined,
  ) {
    this.#job = job;
    if (job === undefined || revision === undefined) {
      this.#list = undefined;
      this.#shapes = undefined;
      this.#listFor = this.#shapesFor = undefined;
      return;
    }
    const listFor = `${String(job)}:${String(revision)}`;
    if (listFor !== this.#listFor) {
      this.#listFor = listFor;
      this.#list = await this.#fetchList(job);
    }
    if (!file || !this.#list?.objects.length) return;
    const slash = file.path.lastIndexOf('/');
    const key = fileKey(
      slash < 0 ? '' : file.path.slice(0, slash),
      file.displayName,
    );
    if (key === this.#shapesFor) return;
    this.#shapesFor = key;
    const shapes = await this.#fetchShapes(file.path, key);
    if (this.#shapesFor === key) this.#shapes = shapes;
  }

  /// The object whose last cancel or undo the printer refused or never
  /// confirmed.
  get failed() {
    return this.#failed;
  }

  /// Cancels an object (or undoes it), and waits until the printer's list
  /// says so: its 204 only means it took the request.
  async cancel(id: number, cancel = true): Promise<boolean> {
    const job = this.#job;
    if (job === undefined || this.#cancelling !== undefined) return false;
    this.#cancelling = id;
    this.#failed = undefined;
    try {
      if (await this.#cancel(job, id, cancel)) {
        for (let waited = 0; waited <= CONFIRM_MS; waited += CONFIRM_EVERY_MS) {
          const list = await this.#fetchList(job, true);
          if (list?.objects.find((o) => o.id === id)?.canceled === cancel) {
            this.#list = list;
            return true;
          }
          await new Promise((r) => setTimeout(r, CONFIRM_EVERY_MS));
        }
      }
      this.#failed = id;
      return false;
    } finally {
      this.#cancelling = undefined;
    }
  }
}

export const plateObjects = new PlateObjects();
