<script lang="ts">
  import { untrack } from 'svelte';
  import { Icon } from '../../lib/ui/icon';
  import { Clock, Printer } from '../../lib/ui/icon/icons';

  import type { PrintCandidate } from './uploaded';
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
  import { filamentGrams } from '../../lib/files/metadata';
  import { language, t } from '../../lib/i18n.svelte';
  import { Alert } from '../../lib/ui/alert';
  import { Button } from '../../lib/ui/button';
  import { Dialog } from '../../lib/ui/dialog';
  import { TelemetryIcon } from '../../lib/ui/telemetry-icon';
  import { MaterialChip } from '../../lib/ui/material';
  import { groupMaterials } from '../../lib/files/group-materials';
  import { Thumbnail } from '../../lib/ui/thumbnail';
  import ToolMappingView from '../mapping/tool-mapping.svelte';
  import { api } from '../../lib/api/client';
  import { fileHeader } from '../../lib/api/download';
  import { fileKey } from '../../lib/files/header-cache';
  import type { Header } from '../../lib/files/header';
  import {
    gcodeFilaments,
    type Mapping,
    changeItems,
    suggest,
    toApi,
  } from '../../lib/printer/tool-mapping';

  // A constant the bundler folds: builds without tool mapping drop it.
  const MappingView = __TOOL_MAPPING__ ? ToolMappingView : undefined;

  interface Props {
    file: PrintCandidate | undefined;
    /// Starts the print, with a tool mapping where there is one; false
    /// when the printer refuses.
    onprint: (
      name: string,
      mapping?: Record<string, number[]>,
    ) => Promise<boolean>;
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
  const materials = $derived(file?.meta?.materials ?? info?.materials ?? []);
  const duration = $derived(file?.meta?.duration ?? info?.duration);
  const sliced = $derived(file?.meta?.printerModel ?? info?.printer);
  const local = $derived(
    file?.meta?.thumbnail
      ? URL.createObjectURL(file.meta.thumbnail)
      : undefined,
  );
  const thumbnail = $derived(
    local ??
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

  // Tool mapping (PrusaLink 2): the file's extruders from its header, read
  // on upload or from the head of the file on the printer.
  let header = $state<Header | undefined>();
  let mapping = $state<Mapping>({});
  let changingAll = $state(false);
  const mapsTools = $derived(
    __TOOL_MAPPING__ &&
      identity.can('tool_mapping') &&
      identity.slots.length > 1,
  );
  $effect(() => {
    header = undefined;
    changingAll = false;
    if (!__TOOL_MAPPING__ || !file || !mapsTools) return;
    const folder = file.dir ?? dir;
    const path = folder ? `${folder}/${file.name}` : file.name;
    void fileHeader(path, fileKey(folder, file.displayName)).then((h) => {
      header = h;
    });
  });
  const extruders = $derived(
    __TOOL_MAPPING__ && mapsTools ? gcodeFilaments(header) : [],
  );
  const grams = $derived(
    file?.meta?.grams ??
      (__TOOL_MAPPING__
        ? filamentGrams(header?.['filament used [g]'])
        : undefined),
  );
  // Suggested once per file: the printer's tools are read again every few
  // seconds, and the person's changes stay.
  $effect(() => {
    const used = extruders;
    if (!__TOOL_MAPPING__) return;
    mapping = untrack(() =>
      suggest(used, identity.slots, identity.nozzleCheck),
    );
  });
  const mapped = $derived(extruders.every((f) => mapping[f.index]?.length));

  // The printer's change all, with what this mapping needs: it suggests
  // only for a file on its own print preview. It heats the slots' heads and
  // changes them one by one, asking on its screen (and in the page's alert).
  const canChange = $derived(
    __TOOL_MAPPING__ &&
      canStart &&
      (identity.can('change_all') || identity.can('filament_change_all')),
  );
  const toChange = $derived(
    __TOOL_MAPPING__ ? changeItems(extruders, identity.slots, mapping) : {},
  );
  async function changeAll(only?: number) {
    if (!__TOOL_MAPPING__) return;
    const { response } = await api.POST('/api/v1/filament/change-all', {
      body: { items: changeItems(extruders, identity.slots, mapping, only) },
    });
    changingAll = response.ok;
  }

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
  const refused = $derived(nozzleMismatch && identity.nozzleCheck === 'abort');

  async function start(name: string) {
    busy = true;
    failed = !(await onprint(
      name,
      __TOOL_MAPPING__ && extruders.length ? toApi(mapping) : undefined,
    ));
    busy = false;
  }
</script>

<Dialog
  open={file !== undefined}
  title={t('files.confirmTitle', { name: info?.name ?? '' })}
  size={extruders.length ? 'lg' : 'md'}
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
    {#if MappingView && extruders.length}
      <MappingView
        filaments={extruders}
        slots={identity.slots}
        bind:mapping
        severity={identity.nozzleCheck}
        onchangefilament={canChange
          ? (slot: number) => void changeAll(slot)
          : undefined}
      />
      {#if canChange && Object.keys(toChange).length && !changingAll}
        <Button
          variant="secondary"
          class="self-start"
          onclick={() => void changeAll()}>{t('mapping.changeAll')}</Button
        >
      {/if}
      {#if changingAll}
        <Alert variant="info">{t('mapping.changing')}</Alert>
      {:else if !mapped}
        <Alert variant="info">{t('mapping.incomplete')}</Alert>
      {/if}
    {/if}
    {#if __CONTROLS__ && nozzleMismatch}
      <Alert variant={refused ? 'destructive' : 'info'}>
        {t(refused ? 'controls.nozzleAbort' : 'controls.nozzleWarn', {
          file: info.nozzle ?? '',
          printer: identity.nozzle ?? '',
        })}
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
    <div class="flex flex-wrap justify-end gap-2 max-sm:[&>*]:flex-1">
      <Button variant="secondary" size="lg" onclick={onclose}
        >{t(file.meta ? 'upload.later' : 'common.close')}</Button
      >
      {#if onchangefilament && !multiTool && !extruders.length && !changing && !wanted && canStart}
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
      {:else}
        <Button
          size="lg"
          disabled={!canStart || !mapped || (__CONTROLS__ && refused)}
          loading={busy}
          onclick={() => void start(file.name)}
        >
          <Icon node={Printer} />{canStart
            ? t(mismatch ? 'files.printAnyway' : 'upload.printNow')
            : (blocked ?? t('upload.printNow'))}
        </Button>
      {/if}
    </div>
  {/if}
</Dialog>
