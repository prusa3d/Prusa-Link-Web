<script lang="ts">
  import { untrack } from 'svelte';
  import { Icon } from './lib/ui/icon';
  import { CloudOff, LogOut } from './lib/ui/icon/icons';

  import FileList from './features/files/file-list.svelte';
  import { fileVersion } from './lib/api/thumbnail';
  import LastPrint from './features/status/last-print.svelte';
  import PrinterAlert from './features/status/printer-alert.svelte';
  import Notices from './features/notices/notices.svelte';
  import Footer from './features/footer/footer.svelte';
  import ClashDialog from './features/upload/clash-dialog.svelte';
  import FilamentDialog from './features/filament/filament-dialog.svelte';
  import { filament, isHelper } from './features/filament/filament.svelte';
  import { filamentLabel } from './lib/printer/filaments';
  import UpdateNoticeView from './features/firmware/update-notice.svelte';
  import UpdateDialogView from './features/firmware/update-dialog.svelte';
  import { firmwareUpdate } from './features/firmware/update.svelte';
  import {
    files,
    label,
    type PrinterEntry,
  } from './features/files/files.svelte';
  import Login from './features/login/login.svelte';
  import PrinterIdentity from './features/printer/printer-identity.svelte';
  import StateBadge from './features/printer/state-badge.svelte';
  import StatusPanel from './features/status/status-panel.svelte';
  import ThemeToggle from './features/theme/theme-toggle.svelte';
  import LanguagePicker from './features/language/language-picker.svelte';
  import QueueIndicator from './features/activity/queue-indicator.svelte';
  import UnitToggle from './features/units/unit-toggle.svelte';
  import DropZone from './features/upload/drop-zone.svelte';
  import UploadPanel from './features/upload/upload-panel.svelte';
  import PrintDialog from './features/upload/print-dialog.svelte';
  import type { PrintCandidate } from './features/upload/uploaded';
  import { uploads } from './features/upload/uploads.svelte';
  import WindowDrop from './features/upload/window-drop.svelte';
  import { session } from './lib/auth/session.svelte';
  import { LANGUAGES, t, type MessageKey } from './lib/i18n.svelte';
  import { CAN_START } from './lib/printer/state';
  import { identity } from './lib/stores/identity.svelte';
  import { isMultiTool } from './lib/printer/models';
  import { heaterReadings } from './lib/printer/status-picture';
  import { slotRows, toolRows } from './lib/printer/tools';
  import { dialog } from './lib/stores/dialog.svelte';
  import BedView from './features/objects/bed-view.svelte';
  import PrinterControls from './features/heating/printer-controls.svelte';
  import UsbFirmwareCard from './features/firmware/usb-firmware.svelte';
  import { controls as tuning } from './features/heating/controls.svelte';
  import { plateObjects } from './features/objects/objects.svelte';
  import { bedOf } from './lib/printer/bed';
  import { notices } from './lib/stores/notices.svelte';
  import { badgeTabIcon } from './features/printer/tab-icon';
  import { printer, type JobFile } from './lib/stores/printer.svelte';
  import { Button } from './lib/ui/button';
  import { EmptyState } from './lib/ui/empty-state';
  import { PrusaLinkLogo } from './lib/ui/logo';
  import { Spinner } from './lib/ui/spinner';

  // A build without the feature drops the component: a constant the bundler
  // folds, which a branch of the markup is not.
  const UsbFirmware = __FIRMWARE_FLASH__ ? UsbFirmwareCard : undefined;
  const UpdateNotice = __FIRMWARE_UPDATE__ ? UpdateNoticeView : undefined;
  const UpdateDialog = __FIRMWARE_UPDATE__ ? UpdateDialogView : undefined;

  session.takeKeyFromFragment(globalThis.location, globalThis.history);

  let candidate = $state<PrintCandidate | undefined>();
  let filamentOpen = $state(false);

  uploads.onuploaded = (file) => {
    if (canStart) candidate = file;
  };

  // PrusaLink 2 counts the tools; before it, the model says whether there
  // can be several.
  const multiTool = $derived(
    __API_V2__
      ? identity.tools.filter(Boolean).length > 1
      : isMultiTool(identity.model?.variant),
  );
  // An MMU's slots show as cards too, all feeding one nozzle.
  const slots = $derived(
    __TOOL_MAPPING__ && identity.mmu
      ? slotRows(printer.status, identity.slots, identity.tools[0])
      : [],
  );
  const tools = $derived(
    __MULTI_TOOL__ && !slots.length
      ? toolRows(printer.status, identity.tools)
      : slots,
  );
  const heating = $derived.by(() => {
    const s = printer.status;
    return [
      s?.target_nozzle,
      s?.target_bed,
      s?.chamber?.target_temp,
      ...Object.values(s?.tools ?? {}).map((x) => x?.nozzle_target_temp),
    ].some((v) => (v ?? 0) > 0);
  });
  $effect(() => {
    printer.expanded = __API_V2__;
  });
  // The loaded filaments are in /api/v1/info only: read it again when the
  // printer says it changed.
  const infoRevision = $derived(printer.status?.info_revision);
  $effect(() => {
    if (__API_V2__ && infoRevision !== undefined)
      void untrack(() => identity.refresh());
  });
  // Why the printer takes no job now, said on every print button.
  const blocked = $derived(
    printer.status?.state === 'PRINTING' || printer.status?.state === 'PAUSED'
      ? t('files.alreadyPrinting')
      : t('status.state.BUSY'),
  );
  const canStart = $derived(
    !printer.offline &&
      !filament.busy &&
      printer.status !== undefined &&
      CAN_START.has(printer.status.state),
  );

  // Polls only while signed in: a request without a key would make the
  // firmware answer with a Digest challenge and the browser show its dialog.
  $effect(() => {
    if (!session.signedIn) return undefined;
    // Untracked: a first poll reads state (the printer's features) that must
    // not restart every poll when it changes.
    const stops = untrack(() => [printer.poll(), identity.poll()]);
    return () => {
      for (const stop of stops) stop();
    };
  });

  // The tab's icon and title follow the printer, so a print can be watched
  // from another tab: "42 % · prusa-xl", "Needs attention · prusa-xl".
  const tabState = $derived(
    printer.offline ? undefined : printer.status?.state,
  );
  const tabProgress = $derived(
    tabState === 'PRINTING' || tabState === 'PAUSED'
      ? Math.floor(printer.job?.progress ?? 0)
      : undefined,
  );
  $effect(() => {
    void badgeTabIcon(tabState, tabProgress);
  });
  $effect(() => {
    const name = identity.hostname ?? (identity.title || t('app.title'));
    let what: string | undefined;
    if (tabProgress !== undefined)
      what =
        tabState === 'PAUSED'
          ? `${String(tabProgress)} % ${t('status.state.PAUSED')}`
          : `${String(tabProgress)} %`;
    else if (tabState && tabState !== 'IDLE' && tabState !== 'READY')
      what = t(`status.state.${tabState}` as MessageKey);
    let title = t('app.title');
    if (what) title = `${what} · ${name}`;
    else if (identity.title) title = `${identity.title} · ${title}`;
    document.title = title;
    document
      .querySelector('meta[name="apple-mobile-web-app-title"]')
      ?.setAttribute('content', identity.title || t('app.title'));
  });

  $effect(() => {
    if (__FIRMWARE_UPDATE__ && identity.firmware)
      void firmwareUpdate.check(identity.firmware, identity.model?.variant);
  });

  $effect(() => {
    if (__API_V2__)
      void dialog.follow(printer.status?.dialog_id, printer.status?.state);
  });

  $effect(() => {
    if (!__CANCEL_OBJECT__) return;
    void plateObjects.follow(
      identity.can('cancel_object') ? printer.job?.id : undefined,
      printer.status?.cancel_object_revision,
      printer.jobFile,
    );
  });

  // Babysteps add up per print. A derived id: the job object is new on
  // every poll.
  const jobId = $derived(printer.job?.id);
  $effect(() => {
    if (__CONTROLS__ && jobId !== undefined) tuning.forget();
  });
  const controlMode = $derived.by(() => {
    const state = printer.status?.state;
    if (state === 'PRINTING' || state === 'PAUSED') return 'printing';
    return canStart ? 'idle' : undefined;
  });

  async function cancelObject(id: number, cancel: boolean) {
    const ok = await plateObjects.cancel(id, cancel);
    // A cancel says it in its dialog; an undo has none.
    if (!ok && !cancel) notices.add(t('objects.refused'));
    return ok;
  }

  async function pressDialog(button: string) {
    if (!__API_V2__) return;
    if (!(await dialog.press(button))) notices.add(t('dialog.refused'));
    await printer.refresh();
  }

  // Lets the filament helper job clean up after itself.
  $effect(() => {
    void filament.follow(printer.status?.state);
  });

  // From this tab's own request, or from the helper job's file name when the
  // change was started elsewhere or before a reload.
  const activity = $derived.by(() => {
    if (!filament.busy)
      return isHelper(printer.jobFile?.displayName)
        ? t('filament.working')
        : undefined;
    if (filament.busy === 'unload') return t('filament.unloading');
    return t(
      filament.busy === 'load' ? 'filament.loading' : 'filament.changing',
      {
        material: filamentLabel(filament.target ?? ''),
      },
    );
  });

  const fromList = (entry: PrinterEntry): PrintCandidate => ({
    name: entry.name,
    displayName: label(entry),
    thumbnailRef: entry.refs?.thumbnail,
    iconRef: entry.refs?.icon,
    version: fileVersion(entry),
    size: entry.size,
    timestamp: entry.m_timestamp,
  });

  const again = (file: JobFile): PrintCandidate => {
    const slash = file.path.lastIndexOf('/');
    return {
      name: file.path.slice(slash + 1),
      dir: slash < 0 ? '' : file.path.slice(0, slash),
      displayName: file.displayName,
      iconRef: file.icon,
      version: file.version,
    };
  };

  const alertStatus = $derived(
    printer.offline ||
      (filament.busy && (filamentOpen || candidate !== undefined))
      ? undefined
      : printer.status,
  );

  let printerColumn = $state<HTMLElement>();

  /// The printer's card with the new job's progress; on a phone it is far
  /// above the file the print started from.
  function showPrinter() {
    const still = globalThis.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    printerColumn?.scrollIntoView({
      behavior: still ? 'instant' : 'smooth',
      block: 'start',
    });
  }

  async function print(name: string, mapping?: Record<string, number[]>) {
    const ok = await files.print(name, candidate?.dir ?? files.path, mapping);
    if (ok) {
      candidate = undefined;
      await printer.refresh();
      showPrinter();
    }
    return ok;
  }
</script>

<header class="bg-black text-white">
  <div
    class="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4 sm:gap-4 md:px-6"
  >
    <!-- The logo gives way on narrow phones; the buttons never wrap. -->
    <div class="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
      <div class="max-w-40 min-w-0 flex-1">
        <PrusaLinkLogo class="h-auto w-full" />
      </div>
      <StateBadge
        state={printer.status?.state}
        offline={printer.offline}
        {activity}
      />
    </div>
    <div class="flex shrink-0 items-center sm:gap-1">
      <QueueIndicator />
      {#if UpdateNotice}<UpdateNotice as="icon" />{/if}
      {#if Object.keys(LANGUAGES).length > 1}<LanguagePicker />{/if}
      <UnitToggle />
      <ThemeToggle />
      {#if session.signedIn}
        <Button
          variant="ghost"
          size="sm"
          class="text-white hover:bg-white/10 hover:text-white focus-visible:ring-offset-black max-sm:size-10 max-sm:px-0"
          onclick={() => session.signOut()}
        >
          <Icon node={LogOut} /><span class="max-sm:sr-only"
            >{t('app.signOut')}</span
          >
        </Button>
      {/if}
    </div>
  </div>
</header>

{#if session.signedIn}
  <main class="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 md:p-6">
    <div class="grid items-start gap-6 md:grid-cols-2">
      <div
        bind:this={printerColumn}
        class="flex scroll-mt-4 flex-col gap-6 md:sticky md:top-6 md:scroll-mt-6"
      >
        {#if printer.offline && !printer.status}
          <div class="rounded-lg edge border bg-card">
            <EmptyState
              icon={CloudOff}
              tone="fault"
              live
              title={t('offline.title')}
              body={t('offline.body')}
            >
              <Spinner class="size-5 text-muted-foreground" />
            </EmptyState>
          </div>
        {:else}
          <StatusPanel
            name={identity.hostname ?? identity.model?.name}
            status={printer.status}
            job={printer.job}
            jobFile={printer.jobFile}
            offline={printer.offline}
            oncontrol={(action: 'pause' | 'resume' | 'stop') =>
              printer.control(action)}
            {activity}
            tools={printer.offline ? undefined : tools}
            ontoolfilament={__CONTROLS__ && canStart && !slots.length
              ? (tool: number) => {
                  filament.tool = tool;
                  filamentOpen = true;
                }
              : undefined}
            ontoolunload={__CONTROLS__ && canStart
              ? (tool: number) => {
                  filament.tool = tool;
                  filamentOpen = true;
                  void filament.run('unload');
                }
              : undefined}
            toolSlots={slots.length > 0}
            heatedHead={!(__MULTI_TOOL__ && identity.can('per_tool_heating'))}
            badges={identity.tools[0]}
            chamber={__API_V2__ ? printer.status?.chamber : undefined}
            material={multiTool
              ? undefined
              : filament.loaded && filamentLabel(filament.loaded)}
            materialNote={multiTool ? t('filament.perTool') : undefined}
            nozzle={identity.nozzle}
            onfilament={canStart && !multiTool
              ? () => (filamentOpen = true)
              : undefined}
            onunload={canStart && !multiTool
              ? () => {
                  filamentOpen = true;
                  void filament.run('unload');
                }
              : undefined}
          >
            {#snippet top()}
              <PrinterIdentity
                model={identity.model}
                mmu={identity.mmu}
                equipment={{
                  tools: identity.tools.filter(Boolean).length || 1,
                  chamber: printer.status?.chamber !== undefined,
                  enclosure: identity.enclosure,
                }}
                readings={heaterReadings(printer.status, {
                  offline: printer.offline,
                  toolPicked: !multiTool || filament.loaded !== undefined,
                  perTool: __MULTI_TOOL__ && identity.can('per_tool_heating'),
                })}
              />
            {/snippet}
            {#snippet controls()}
              {#if __CONTROLS__ && controlMode && !printer.offline}
                <PrinterControls
                  mode={controlMode}
                  zOffset={printer.status?.z_offset}
                  loaded={filament.loaded}
                  multi={tools.length > 1}
                  {tools}
                  {heating}
                  perTool={__MULTI_TOOL__ && identity.can('per_tool_heating')}
                  changeAll={!slots.length &&
                    (identity.can('change_all') ||
                      identity.can('filament_change_all'))}
                />
              {/if}
            {/snippet}
            {#snippet alerts()}
              <!-- A dialog in front that already shows the printer's
                   question hides it here. -->
              <PrinterAlert
                status={alertStatus}
                dialog={__API_V2__ ? alertStatus && dialog.current : undefined}
                pressing={dialog.pressing}
                onbutton={(button: string) => void pressDialog(button)}
              />
              <Notices />
            {/snippet}
          </StatusPanel>
        {/if}
        {#if __CANCEL_OBJECT__ && plateObjects.items.length > 1 && (printer.status?.state === 'PRINTING' || printer.status?.state === 'PAUSED')}
          <BedView
            items={plateObjects.items}
            bed={bedOf(identity.code)}
            x={printer.status.axis_x}
            y={printer.status.axis_y}
            cancelling={plateObjects.cancelling}
            failed={plateObjects.failed}
            oncancel={cancelObject}
          />
        {/if}
        <UploadPanel />
        {#if printer.last && !isHelper(printer.last.file.displayName) && !(printer.job && (printer.status?.state === 'PRINTING' || printer.status?.state === 'PAUSED'))}
          <LastPrint
            last={printer.last}
            {canStart}
            onagain={() => {
              if (printer.last) candidate = again(printer.last.file);
            }}
          />
        {/if}
        {#if UpdateNotice}<UpdateNotice as="card" />{/if}
        {#if UsbFirmware}
          <UsbFirmware {canStart} />
        {/if}
      </div>
      <FileList
        {canStart}
        {blocked}
        printing={printer.job ? printer.jobFile?.path : undefined}
        printingNote={printer.status?.state
          ? `${t(`status.state.${printer.status.state}` as MessageKey)} · ${String(Math.floor(printer.job?.progress ?? 0))} %`
          : undefined}
        onprint={(entry: PrinterEntry, dir?: string, where?: string) =>
          (candidate = { ...fromList(entry), dir, where })}
      >
        <DropZone />
      </FileList>
    </div>
  </main>
  <WindowDrop
    model={identity.model}
    name={identity.hostname ?? identity.model?.name ?? t('app.title')}
  />
  <FilamentDialog
    open={filamentOpen}
    {canStart}
    onclose={() => (filamentOpen = false)}
  />
  <ClashDialog />
  {#if UpdateDialog}<UpdateDialog />{/if}
  <PrintDialog
    file={candidate}
    dir={files.path}
    onchangefilament={() => (filamentOpen = true)}
    onprint={print}
    {canStart}
    {blocked}
    onclose={() => (candidate = undefined)}
  />
{:else}
  <main class="flex-1 p-4">
    <Login />
  </main>
{/if}
<Footer />
