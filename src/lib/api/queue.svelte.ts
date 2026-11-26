/// Every request to the printer waits its turn here. The printer's web server
/// is small and slow (its network stack holds about three 1500-byte packets
/// at a time), so the page asks it PARALLEL things at a time (one by
/// default). What a person does goes first; pictures go last, and a picture
/// already on its way is cancelled and asked again later when a person's
/// action arrives, so an action never waits behind one.
///
/// For trying other limits on a real printer:
/// `localStorage.setItem('prusalink.parallel', '2')` and reload.

export enum Priority {
  /// Something the person just asked for: print, pause, stop, upload, sign in.
  Action = 0,
  /// Status polling and folder listings.
  Normal = 1,
  /// Thumbnails: cancelled for an action, then retried.
  Background = 2,
}

function configured(): number {
  try {
    const value = Number(globalThis.localStorage.getItem('prusalink.parallel'));
    return Number.isInteger(value) && value > 0 ? value : 1;
  } catch {
    return 1;
  }
}

export const PARALLEL = configured();

interface Job {
  priority: Priority;
  start: (signal: AbortSignal) => void;
  abort?: AbortController;
}

const waiting: Job[] = [];
const running: Job[] = [];
let counts = $state({ running: 0, waiting: 0 });

/// How busy the line to the printer is, for the header's indicator.
export function queueState(): { running: number; waiting: number } {
  return counts;
}

function count() {
  counts = { running: running.length, waiting: waiting.length };
}

function next() {
  while (running.length < PARALLEL && waiting.length) {
    let best = 0;
    waiting.forEach((job, i) => {
      if (job.priority < (waiting[best]?.priority ?? 9)) best = i;
    });
    const [job] = waiting.splice(best, 1);
    if (!job) break;
    job.abort = new AbortController();
    running.push(job);
    job.start(job.abort.signal);
  }
  count();
}

/// Runs `work` when the queue lets it; first come, first served within a
/// priority. Background work gets a signal: when it aborts, the work is put
/// back in the queue and run again later.
export function queued<T>(
  work: (signal: AbortSignal) => Promise<T>,
  priority = Priority.Normal,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const job: Job = {
      priority,
      start: (signal) => {
        const finish = () => {
          running.splice(running.indexOf(job), 1);
        };
        work(signal).then(
          (value) => {
            finish();
            resolve(value);
            next();
          },
          (error: unknown) => {
            finish();
            // A cancelled picture goes back in line.
            if (signal.aborted && priority === Priority.Background)
              waiting.push(job);
            else
              reject(error instanceof Error ? error : new Error(String(error)));
            next();
          },
        );
      },
    };
    waiting.push(job);
    if (priority === Priority.Action && running.length >= PARALLEL)
      for (const job of running)
        if (job.priority === Priority.Background) job.abort?.abort();
    next();
  });
}
