import { api } from '../api/client';
import { fileVersion } from '../api/thumbnail';
import type { components } from '../api/schema';

export type Status = components['schemas']['StatusPrinter'];
export type StatusJob = components['schemas']['StatusJob'];

/// The file being printed, from /api/v1/job.
export interface JobFile {
  name: string;
  displayName: string;
  /// The small picture only; the status card is polled.
  icon?: string | undefined;
  /// The large picture, shrunk in the page when the file has no small one.
  thumbnail?: string | undefined;
  /// Its path on the USB drive (`toys/DRAGON~1.BGC`), to print it again.
  path: string;
  /// Its modification time and size, the key its pictures are kept under.
  version?: string | undefined;
}

type FetchJobFile = () => Promise<JobFile | undefined>;

const fetchJobFile: FetchJobFile = async () => {
  const { data } = await api.GET('/api/v1/job');
  const file = (
    data as
      | {
          file?: {
            name: string;
            display_name?: string;
            path?: string;
            m_timestamp?: number;
            size?: number;
            refs?: { icon?: string; thumbnail?: string };
          };
        }
      | undefined
  )?.file;
  return (
    file && {
      name: file.name,
      displayName: file.display_name ?? file.name,
      icon: file.refs?.icon,
      thumbnail: file.refs?.thumbnail,
      version: fileVersion(file),
      path: [file.path?.replace(/^\/usb\/?/, ''), file.name]
        .filter(Boolean)
        .join('/'),
    }
  );
};

type FetchStatus = (expanded: boolean) => Promise<{
  printer?: Status | undefined;
  job?: StatusJob | undefined;
}>;

const fetchStatus: FetchStatus = async (expanded) => {
  const { data, response } = await api.GET(
    '/api/v1/status',
    expanded ? { params: { query: { expanded: true } } } : {},
  );
  if (!response.ok) throw new Error(`status ${String(response.status)}`);
  return data ?? {};
};

/// The printer's answer to a pause, resume or stop.
export interface ControlAnswer {
  ok: boolean;
  status?: number | undefined;
  said?: string | undefined;
}

export interface LastPrint {
  file: JobFile;
  result: 'FINISHED' | 'STOPPED' | 'ERROR';
  /// When the page saw it end.
  at: number;
}

export interface Sample {
  nozzle: number;
  bed: number;
  nozzleTarget: number;
  bedTarget: number;
}

const SAMPLE_MS = 5000;
const SAMPLES = 720;

/// Printer telemetry, polled. Read-only from outside by design: the printer
/// owns this state.
export class PrinterStore {
  #status = $state<Status | undefined>();
  #job = $state<StatusJob | undefined>();
  #error = $state(false);
  #jobFile = $state<JobFile | undefined>();
  #jobFileFor: number | undefined;
  #history = $state<Sample[]>([]);
  #last = $state<LastPrint | undefined>();
  #sampledAt = 0;
  #fetch: FetchStatus;
  #fetchJobFile: FetchJobFile;
  /// Ask for every tool, the chamber and the change counters (PrusaLink 2).
  expanded = false;

  constructor(
    fetch: FetchStatus = fetchStatus,
    jobFile: FetchJobFile = fetchJobFile,
  ) {
    this.#fetch = fetch;
    this.#fetchJobFile = jobFile;
  }

  /// The file of the current job; fetched once per job.
  get jobFile() {
    return this.#jobFile;
  }

  get status() {
    return this.#status;
  }

  get job() {
    return this.#job;
  }

  get offline() {
    return this.#error;
  }

  /// The last print that ended while the page was open, and how. Kept after
  /// the printer forgets it (its job ends once it is idle again).
  get last() {
    return this.#last;
  }

  /// Nozzle and bed over the last hour, one sample per 5 s, oldest
  /// first. Kept in the page only: the printer remembers none.
  get history(): readonly Sample[] {
    return this.#history;
  }

  async refresh() {
    try {
      const data = await this.#fetch(this.expanded);
      this.#status = data.printer;
      this.#job = data.job;
      this.#error = false;
      this.#sample(data.printer);
      const state = data.printer?.state;
      if (
        this.#jobFile &&
        (state === 'FINISHED' || state === 'STOPPED' || state === 'ERROR') &&
        this.#last?.file !== this.#jobFile
      )
        this.#last = { file: this.#jobFile, result: state, at: Date.now() };
      const id = data.job?.id;
      if (id !== this.#jobFileFor) {
        this.#jobFileFor = id;
        this.#jobFile =
          id === undefined ? undefined : await this.#fetchJobFile();
      }
    } catch {
      this.#error = true;
    }
  }

  #sample(s: Status | undefined, now = Date.now()) {
    if (!s || now - this.#sampledAt < SAMPLE_MS) return;
    this.#sampledAt = now;
    this.#history = [
      ...this.#history.slice(1 - SAMPLES),
      {
        nozzle: s.temp_nozzle ?? 0,
        bed: s.temp_bed ?? 0,
        nozzleTarget: s.target_nozzle ?? 0,
        bedTarget: s.target_bed ?? 0,
      },
    ];
  }

  /// Pauses, resumes or stops the current job. When the printer refuses,
  /// the answer carries its HTTP status and what it said.
  async control(action: 'pause' | 'resume' | 'stop'): Promise<ControlAnswer> {
    const id = this.#job?.id;
    if (id === undefined) return { ok: false };
    const params = { params: { path: { id } } };
    let result: { response: Response; error?: unknown };
    if (action === 'stop')
      result = await api.DELETE('/api/v1/job/{id}', params);
    else if (action === 'pause')
      result = await api.PUT('/api/v1/job/{id}/pause', params);
    else result = await api.PUT('/api/v1/job/{id}/resume', params);
    await this.refresh();
    const { response, error } = result;
    const said =
      typeof error === 'string'
        ? error
        : ((error as { message?: string; title?: string } | undefined)
            ?.message ?? (error as { title?: string } | undefined)?.title);
    const words = said?.trim();
    return {
      ok: response.ok,
      status: response.status,
      said: words === '' ? undefined : words,
    };
  }

  /// Polls until the returned function is called: every `visibleMs` while
  /// the page is on screen, every `hiddenMs` in a background tab, and at
  /// once when it comes back. The next poll is timed from the last answer,
  /// so a slow printer never collects a queue of them.
  poll(visibleMs = 1000, hiddenMs = 5000): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let waiting = false;
    let stopped = false;
    const doc = globalThis.document as Document | undefined;
    const tick = () => {
      clearTimeout(timer);
      if (waiting || stopped) return;
      waiting = true;
      void this.refresh().finally(() => {
        waiting = false;
        if (!stopped)
          timer = setTimeout(tick, doc?.hidden ? hiddenMs : visibleMs);
      });
    };
    const shown = () => {
      if (!doc?.hidden) tick();
    };
    doc?.addEventListener('visibilitychange', shown);
    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
      doc?.removeEventListener('visibilitychange', shown);
    };
  }
}

export const printer = new PrinterStore();
