<script lang="ts">
  import { untrack } from 'svelte';
  import { Icon } from '../../lib/ui/icon';
  import { Clock, Printer } from '../../lib/ui/icon/icons';

  import type { PrintCandidate } from './uploaded';
  import type { Started } from '../files/files.svelte';
  import { reason } from '../../lib/api/reason';
  import type { components } from '../../lib/api/schema';
  import { Checkbox } from '../../lib/ui/checkbox';
  import FilamentProgress from '../filament/filament-progress.svelte';
  import { filament } from '../filament/filament.svelte';
  import {
    filamentLabel,
    firmwareFilament,
    loadableFilament,
  } from '../../lib/printer/filaments';
  import { materialMismatch } from '../../lib/api/legacy';
  import { isMultiTool } from '../../lib/printer/models';
  import { identity } from '../../lib/stores/identity.svelte';
  import { thumbnailUrl } from '../../lib/api/thumbnail';
  import { formatDuration, parseFileName } from '../../lib/files/name';
  import {
    localDetails,
    localThumbnail,
  } from '../../lib/files/local-thumbnails';
  import { filamentGrams } from '../../lib/files/metadata';
  import { fitsPrinter } from '../../lib/printer/compat';
  import { language, t, type MessageKey } from '../../lib/i18n.svelte';
  import { Alert } from '../../lib/ui/alert';
  import { Button } from '../../lib/ui/button';
  import { Dialog } from '../../lib/ui/dialog';
  import { TelemetryIcon } from '../../lib/ui/telemetry-icon';
  import { MaterialChip } from '../../lib/ui/material';
  import { groupMaterials } from '../../lib/files/group-materials';
  import { Thumbnail } from '../../lib/ui/thumbnail';
  import ToolMappingView from '../mapping/tool-mapping.svelte';
  import NozzleInfo from '../status/nozzle-info.svelte';
  import { api } from '../../lib/api/client';
  import { fileHeader } from '../../lib/api/download';
  import { fileKey } from '../../lib/files/header-cache';
  import type { Header } from '../../lib/files/header';
  import {
    gcodeFilaments,
    type Mapping,
    suggest,
    toApi,
  } from '../../lib/printer/tool-mapping';
  import {
    checkGroup,
    type Issue,
    resolve,
    resolveModel,
    TITLES,
  } from '../../lib/printer/print-check';
  import { printer } from '../../lib/stores/printer.svelte';
  import { CAN_START } from '../../lib/printer/state';

  // A constant the bundler folds: builds without tool mapping drop it.
  const MappingView = __TOOL_MAPPING__ ? ToolMappingView : undefined;

  interface Props {
    file: PrintCandidate | undefined;
    /// Starts the print, with a tool mapping where there is one.
    onprint: (
      name: string,
      mapping?: Record<string, number[]>,
    ) => Promise<Started>;
    /// The printer prints it.
    onstarted: () => void;
    /// The file's folder on the USB drive.
    dir?: string;
    /// Opens the filament dialog, to change the filament before printing.
    onchangefilament?: (() => void) | undefined;
    onclose: () => void;
    /// The printer takes a job now.
    canStart?: boolean;
    /// Says why not, on the button, when it does not.
    blocked?: string | undefined;
  }

  let {
    file,
    onprint,
    onstarted,
    onclose,
    canStart = true,
    blocked,
    dir = '',
    onchangefilament,
  }: Props = $props();
  let busy = $state(false);
  let failed = $state(false);
  const loaded = $derived(filament.loaded);
  const changing = $derived(filament.busy !== undefined);

  const info = $derived(file ? parseFileName(file.displayName) : undefined);
  // Read from the file on upload in this visit, when the dialog is opened
  // from the list.
  const known = $derived(file?.meta ?? localDetails(file?.displayName));
  const materials = $derived(
    known?.materials ??
      (info?.materials.length ? info.materials : undefined) ??
      [],
  );
  const duration = $derived(known?.duration ?? info?.duration);
  const sliced = $derived(known?.printerModel ?? info?.printer);
  const local = $derived(
    file?.meta?.thumbnail
      ? URL.createObjectURL(file.meta.thumbnail)
      : undefined,
  );
  const thumbnail = $derived(
    local ??
      localThumbnail(file?.displayName) ??
      (file?.thumbnailRef || file?.iconRef
        ? thumbnailUrl(file.version, file.thumbnailRef, file.iconRef)
        : undefined),
  );

  $effect(() => {
    const url = local;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  });

  $effect(() => {
    if (!file) return;
    failed = false;
    filament.clearOutcome();
    void filament.refresh();
  });

  // Everything else known about the file: what PrusaSlicer put in its name,
  // and what the printer lists.
  const details = $derived(
    (
      [
        [t('details.nozzle'), info?.nozzle && `${info.nozzle} mm`],
        [t('details.layer'), info?.layer],
        [
          t('details.size'),
          file?.size !== undefined &&
            `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        ],
        [
          t('details.modified'),
          file?.timestamp !== undefined &&
            new Date(file.timestamp * 1000).toLocaleString(language()),
        ],
        [t('details.folder'), file?.where],
        [t('details.file'), file?.displayName],
      ] as const
    ).filter((d): d is readonly [string, string] => !!d[1]),
  );

  const multiTool = $derived(isMultiTool(identity.model?.variant));
  const mismatch = $derived(!multiTool && materialMismatch(materials, loaded));
  // The filament to load first, when the file wants one the firmware knows
  // and the printer has another or none. Printing waits until the printer
  // reports it: a change can be cancelled or end with something else.
  const wanted = $derived.by(() => {
    const need =
      materials.length === 1 && !multiTool
        ? loadableFilament(materials[0])
        : undefined;
    if (!need) return undefined;
    return loaded && firmwareFilament(loaded) === need ? undefined : need;
  });

  // The dialog stays open through the change: its button turns into Print
  // once the new filament is in.
  async function change(material: string) {
    busy = true;
    failed = !(await filament.run(loaded ? 'change' : 'load', material));
    busy = false;
  }

  // The file's filaments from its header (read on upload, else from the
  // head of the file on the printer), mapped to the printer's slots, and
  // what the firmware's checks will make of it (print-check.ts): advice
  // while editing. The printer's own report decides once it previews the
  // print.
  let header = $state<Header | undefined>();
  /// The header is being read: the mapping is not known yet.
  let reading = $state(false);
  let mapping = $state<Mapping>({});
  let suggested = $state<Mapping>({});
  /// The person accepts the warnings (the tick before Print anyway).
  let accepted = $state(false);
  /// The filament change before the print: sent, seen working, done, or
  /// failed.
  let changingAll = $state<
    'sent' | 'working' | 'done' | 'failed' | undefined
  >();
  /// The printer's warnings about the change, to confirm; its refusal.
  let changeWarnings = $state<string[] | undefined>();
  let changeRefused = $state<string | undefined>();
  const mapsTools = $derived(
    __TOOL_MAPPING__ &&
      identity.can('tool_mapping') &&
      identity.slots.length > 1,
  );
  // Once per file: the list read again hands over a new object for it.
  const fileId = $derived(
    file ? `${file.dir ?? dir}/${file.name}/${file.displayName}` : undefined,
  );
  $effect(() => {
    if (fileId === undefined) return;
    acceptedChecks = new Set();
    header = undefined;
    changingAll = undefined;
    changeWarnings = undefined;
    changeRefused = undefined;
    accepted = false;
    starting = undefined;
    report = undefined;
    refusal = undefined;
    const f = untrack(() => file);
    if (!__TOOL_MAPPING__ || !f) return;
    const folder = f.dir ?? untrack(() => dir);
    const path = folder ? `${folder}/${f.name}` : f.name;
    reading = true;
    void fileHeader(path, fileKey(folder, f.displayName))
      .then((h) => {
        header = h;
      })
      .finally(() => {
        reading = false;
      });
  });
  const extruders = $derived(__TOOL_MAPPING__ ? gcodeFilaments(header) : []);
  const grams = $derived(
    known?.grams ??
      (__TOOL_MAPPING__
        ? filamentGrams(header?.['filament used [g]'])
        : undefined),
  );
  // Suggested once per file: the printer's tools are read again every few
  // seconds, and the person's changes stay.
  $effect(() => {
    const used = extruders;
    if (!__TOOL_MAPPING__) return;
    const next = untrack(() =>
      mapsTools ? suggest(used, identity.slots, identity.nozzleCheck) : {},
    );
    suggested = next;
    mapping = next;
  });
  const printerFacts = $derived({
    slots: mapsTools ? identity.slots : [],
    nozzleCheck: identity.nozzleCheck,
    modelCheck: identity.modelCheck,
    modelFits: fitsPrinter(sliced, identity.code),
  });
  // Builds without tool mapping (the MINI, the iX) check the model only.
  const check = $derived(
    __TOOL_MAPPING__
      ? resolve(extruders, mapping, printerFacts)
      : resolveModel(printerFacts),
  );
  const canChange = $derived(
    __TOOL_MAPPING__ &&
      canStart &&
      !check.unloadable.length &&
      (identity.can('change_all') || identity.can('filament_change_all')),
  );

  // Change filaments: the printer's change all loads what the mapping
  // needs, asking on its screen and in the page's alert. The dialog stays;
  // the person starts the print once the printer is done.
  async function changeFilaments(confirm = false) {
    if (!__TOOL_MAPPING__) return;
    changeWarnings = undefined;
    changeRefused = undefined;
    const items = Object.fromEntries(
      check.changes.map(({ slot, to }) => [
        slot.id ?? String(slot.index - 1),
        {
          action: 'change' as const,
          filament: to.material,
          ...(to.color && { color: to.color }),
        },
      ]),
    );
    const { response, error } = await api.POST('/api/v1/filament/change-all', {
      body: { items, ...(confirm && { confirm: true }) },
    });
    if (response.ok) {
      changingAll = 'sent';
      // A printer that never starts changing is not waited for.
      setTimeout(() => {
        if (changingAll === 'sent') changingAll = 'failed';
      }, 20_000);
      return;
    }
    if (
      typeof error === 'object' &&
      'reason' in error &&
      error.reason === 'needs_confirm'
    )
      changeWarnings = [
        ...new Set(error.warnings?.flatMap((w) => w.check ?? []) ?? []),
      ];
    else changeRefused = (await reason(response)) ?? t('mapping.changeFailed');
  }
  $effect(() => {
    const state = printer.status?.state;
    if (!changingAll || changingAll === 'failed' || changingAll === 'done')
      return;
    if (!state) return;
    if (['BUSY', 'ATTENTION'].includes(state)) changingAll = 'working';
    else if (changingAll === 'working' && CAN_START.has(state))
      void untrack(async () => {
        await identity.refresh();
        changingAll = check.changes.length ? 'failed' : 'done';
      });
  });

  // A single-tool printer's nozzle against the file's, by the printer's own
  // nozzle check; a printer with several tools checks each in the mapping.
  const nozzleMismatch = $derived(
    __CONTROLS__ &&
      !multiTool &&
      info?.nozzle !== undefined &&
      identity.nozzle !== undefined &&
      Math.abs(Number(info.nozzle) - identity.nozzle) > 0.001 &&
      identity.nozzleCheck !== 'ignore',
  );

  // The print start, as the printer takes it: it prints, or stops on its
  // print preview with its own report, which then is the verdict. A
  // mapping changed there is checked by the printer as it is edited.
  type Report = components['schemas']['PrintChecks'];
  let starting = $state<'sent' | 'preview' | 'asking' | undefined>();
  let report = $state<Report | undefined>();
  /// The mapping the printer has: the one the print started with.
  let sentMapping = $state<string | undefined>();
  let refusal = $state<string | undefined>();
  const wire = (m: Mapping) =>
    Object.entries(toApi(m))
      .map(([from, to]) => [from, ...to].join(':'))
      .join(',');
  const mappingSent = $derived(
    __TOOL_MAPPING__ && mapsTools && extruders.length
      ? toApi(mapping)
      : undefined,
  );

  const refused = $derived(
    report
      ? !report.printable
      : check.state === 'abort' ||
          (nozzleMismatch && identity.nozzleCheck === 'abort'),
  );
  /// Warnings the person prints through, ticked first.
  const warned = $derived(
    report
      ? report.checks.some((c) => c.level === 'warning')
      : check.state === 'warning' ||
          check.state === 'change' ||
          (nozzleMismatch && !refused),
  );

  /// Checks of the printer's the person saw in its report and accepted.
  let acceptedChecks = new Set<string>();
  /// Every warning of the printer's report was shown before the person
  /// accepted them.
  const shown = (r: Report) => {
    const titles = new Set([
      ...check.issues.map((i) => checkGroup(TITLES[i.key])),
      ...acceptedChecks,
    ]);
    return r.checks.every(
      (c) => c.level !== 'warning' || titles.has(checkGroup(c.check)),
    );
  };

  async function start(name: string) {
    busy = true;
    refusal = undefined;
    const r = await onprint(name, mappingSent);
    busy = false;
    if (!r.ok) {
      refusal =
        r.status === 400
          ? t('print.invalidMapping')
          : (r.message ?? t('files.printFailed'));
      return;
    }
    sentMapping = mappingSent && wire(mapping);
    if (!__API_V2__ || !identity.can('print_checks')) {
      onstarted();
      return;
    }
    starting = 'sent';
    await printer.refresh();
  }

  async function press(button: 'Print' | 'Abort') {
    const id = printer.status?.dialog_id;
    if (id === undefined) return false;
    busy = true;
    const { response } = await api.POST('/api/v1/dialog/{dialog_id}', {
      params: { path: { dialog_id: id } },
      body: { button },
    });
    busy = false;
    if (!response.ok)
      refusal = (await reason(response)) ?? t('files.printFailed');
    else await printer.refresh();
    return response.ok;
  }

  // Follows the printer after the start.
  $effect(() => {
    const state = printer.status?.state;
    const id = printer.status?.dialog_id;
    if (!starting || !state) return;
    if (state === 'PRINTING') {
      starting = undefined;
      untrack(onstarted);
    } else if (id !== undefined && starting === 'sent')
      void untrack(async () => {
        const r = await readReport();
        if (!r) {
          // Another question on the printer's screen: the page's dialog
          // shows it.
          starting = 'asking';
          return;
        }
        starting = 'preview';
        report = r;
        // Warnings the page did not show are accepted anew.
        if (!shown(r)) accepted = false;
        else if (r.printable && (r.level === 'ok' || accepted))
          await press('Print');
      });
    else if (id === undefined && starting !== 'sent' && CAN_START.has(state)) {
      starting = undefined;
      report = undefined;
      refusal = t('print.stopped');
    }
  });

  async function readReport(proposed?: Mapping) {
    const { data, response } = await api.GET('/api/v1/print/checks', {
      params: { query: proposed ? { tool_mapping: wire(proposed) } : {} },
    });
    return response.ok ? data : undefined;
  }

  // In the preview, the printer checks the mapping as it is edited.
  $effect(() => {
    const proposed = $state.snapshot(mapping);
    if (starting !== 'preview' || !mapsTools) return undefined;
    const timer = setTimeout(() => {
      void readReport(proposed).then((r) => {
        if (r) report = r;
      });
    }, 300);
    return () => clearTimeout(timer);
  });

  /// Print from the preview: the printer's own Print when it has the same
  /// mapping, else the preview is left and the print started again with it.
  async function printFromPreview(name: string) {
    if (!mappingSent || wire(mapping) === sentMapping) {
      await press('Print');
      return;
    }
    if (!(await press('Abort'))) return;
    acceptedChecks = new Set(
      report?.checks.map((c) => checkGroup(c.check)) ?? [],
    );
    starting = undefined;
    report = undefined;
    accepted = true;
    await start(name);
  }

  const issueText = (i: Issue) =>
    t(
      i.key === 'model'
        ? 'print.model'
        : (`print.check.${i.key}` as MessageKey),
      {
        n: i.filament ?? '',
        slot: i.slot ?? '',
        has: i.has ?? '',
        needs: i.needs ? filamentLabel(i.needs) : '',
      },
    );
</script>

<Dialog
  open={file !== undefined}
  title={t('files.confirmTitle', { name: info?.name ?? '' })}
  size="xl"
  {onclose}
>
  {#if file && info}
    <Thumbnail src={thumbnail} class="aspect-video w-full" />
    <div
      class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
    >
      {#each groupMaterials(materials) as material (material)}
        <MaterialChip name={material} />
      {/each}
      {#if duration !== undefined}
        <span class="flex items-center gap-1">
          <Icon node={Clock} class="size-3.5" />{formatDuration(duration)}
        </span>
      {/if}
      {#if grams !== undefined}
        <span data-testid="file-grams"
          >{new Intl.NumberFormat(language(), {
            style: 'unit',
            unit: 'gram',
            maximumFractionDigits: 1,
          }).format(grams)}</span
        >
      {/if}
      <NozzleInfo
        diameter={info.nozzle}
        hardened={extruders.some((f) => f.abrasive)}
        highFlow={extruders.some((f) => f.highFlow)}
      />
      {#if sliced}
        <span>{t('upload.slicedFor', { printer: sliced })}</span>
      {/if}
    </div>
    <dl class="flex flex-col gap-1 text-sm" data-testid="file-details">
      {#each details as [term, value] (term)}
        <div class="flex gap-4">
          <dt class="w-32 shrink-0 text-muted-foreground">{term}</dt>
          <dd class="min-w-0 break-all">{value}</dd>
        </div>
      {/each}
    </dl>
    {#if MappingView && mapsTools && extruders.length}
      <MappingView
        rows={check.rows}
        slots={identity.slots}
        bind:mapping
        {suggested}
        severity={identity.nozzleCheck}
      />
    {/if}
    {#if __TOOL_MAPPING__ && check.changes.length && !report}
      <div class="text-sm" data-testid="print-changes">
        <p class="font-medium">
          {t('mapping.needChange', { count: check.changes.length })}
        </p>
        <ul class="text-muted-foreground">
          {#each check.changes as { slot, to } (slot.index)}
            <li>
              T{slot.index}
              {slot.material ? filamentLabel(slot.material) : '—'} → {to.material
                ? filamentLabel(to.material)
                : t('mapping.unknown')}
            </li>
          {/each}
        </ul>
        {#each check.unloadable as f (f.index)}
          <p class="text-xs" data-testid="print-unloadable">
            {t('mapping.unloadable', {
              material: f.material
                ? filamentLabel(f.material)
                : t('mapping.unknown'),
            })}
          </p>
        {/each}
      </div>
    {/if}
    {#if report}
      <!-- The printer's own verdict, in its words. -->
      <div
        class={[
          'rounded-md border px-3 py-2 text-sm',
          refused
            ? 'border-state-fault-edge bg-state-fault text-state-fault-text'
            : 'border-state-attention-edge bg-state-attention text-state-attention-text',
        ]}
        data-testid="printer-report"
      >
        <p class="font-semibold">{t('print.printerSays')}</p>
        <ul>
          {#each report.checks as c, i (i)}
            <li data-level={c.level}>
              {c.check}{#if c.gcode_tool}
                · {t('print.filamentN', {
                  n: c.gcode_tool,
                })}{/if}{#if c.tool !== undefined}
                · T{Number(c.tool.split('.').pop()) + 1}{/if}
            </li>
          {:else}
            <li>{t('print.allGood')}</li>
          {/each}
        </ul>
      </div>
    {:else if check.issues.length}
      <ul
        class={[
          'rounded-md border px-3 py-2 text-sm',
          refused
            ? 'border-state-fault-edge bg-state-fault text-state-fault-text'
            : 'border-state-attention-edge bg-state-attention text-state-attention-text',
        ]}
        data-testid="print-issues"
      >
        {#each check.issues as issue, i (i)}
          <li data-level={issue.level}>{issueText(issue)}</li>
        {/each}
      </ul>
    {/if}
    {#if !__TOOL_MAPPING__}
      <!-- No filament changes here. -->
    {:else if changingAll === 'failed'}
      <Alert variant="destructive">{t('mapping.changeFailed')}</Alert>
    {:else if changingAll === 'done'}
      <Alert variant="info"
        ><div data-testid="change-done">{t('mapping.changed')}</div></Alert
      >
    {:else if changingAll}
      <Alert variant="info">{t('mapping.changing')}</Alert>
    {/if}
    {#if changeRefused}
      <Alert variant="destructive"
        ><div data-testid="change-refused">
          {t('mapping.changeRefused', { check: changeRefused })}
        </div></Alert
      >
    {/if}
    {#if changeWarnings}
      <Alert variant="info"
        ><div data-testid="change-warnings">
          <p>
            {t('mapping.changeWarns', { checks: changeWarnings.join(', ') })}
          </p>
          <div class="mt-2 flex justify-end">
            <Button size="sm" onclick={() => void changeFilaments(true)}
              >{t('mapping.changeAnyway')}</Button
            >
          </div>
        </div></Alert
      >
    {/if}
    {#if __CONTROLS__ && nozzleMismatch}
      <Alert
        variant={identity.nozzleCheck === 'abort' ? 'destructive' : 'info'}
      >
        {t(
          identity.nozzleCheck === 'abort'
            ? 'controls.nozzleAbort'
            : 'controls.nozzleWarn',
          {
            file: info.nozzle ?? '',
            printer: identity.nozzle ?? '',
          },
        )}
      </Alert>
    {/if}
    <FilamentProgress />
    {#if changing}
      <!-- The progress above says it all. -->
    {:else if wanted && !loaded}
      <Alert variant="info">
        <p class="font-semibold">
          {t('files.needsTitle', { file: filamentLabel(wanted) })}
        </p>
        <p class="mt-1">{t('files.mismatchChange')}</p>
      </Alert>
    {:else if mismatch}
      <Alert variant="info">
        <p class="font-semibold">
          {t('files.mismatchTitle', {
            file: materials[0] ?? '',
            loaded: filamentLabel(loaded ?? ''),
          })}
        </p>
        <p class="mt-1">
          {t(wanted ? 'files.mismatchChange' : 'files.mismatchBody')}
        </p>
      </Alert>
    {/if}
    {#if failed}
      <Alert variant="destructive">{t('files.printFailed')}</Alert>
    {/if}
    {#if refusal}
      <Alert variant="destructive"
        ><div data-testid="print-refused">{refusal}</div></Alert
      >
    {/if}
    {#if starting === 'asking'}
      <Alert variant="info">{t('print.printerAsks')}</Alert>
    {/if}
    {#if warned && !refused && !changing && !wanted}
      <Checkbox bind:checked={accepted}
        ><span data-testid="accept-warnings">{t('print.accept')}</span
        ></Checkbox
      >
    {/if}
    <div class="flex flex-wrap justify-end gap-2 max-sm:[&>*]:flex-1">
      <Button
        variant="secondary"
        size="lg"
        onclick={() => {
          if (starting === 'preview') void press('Abort');
          onclose();
        }}>{t(file.meta ? 'upload.later' : 'common.close')}</Button
      >
      {#if onchangefilament && !multiTool && extruders.length < 2 && !changing && !wanted && canStart}
        <!-- Another colour or spool of the same filament: the person picks
             it in the filament dialog, then prints. -->
        <Button variant="secondary" size="lg" onclick={onchangefilament}>
          <TelemetryIcon kind="spool" />{t('filament.change')}
        </Button>
      {/if}
      {#if changing}
        <Button size="lg" loading>{t('files.changingButton')}</Button>
      {:else if wanted}
        <!-- Long in some languages: wraps rather than leave the screen. -->
        <Button
          size="lg"
          class="h-auto min-h-11 shrink! py-2 whitespace-normal! max-sm:basis-full!"
          disabled={!canStart}
          loading={busy}
          onclick={() => void change(wanted)}
        >
          <TelemetryIcon kind="spool" />{t('files.changeTo', {
            material: filamentLabel(wanted),
          })}
        </Button>
      {:else if starting === 'preview'}
        <Button
          size="lg"
          disabled={refused || (warned && !accepted)}
          loading={busy}
          onclick={() => void printFromPreview(file.name)}
        >
          <Icon node={Printer} />{t(
            warned ? 'files.printAnyway' : 'upload.printNow',
          )}
        </Button>
      {:else}
        {#if __TOOL_MAPPING__ && check.state === 'change' && !changingAll}
          <Button
            size="lg"
            disabled={!canChange}
            title={check.unloadable.length
              ? t('mapping.unloadableShort')
              : undefined}
            onclick={() => void changeFilaments()}
            ><TelemetryIcon kind="spool" />{t(
              'mapping.changeFilaments',
            )}</Button
          >
        {/if}
        <Button
          size="lg"
          variant={__TOOL_MAPPING__ && check.state === 'change' && !changingAll
            ? 'secondary'
            : 'default'}
          disabled={!canStart ||
            refused ||
            (warned && !accepted) ||
            !!starting ||
            (mapsTools && reading) ||
            changingAll === 'sent' ||
            changingAll === 'working'}
          loading={busy || !!starting}
          onclick={() => void start(file.name)}
        >
          <Icon node={Printer} />{canStart
            ? t(mismatch || warned ? 'files.printAnyway' : 'upload.printNow')
            : (blocked ?? t('upload.printNow'))}
        </Button>
      {/if}
    </div>
  {/if}
</Dialog>
