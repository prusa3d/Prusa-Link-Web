import { api } from '../../lib/api/client';
import { downloadObjects } from '../../lib/api/download';
import {
  knownObjects,
  objectsKey,
  rememberObjects,
} from '../../lib/files/objects-cache';
import type { PlateObject } from '../../lib/files/objects-info';
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

type FetchList = (job: number) => Promise<Listing | undefined>;
type FetchShapes = (path: string) => Promise<PlateObject[] | undefined>;
type Cancel = (job: number, id: number) => Promise<boolean>;

const fetchList: FetchList = async (job) => {
  const { data, response } = await api.GET('/api/v1/job/{id}/objects', {
    params: { path: { id: job } },
  });
  return response.ok ? data : undefined;
};

const cancelObject: Cancel = async (job, id) =>
  (
    await api.PUT('/api/v1/job/{id}/objects/{object_id}/cancel', {
      params: { path: { id: job, object_id: id } },
    })
  ).response.ok;

const download = (path: string) =>
  downloadObjects(`/usb/${path.split('/').map(encodeURIComponent).join('/')}`);

/// The objects of the current print (PrusaLink 2 cancel object). The list
/// is fetched when the status's `cancel_object_revision` changes; the
/// outlines once per job, from the upload's own reading or the file's head.
export class PlateObjects {
  #list = $state<Listing | undefined>();
  #shapes = $state<PlateObject[] | undefined>();
  #cancelling = $state<number | undefined>();
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
    const key = objectsKey(
      slash < 0 ? '' : file.path.slice(0, slash),
      file.displayName,
    );
    if (key === this.#shapesFor) return;
    this.#shapesFor = key;
    let shapes = knownObjects(key);
    if (!shapes) {
      shapes = await this.#fetchShapes(file.path);
      if (shapes) rememberObjects(key, shapes);
    }
    if (this.#shapesFor === key) this.#shapes = shapes;
  }

  async cancel(id: number): Promise<boolean> {
    const job = this.#job;
    if (job === undefined || this.#cancelling !== undefined) return false;
    this.#cancelling = id;
    try {
      const ok = await this.#cancel(job, id);
      if (ok) {
        this.#listFor = undefined;
        this.#list = await this.#fetchList(job);
      }
      return ok;
    } finally {
      this.#cancelling = undefined;
    }
  }
}

export const plateObjects = new PlateObjects();
