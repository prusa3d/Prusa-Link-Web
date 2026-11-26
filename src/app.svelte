<script lang="ts">
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
  import UpdateNotice from './features/firmware/update-notice.svelte';
  import UpdateDialog from './features/firmware/update-dialog.svelte';
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
  import { badgeTabIcon } from './features/printer/tab-icon';
  import { printer, type JobFile } from './lib/stores/printer.svelte';
  import { Button } from './lib/ui/button';
  import { EmptyState } from './lib/ui/empty-state';
  import { PrusaLinkLogo } from './lib/ui/logo';
  import { Spinner } from './lib/ui/spinner';

  session.takeKeyFromFragment(globalThis.location, globalThis.history);

  let candidate = $state<PrintCandidate | undefined>();
  let filamentOpen = $state(false);

  uploads.onuploaded = (file) => {
    if (canStart) candidate = file;
  };

  const multiTool = $derived(isMultiTool(identity.model?.variant));
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
    const stops = [printer.poll(), identity.poll(), filament.poll()];
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
    if (identity.firmware)
      void firmwareUpdate.check(identity.firmware, identity.model?.variant);
  });

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

  async function print(name: string) {
    const ok = await files.print(name, candidate?.dir ?? files.path);
    if (ok) {
      candidate = undefined;
      await printer.refresh();
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
      <UpdateNotice as="icon" />
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
  <main class="mx-auto flex max-w-5xl flex-col gap-6 p-4 md:p-6">
    <div class="grid items-start gap-6 md:grid-cols-2">
      <div class="flex flex-col gap-6 md:sticky md:top-6">
        {#if printer.offline && !printer.status}
          <div class="rounded-lg border bg-card">
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
              <PrinterIdentity model={identity.model} mmu={identity.mmu} />
            {/snippet}
            {#snippet alerts()}
              <!-- A dialog in front that already shows the printer's
                   question hides it here. -->
              <PrinterAlert
                status={printer.offline ||
                (filament.busy && (filamentOpen || candidate !== undefined))
                  ? undefined
                  : printer.status}
              />
              <Notices />
            {/snippet}
          </StatusPanel>
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
        <UpdateNotice as="card" />
      </div>
      <FileList
        {canStart}
        {blocked}
        printing={printer.job ? printer.jobFile?.path : undefined}
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
  <UpdateDialog />
  <PrintDialog
    file={candidate}
    onprint={print}
    {canStart}
    {blocked}
    onclose={() => (candidate = undefined)}
  />
{:else}
  <main class="p-4">
    <Login />
  </main>
{/if}
<Footer />
