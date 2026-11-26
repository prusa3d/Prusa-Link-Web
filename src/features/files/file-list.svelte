<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icon } from '../../lib/ui/icon';
  import {
    ChevronLeft,
    ChevronRight,
    Clock,
    Folder,
    FolderOpen,
    Printer,
    Search,
    Trash,
    TriangleAlert,
    Usb,
  } from '../../lib/ui/icon/icons';
  import { onMount, tick } from 'svelte';

  import { files, label, type PrinterEntry } from './files.svelte';
  import { fileVersion, smallThumbnail } from '../../lib/api/thumbnail';
  import { localThumbnail } from '../../lib/files/local-thumbnails';
  import { formatDuration, parseFileName } from '../../lib/files/name';
  import { language, t } from '../../lib/i18n.svelte';
  import { Alert } from '../../lib/ui/alert';
  import { Button } from '../../lib/ui/button';
  import { EmptyState } from '../../lib/ui/empty-state';
  import { MaterialChip } from '../../lib/ui/material';
  import { Badge } from '../../lib/ui/badge';
  import { groupMaterials } from '../../lib/files/group-materials';
  import { when } from '../../lib/files/when';
  import { Dialog } from '../../lib/ui/dialog';
  import { Input } from '../../lib/ui/input';
  import { listings, searchBelow, type Found } from './crawl';
  import { Spinner } from '../../lib/ui/spinner';
  import { Thumbnail } from '../../lib/ui/thumbnail';

  interface Props {
    /// Shown under the search while not searching (the drop zone).
    children?: Snippet;
    /// The printer takes a new print now.
    canStart: boolean;
    /// Why it does not, said on the print buttons ("Already printing").
    blocked?: string | undefined;
    /// Asks before starting; the caller shows the print dialog.
    /// The path of the file being printed (`toys/DRAGON~1.BGC`): it cannot
    /// be deleted.
    printing?: string | undefined;
    /// Said on the printing file's row, e.g. "Printing · 60 %".
    printingNote?: string | undefined;
    /// Opens the file's details and print dialog. `dir` and `where` are set
    /// for a file found in a subfolder by search.
    onprint: (entry: PrinterEntry, dir?: string, where?: string) => void;
  }

  let { canStart, blocked, printing, printingNote, onprint, children }: Props =
    $props();
  const pathOf = (file: PrinterEntry, dir: string | undefined) => {
    const folder = dir ?? files.path;
    return folder ? `${folder}/${file.name}` : file.name;
  };

  // A folder can hold hundreds of files: they come 25 at a time, and a search
  // narrows the folder. Both are in the page; the printer lists a folder whole.
  const PAGE = 25;
  let query = $state('');
  let limit = $state(PAGE);
  let seenPath = $state('');
  const matches = (name: string) =>
    name.toLowerCase().includes(query.trim().toLowerCase());
  const folders = $derived(files.folders.filter((f) => matches(label(f))));
  const found = $derived(files.files.filter((f) => matches(label(f))));
  // Searching also lists the folders below, one at a time, once the typing
  // pauses; results come in as each folder is read.
  const MIN_QUERY = 2;
  let below = $state<Found<PrinterEntry>[]>([]);
  let searching = $state(false);
  $effect(() => {
    const q = query.trim();
    below = [];
    if (q.length < MIN_QUERY) return;
    const abort = new AbortController();
    const start = {
      dir: files.path,
      where: files.crumbs.map((c) => c.label).join(' / '),
    };
    const timer = setTimeout(() => {
      searching = true;
      void searchBelow(
        start,
        q,
        (dir) => files.listing(dir),
        listings as Map<string, PrinterEntry[]>,
        abort.signal,
        (hits) => {
          if (!abort.signal.aborted) below = [...below, ...hits];
        },
      ).finally(() => {
        if (!abort.signal.aborted) searching = false;
      });
    }, 400);
    return () => {
      clearTimeout(timer);
      abort.abort();
      searching = false;
    };
  });

  // The file waiting for the person's yes to be deleted.
  let doomed = $state<
    { file: PrinterEntry; dir: string | undefined; name: string } | undefined
  >();
  let deleting = $state(false);
  let deleteFailed = $state(false);

  async function remove() {
    if (!doomed) return;
    deleting = true;
    const ok = await files.remove(doomed.file.name, doomed.dir);
    deleting = false;
    deleteFailed = !ok;
    if (ok) doomed = undefined;
  }

  // Try again shows it is trying for at least a second, so a quick "still no
  // drive" does not look like a button that did nothing.
  let retrying = $state(false);
  async function retry() {
    retrying = true;
    // The answer is shown only after the second: a found drive replaces this
    // button at once.
    await new Promise((r) => setTimeout(r, 1000));
    await files.refresh();
    retrying = false;
  }

  // A new folder starts unsearched, from its first page.
  $effect(() => {
    if (files.path === seenPath) return;
    seenPath = files.path;
    query = '';
    limit = PAGE;
  });
  let heading: HTMLElement | undefined = $state();

  // Also on `prusalink:identity`: a different printer (the dev server's mock
  // switching model) has a different USB drive.
  onMount(() => {
    const refresh = () => {
      void files.refresh();
    };
    refresh();
    addEventListener('prusalink:identity', refresh);
    return () => {
      removeEventListener('prusalink:identity', refresh);
    };
  });

  const all = $derived([
    { depth: 0, label: t('files.usb') },
    ...files.crumbs.map((c, i) => ({ depth: i + 1, label: c.label })),
  ]);
  const shown = $derived(
    all.length > 4
      ? [all[0], { depth: -1, label: '…' }, ...all.slice(-2)].filter((c) => !!c)
      : all,
  );
  const hidden = $derived(
    all
      .slice(1, -2)
      .map((c) => c.label)
      .join(' / '),
  );

  // Opening a folder removes the button that had focus; move focus to the
  // folder's heading so keyboard and screen-reader users know where they are.
  async function go(step: () => Promise<void>) {
    await step();
    await tick();
    heading?.focus();
  }

  // Only the small picture: printer traffic is slow and costly, and the large
  // one (tens of KB) is for the print dialog alone.
  // A file uploaded in this visit shows the picture the page already read.
  const icon = (entry: PrinterEntry) =>
    localThumbnail(label(entry)) ??
    (entry.refs?.icon || entry.refs?.thumbnail
      ? (onScreen: () => boolean) =>
          smallThumbnail(
            onScreen,
            fileVersion(entry),
            entry.refs?.icon,
            entry.refs?.thumbnail,
            96,
          )
      : undefined);
  // "7 minutes ago" moves on by itself.
  let now = $state(Date.now());
  $effect(() => {
    const id = setInterval(() => (now = Date.now()), 30_000);
    return () => {
      clearInterval(id);
    };
  });
  const date = (s: number | undefined) =>
    s === undefined ? '' : when(s, now, language());
  const fullDate = (s: number | undefined) =>
    s === undefined ? undefined : new Date(s * 1000).toLocaleString(language());
</script>

{#snippet row(
  file: PrinterEntry,
  dir: string | undefined,
  where: string | undefined,
)}
  {@const info = parseFileName(label(file))}
  {@const current = printing !== undefined && pathOf(file, dir) === printing}
  <li
    class={['flex items-center gap-3 p-3', current && 'bg-state-active']}
    data-printing={current || undefined}
  >
    <Thumbnail src={icon(file)} class="size-12" />
    <div class="min-w-0 flex-1">
      <!-- The name opens the file's details, also while printing. -->
      <Button
        variant="ghost"
        class="h-auto w-full min-w-0 shrink! justify-start p-0! text-start text-base font-medium whitespace-normal! text-foreground hover:bg-transparent hover:underline"
        onclick={() => onprint(file, dir, where)}
      >
        <span class="line-clamp-2 break-words">{info.name}</span>
      </Button>
      <p
        class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground"
      >
        {#if current && printingNote}
          <Badge tone="active" testid="file-printing">{printingNote}</Badge>
        {/if}
        {#each groupMaterials(info.materials) as material (material)}
          <MaterialChip name={material} />
        {/each}
        {#if info.duration !== undefined}
          <span class="flex items-center gap-1">
            <Icon node={Clock} class="size-3" />
            <span class="sr-only">{t('files.duration')}</span>
            {formatDuration(info.duration)}
          </span>
        {/if}
        <span title={fullDate(file.m_timestamp)}>{date(file.m_timestamp)}</span>
      </p>
      {#if where}
        <p
          class="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground"
        >
          <Icon node={Folder} class="size-3 shrink-0" />{where}
        </p>
      {/if}
    </div>
    <div class="flex shrink-0 flex-col items-stretch gap-1">
      <Button
        size="sm"
        class="max-sm:size-11 max-sm:px-0"
        disabled={!canStart}
        title={canStart ? undefined : (blocked ?? t('files.busy'))}
        onclick={() => onprint(file, dir, where)}
        aria-label={`${t('files.print')} ${info.name}`}
      >
        <Icon node={Printer} />
        <span class="max-sm:sr-only"
          >{canStart ? t('files.print') : (blocked ?? t('files.print'))}</span
        >
      </Button>
      <Button
        variant="ghost"
        size="sm"
        class="max-sm:size-11 max-sm:px-0"
        aria-label={`${t('files.delete')} ${info.name}`}
        disabled={pathOf(file, dir) === printing}
        title={pathOf(file, dir) === printing
          ? t('files.deletePrinting')
          : undefined}
        onclick={() => (doomed = { file, dir, name: info.name })}
      >
        <Icon node={Trash} /><span class="max-sm:sr-only"
          >{t('files.delete')}</span
        >
      </Button>
    </div>
  </li>
{/snippet}

<section aria-labelledby="files-title" class="flex min-w-0 flex-col gap-2">
  <!-- The heading is the storage at its root and the folder's path inside
       it. Deep paths keep the root, the parent and the current folder: the
       rest collapses into "…", which names them all on hover. Earlier
       folders are links back. Long names wrap instead of hiding the end. -->
  <div class="flex min-h-11 items-center gap-1">
    {#if files.path}
      <Button
        variant="ghost"
        class="-ms-2 size-11 shrink-0 px-0 md:size-9"
        onclick={() => void go(() => files.up())}
        aria-label={t('files.up')}
      >
        <Icon node={ChevronLeft} />
      </Button>
    {/if}
    <h2
      id="files-title"
      bind:this={heading}
      tabindex="-1"
      class="flex min-w-0 flex-wrap items-center gap-x-1 rounded-sm text-lg font-semibold break-all outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-testid={files.path ? 'files-path' : undefined}
    >
      {#if !files.path}
        {t('files.storage')}
      {:else}
        {#each shown as crumb, i (crumb.depth)}
          {#if i > 0}<span class="text-muted-foreground" aria-hidden="true"
              >/</span
            >{/if}
          {#if crumb.depth < 0}
            <span class="text-muted-foreground" title={hidden}>…</span>
          {:else if crumb.depth === files.crumbs.length}
            <span aria-current="location">{crumb.label}</span>
          {:else}
            <Button
              variant="ghost"
              class="h-auto px-0.5! text-lg! font-semibold! break-all whitespace-normal text-link! hover:bg-transparent hover:underline max-sm:min-h-11"
              onclick={() => void go(() => files.goTo(crumb.depth))}
            >
              {crumb.label}
            </Button>
          {/if}
        {/each}
      {/if}
    </h2>
  </div>

  {#if files.folders.length + files.files.length > 8}
    <div class="relative">
      <Icon
        node={Search}
        class="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        class="ps-9"
        bind:value={query}
        placeholder={t('files.search')}
        aria-label={t('files.search')}
        data-testid="file-search"
        oninput={() => (limit = PAGE)}
      />
    </div>
  {/if}

  <!-- Dropping goes into the folder shown; a search hides it, since the
       results may come from other folders. -->
  {#if query.trim() === ''}
    {@render children?.()}
  {/if}

  {#if files.failed}
    <div class="rounded-lg border bg-card">
      {#if files.noUsb}
        <EmptyState
          icon={Usb}
          title={t('files.noUsb')}
          body={t('files.noUsbBody')}
        >
          <Button
            variant="secondary"
            loading={retrying}
            onclick={() => void retry()}>{t('files.retry')}</Button
          >
        </EmptyState>
      {:else}
        <EmptyState
          icon={TriangleAlert}
          tone="fault"
          title={t('files.failed')}
          body={t('files.failedBody')}
        >
          <Button
            variant="secondary"
            loading={retrying}
            onclick={() => void retry()}>{t('files.retry')}</Button
          >
        </EmptyState>
      {/if}
    </div>
  {:else if files.loading}
    <ul
      class="rounded-lg divide-y border bg-card"
      aria-busy="true"
      aria-label={t('files.loading')}
    >
      <li
        class="flex items-center gap-2 px-3 pt-3 text-sm text-muted-foreground"
      >
        <Spinner class="size-4" />{t('files.loading')}
      </li>
      {#each [1, 2, 3] as row (row)}
        <li class="flex items-center gap-3 p-3">
          <div class="size-12 animate-pulse rounded-md bg-muted"></div>
          <div class="h-4 flex-1 animate-pulse rounded-sm bg-muted"></div>
        </li>
      {/each}
    </ul>
  {:else}
    <ul
      class="rounded-lg divide-y border bg-card"
      aria-label={t('files.label')}
    >
      {#each folders as folder (`${folder.name}|${label(folder)}`)}
        <li>
          <Button
            variant="ghost"
            class="h-12 w-full min-w-0 justify-start rounded-none px-3 text-foreground"
            onclick={() =>
              void go(() => files.open(folder.name, label(folder)))}
          >
            <Icon node={Folder} class="text-muted-foreground" />
            <span class="truncate">{label(folder)}</span>
            <Icon node={ChevronRight} class="ms-auto text-muted-foreground" />
          </Button>
        </li>
      {/each}
      <!-- Keyed by both names: firmware 8.0.2 can list two files under one 8.3
           name (e.g. BORDER~1.BGC for "Border Collie" and "Border Collie2"). -->
      {#each found.slice(0, limit) as file (`${file.name}|${label(file)}`)}
        {@render row(file, undefined, undefined)}
      {/each}
      {#if query.trim().length >= MIN_QUERY}
        <li
          class="flex items-center gap-2 bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground"
          data-testid="search-below"
        >
          {#if searching}<Spinner class="size-3.5" />{/if}
          {t(searching ? 'files.searchingBelow' : 'files.inSubfolders', {
            count: below.length,
          })}
        </li>
        {#each below as hit (`${hit.dir}/${hit.entry.name}|${label(hit.entry)}`)}
          {@render row(hit.entry, hit.dir, hit.where)}
        {/each}
      {/if}
      {#if found.length > limit}
        <li>
          <Button
            variant="ghost"
            class="h-12 w-full rounded-none text-link"
            onclick={() => (limit += PAGE)}
          >
            {t('files.more', {
              count: Math.min(PAGE, found.length - limit),
              left: found.length - limit,
            })}
          </Button>
        </li>
      {/if}
      {#if query && !folders.length && !found.length}
        <li class="p-6 text-center text-sm text-muted-foreground">
          {t('files.noMatch', { query })}
        </li>
      {:else if !files.folders.length && !files.files.length}
        <li>
          {#if files.path}
            <EmptyState icon={FolderOpen} title={t('files.emptyFolder')} />
          {:else}
            <EmptyState
              icon={Usb}
              title={t('files.emptyTitle')}
              body={t('files.emptyBody')}
            />
          {/if}
        </li>
      {/if}
    </ul>
  {/if}
</section>

<Dialog
  open={doomed !== undefined}
  title={t('files.deleteTitle', { name: doomed?.name ?? '' })}
  onclose={() => {
    doomed = undefined;
    deleteFailed = false;
  }}
>
  <p class="text-sm text-muted-foreground">{t('files.deleteBody')}</p>
  {#if deleteFailed}
    <Alert variant="destructive">{t('files.deleteFailed')}</Alert>
  {/if}
  <div class="flex flex-wrap justify-end gap-2 max-sm:[&>*]:flex-1">
    <Button
      variant="secondary"
      size="lg"
      onclick={() => {
        doomed = undefined;
        deleteFailed = false;
      }}>{t('upload.cancel')}</Button
    >
    <Button
      variant="destructive"
      size="lg"
      loading={deleting}
      onclick={() => void remove()}>{t('files.delete')}</Button
    >
  </div>
</Dialog>
