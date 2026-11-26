<!-- The print that ended last: what it was, how it ended, and a way to print
     it again. Sits between the printer card and the drop zone. -->
<script lang="ts">
  import { smallThumbnail } from '../../lib/api/thumbnail';
  import { localThumbnail } from '../../lib/files/local-thumbnails';
  import { parseFileName } from '../../lib/files/name';
  import { t } from '../../lib/i18n.svelte';
  import type { LastPrint } from '../../lib/stores/printer.svelte';
  import { Button } from '../../lib/ui/button';
  import { Icon } from '../../lib/ui/icon';
  import { CircleCheck, CircleX, RotateCcw } from '../../lib/ui/icon/icons';
  import { Thumbnail } from '../../lib/ui/thumbnail';

  interface Props {
    last: LastPrint;
    canStart: boolean;
    onagain: () => void;
  }

  let { last, canStart, onagain }: Props = $props();
  const done = $derived(last.result === 'FINISHED');
</script>

<section
  aria-labelledby="last-title"
  class="rounded-lg flex items-center gap-3 border bg-card p-3"
  data-testid="last-print"
>
  <Thumbnail
    src={localThumbnail(last.file.displayName) ??
      ((onScreen: () => boolean) =>
        smallThumbnail(
          onScreen,
          last.file.version,
          last.file.icon,
          last.file.thumbnail,
          96,
        ))}
    class="size-12"
  />
  <div class="min-w-0 flex-1">
    <h2 id="last-title" class="text-xs text-muted-foreground">
      {t('last.title')}
    </h2>
    <p class="truncate font-medium">
      {parseFileName(last.file.displayName).name}
    </p>
    <p
      class={[
        'flex items-center gap-1 text-sm',
        done ? 'text-success-text' : 'text-destructive-text',
      ]}
    >
      <Icon node={done ? CircleCheck : CircleX} class="size-4" />
      {t(done ? 'last.finished' : 'last.stopped')}
    </p>
  </div>
  <Button
    variant="secondary"
    class="max-sm:size-11 max-sm:px-0"
    disabled={!canStart}
    onclick={onagain}
    aria-label={t('last.again')}
  >
    <Icon node={RotateCcw} /><span class="max-sm:sr-only"
      >{t('last.again')}</span
    >
  </Button>
</section>
