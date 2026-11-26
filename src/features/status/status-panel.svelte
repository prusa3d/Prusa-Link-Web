<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icon } from '../../lib/ui/icon';
  import { Clock, Pause, Play, Square } from '../../lib/ui/icon/icons';
  import HeaterRow from './heater-row.svelte';
  import HeatingProgress from '../heating/heating-progress.svelte';
  import ToolCard from './tool-card.svelte';
  import ToolList from './tool-list.svelte';
  import type { ToolRow } from '../../lib/printer/tools';

  import { smallThumbnail } from '../../lib/api/thumbnail';
  import { localThumbnail } from '../../lib/files/local-thumbnails';
  import { formatDuration, parseFileName } from '../../lib/files/name';
  import { t, type MessageKey } from '../../lib/i18n.svelte';
  import { STATE_FILL, STATE_TONE } from '../../lib/printer/state';
  import type {
    ControlAnswer,
    JobFile,
    Status,
    StatusJob,
  } from '../../lib/stores/printer.svelte';
  import { Badge } from '../../lib/ui/badge';
  import { Button } from '../../lib/ui/button';
  import { Dialog } from '../../lib/ui/dialog';
  import { Spinner } from '../../lib/ui/spinner';
  import { notices } from '../../lib/stores/notices.svelte';
  import { Thumbnail } from '../../lib/ui/thumbnail';

  interface Props {
    /// What needs the person now (warnings, refusals), under the heading.
    alerts?: Snippet;
    /// The printer itself, first and last in the card (picture and name; model
    /// and firmware).
    top?: Snippet;
    /// The printer's name, the panel's heading.
    name?: string | undefined;
    bottom?: Snippet;
    status: Status | undefined;
    job: StatusJob | undefined;
    jobFile?: JobFile | undefined;
    offline?: boolean;
    oncontrol?: (action: 'pause' | 'resume' | 'stop') => Promise<ControlAnswer>;
    /// The loaded filament, shown on the nozzle row.
    material?: string | undefined;
    /// Shown instead of the material when the printer cannot tell.
    materialNote?: string | undefined;
    nozzle?: number | undefined;
    /// Opens the filament dialog; unset while the printer cannot change it.
    onfilament?: (() => void) | undefined;
    onunload?: (() => void) | undefined;
    /// A filament change PrusaLink runs as a helper job: shown instead of the
    /// job, which is not the person's print.
    activity?: string | undefined;
    /// Every tool, on a printer with several that reports them (PrusaLink 2).
    tools?: ToolRow[] | undefined;
    ontoolfilament?: ((tool: number) => void) | undefined;
    /// The chamber's reading, where the printer reports one.
    chamber?: { temp?: number; target_temp?: number | null } | undefined;
    /// Under the readings: preheat, babysteps.
    controls?: Snippet;
  }

  let {
    alerts,
    name,
    top,
    bottom,
    status,
    job,
    jobFile,
    offline = false,
    oncontrol,
    material,
    materialNote,
    nozzle,
    onfilament,
    onunload,
    activity,
    tools,
    ontoolfilament,
    chamber,
    controls,
  }: Props = $props();
  const multi = $derived(__MULTI_TOOL__ && (tools?.length ?? 0) > 1);

  /// The action waiting for the person's yes.
  const FINISHED_SHOWN_MS = 5000;
  let confirm = $state<'pause' | 'stop' | undefined>();
  let controlFailed = $state(false);

  const tone = $derived(status ? STATE_TONE[status.state] : 'quiet');
  const progress = $derived(Math.round(job?.progress ?? 0));
  const remaining = $derived(formatDuration(job?.time_remaining ?? 0));
  const jobName = $derived(
    jobFile ? parseFileName(jobFile.displayName).name : undefined,
  );
  // A stopped or failed job is over: no picture, percent or bar, just a
  // line saying what was stopped.
  // A finished job shows its full bar for a moment, then the card goes back
  // to ready; the last-print card below keeps what it was.
  let finishedAt = $state<number | undefined>();
  $effect(() => {
    if (status?.state !== 'FINISHED') finishedAt = undefined;
    else finishedAt ??= Date.now();
  });
  const settled = $derived(
    status !== undefined &&
      finishedAt !== undefined &&
      Date.now() - finishedAt > FINISHED_SHOWN_MS,
  );
  const ended = $derived(
    status?.state === 'STOPPED' || status?.state === 'ERROR' || settled,
  );
  const far = (current: number | undefined, target: number | undefined) =>
    (target ?? 0) > 0 && Math.abs((current ?? 0) - (target ?? 0)) > 2;
  // A print's first minutes: the printer heats before the first layer.
  const preheating = $derived(
    status?.state === 'PRINTING' &&
      (job?.progress ?? 0) < 1 &&
      (far(status.temp_nozzle, status.target_nozzle) ||
        far(status.temp_bed, status.target_bed)),
  );
  const showJob = $derived(!!job && !activity && !ended);
  // The firmware leaves the remaining time out until it has an estimate
  // (while homing and heating): no "0m left" meanwhile.
  const showTime = $derived(
    status?.state !== 'ERROR' &&
      status?.state !== 'STOPPED' &&
      (job?.time_remaining ?? 0) > 0,
  );

  /// The action sent and not yet answered: its button shows it is waiting.
  let pending = $state<'pause' | 'resume' | 'stop' | undefined>();

  let slow = $state(false);

  // The printer answers a pause, resume or stop at once, but reaches the
  // state only after finishing the move and parking: the button waits for
  // the state, not for the answer.
  const REACHED = {
    pause: ['PAUSED'],
    resume: ['PRINTING'],
    stop: ['STOPPED'],
  };
  const ENDS = ['STOPPED', 'FINISHED', 'ERROR', 'IDLE', 'READY'];
  $effect(() => {
    const state = status?.state;
    if (!pending || !state) return;
    if (REACHED[pending].includes(state) || ENDS.includes(state)) {
      pending = undefined;
      slow = false;
    }
  });

  async function control(action: 'pause' | 'resume' | 'stop') {
    confirm = undefined;
    pending = action;
    slow = false;
    const answer: ControlAnswer = await (oncontrol?.(action) ??
      Promise.resolve({ ok: true }));
    controlFailed = !answer.ok;
    if (controlFailed) {
      // Said under the printer header: which request, and the printer's own
      // words, or what its status means.
      notices.add(
        t(`status.refused.${action}` as MessageKey),
        answer.status === 409
          ? t('status.refusedBusy')
          : [answer.status && `HTTP ${String(answer.status)}`, answer.said]
              .filter(Boolean)
              .join(': ') || undefined,
      );
      pending = undefined;
      return;
    }
    // Still on its way after a while: say so, and keep waiting.
    setTimeout(() => {
      if (pending === action) slow = true;
    }, 20_000);
  }
</script>

<!-- The heading row matches the file list's, so both cards start level. -->
<section aria-labelledby="status-title" class="flex flex-col gap-2">
  <div class="flex min-h-11 items-center">
    <h2
      id="status-title"
      class="text-lg font-semibold break-words"
      data-testid="printer-name"
    >
      {name ?? t('status.label')}
    </h2>
  </div>
  {@render alerts?.()}
  <div
    class={[
      'rounded-lg flex flex-col gap-4 border bg-card p-4 text-card-foreground',
      offline && 'opacity-60',
    ]}
  >
    {@render top?.()}
    {#if status}
      {#if activity}
        <div class="flex items-center gap-3" data-testid="filament-activity">
          <Spinner class="size-5 shrink-0 text-primary" />
          <div>
            <p class="font-medium">{activity}</p>
            <p class="text-sm text-muted-foreground">{t('filament.follow')}</p>
          </div>
        </div>
      {/if}

      {#if showJob}
        <p class="-mb-2 text-sm font-medium text-muted-foreground">
          {t('status.nowPrinting')}
        </p>
        <div class="flex gap-3">
          <Thumbnail
            src={localThumbnail(jobFile?.displayName) ??
              (jobFile
                ? (onScreen: () => boolean) =>
                    smallThumbnail(
                      onScreen,
                      jobFile.version,
                      jobFile.icon,
                      jobFile.thumbnail,
                      160,
                    )
                : undefined)}
            class="size-20"
          />
          <div class="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <p class="line-clamp-2 font-medium break-words">{jobName ?? '…'}</p>
            <div
              class="flex flex-wrap items-end justify-between gap-x-3 gap-y-1"
            >
              <div class="flex items-center gap-2">
                <p
                  class="text-3xl leading-none font-semibold tabular-nums"
                  data-testid="job-percent"
                >
                  {progress} %
                </p>
                {#if pending}
                  <Badge tone="attention" testid="job-badge"
                    >{t(`status.chip.${pending}` as MessageKey)}</Badge
                  >
                {:else if status.state === 'PAUSED'}
                  <Badge tone="quiet" testid="job-badge"
                    >{t('status.state.PAUSED')}</Badge
                  >
                {/if}
              </div>
              {#if showTime}
                <p
                  class="flex items-center gap-1.5 text-sm text-muted-foreground"
                  data-testid="job-progress"
                >
                  <Icon node={Clock} class="size-4" />
                  {t('status.remaining', { time: remaining })}
                </p>
              {/if}
            </div>
          </div>
        </div>
        <div
          role="progressbar"
          aria-label={t('status.progress')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-valuetext={showTime
            ? `${String(progress)} %, ${t('status.remaining', { time: remaining })}`
            : `${String(progress)} %`}
          class="h-3 w-full overflow-hidden rounded-full border border-border bg-muted"
        >
          <div
            class={[
              'h-full transition-all motion-reduce:transition-none',
              // A paused print's bar goes grey: it is not moving.
              status.state === 'PAUSED'
                ? 'bg-muted-foreground'
                : STATE_FILL[tone],
            ]}
            style:width="{progress}%"
          ></div>
        </div>
        <!-- Stop also while the printer asks something on its screen: the
             firmware takes it then, and the question may be one the person
             cannot answer from here. -->
        {#if oncontrol && (status.state === 'PRINTING' || status.state === 'PAUSED' || status.state === 'ATTENTION')}
          <div class="flex flex-wrap gap-2 [&>*]:flex-1">
            {#if status.state === 'ATTENTION'}
              <!-- Pause and resume wait for the printer's answer. -->
            {:else if status.state === 'PAUSED'}
              <Button
                variant="secondary"
                size="lg"
                disabled={offline || pending !== undefined}
                loading={pending === 'resume'}
                onclick={() => void control('resume')}
              >
                <Icon node={Play} />{t('status.resume')}
              </Button>
            {:else}
              <Button
                variant="secondary"
                size="lg"
                disabled={offline || pending !== undefined}
                loading={pending === 'pause'}
                onclick={() => (confirm = 'pause')}
              >
                <Icon node={Pause} />{t('status.pause')}
              </Button>
            {/if}
            <Button
              variant="destructive"
              size="lg"
              disabled={offline || pending !== undefined}
              loading={pending === 'stop'}
              onclick={() => (confirm = 'stop')}
            >
              <Icon node={Square} />{t('status.stop')}
            </Button>
          </div>
        {/if}
        {#if pending}
          <p
            class="text-sm text-muted-foreground"
            data-testid="control-pending"
          >
            {t(`status.waiting.${pending}` as MessageKey)}
            {#if slow}{t('status.stillWaiting')}{/if}
          </p>
        {/if}
      {/if}
      {#if __MULTI_TOOL__ && multi && tools}
        <ToolList {tools} onfilament={ontoolfilament} />
      {:else}
        <ToolCard
          label={t('status.tool')}
          {material}
          note={materialNote}
          {nozzle}
          onchange={onfilament}
          {onunload}
        />
      {/if}
      {#if preheating}
        <!-- A print that is still warming up: how far each heater is, and
             about how long until it starts, in place of the plain rows. -->
        <div class="flex flex-col gap-3" data-testid="print-heating">
          {#if (status.target_nozzle ?? 0) > 0}
            <HeatingProgress
              current={status.temp_nozzle}
              target={status.target_nozzle}
            />
          {/if}
          {#if (status.target_bed ?? 0) > 0}
            <HeatingProgress
              kind="bed"
              current={status.temp_bed}
              target={status.target_bed}
            />
          {/if}
        </div>
      {:else}
        <div class="flex flex-col divide-y">
          {#if !multi}
            <HeaterRow
              kind="nozzle"
              label={t('status.tool')}
              current={status.temp_nozzle}
              target={status.target_nozzle}
            />
          {/if}
          <HeaterRow
            kind="bed"
            label={t('status.bed')}
            current={status.temp_bed}
            target={status.target_bed}
          />
          {#if chamber?.temp !== undefined}
            <HeaterRow
              kind="chamber"
              label={t('status.chamber')}
              current={chamber.temp}
              target={chamber.target_temp ?? undefined}
            />
          {/if}
        </div>
      {/if}
      {@render controls?.()}
    {:else}
      <div
        class="flex flex-col gap-3"
        role="status"
        aria-label={t('status.connecting')}
      >
        <div class="h-7 w-28 animate-pulse rounded-sm bg-muted"></div>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div class="h-10 animate-pulse rounded-md bg-muted"></div>
          <div class="h-10 animate-pulse rounded-md bg-muted"></div>
        </div>
      </div>
    {/if}
    {@render bottom?.()}
  </div>
</section>

<Dialog
  open={confirm !== undefined}
  title={t(confirm === 'pause' ? 'status.pauseTitle' : 'status.stopTitle')}
  onclose={() => (confirm = undefined)}
>
  <p class="text-sm text-muted-foreground">
    {t(confirm === 'pause' ? 'status.pauseBody' : 'status.stopBody')}
  </p>
  <div class="flex flex-wrap justify-end gap-2 max-sm:[&>*]:flex-1">
    <Button variant="secondary" size="lg" onclick={() => (confirm = undefined)}>
      {t('status.keepPrinting')}
    </Button>
    <Button
      variant={confirm === 'pause' ? 'default' : 'destructive'}
      size="lg"
      onclick={() => void control(confirm ?? 'stop')}
    >
      {t(confirm === 'pause' ? 'status.pauseConfirm' : 'status.stopConfirm')}
    </Button>
  </div>
</Dialog>
