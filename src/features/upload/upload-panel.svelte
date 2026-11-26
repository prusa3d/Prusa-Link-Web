<script lang="ts">
  import { Icon } from '../../lib/ui/icon';
  import { Check, CloudUpload, X } from '../../lib/ui/icon/icons';

  import { UPLOADED_SHOWN_S, uploads } from './uploads.svelte';
  import { t } from '../../lib/i18n.svelte';
  import { Alert } from '../../lib/ui/alert';
  import { Button } from '../../lib/ui/button';
</script>

<!-- Uploads in progress and the last batch's result: the left column's
     "what is happening now". -->
{#if uploads.busy !== undefined || uploads.items.length > 0 || uploads.notice}
  <div class="flex flex-col gap-2" data-testid="upload-status">
    {#if uploads.busy !== undefined || uploads.items.length > 0}
      <div
        class="rounded-lg relative flex flex-col gap-3 overflow-hidden border bg-card p-4"
        role="status"
        data-testid="upload-panel"
      >
        <div class="flex items-center gap-2">
          <Icon
            node={uploads.finished ? Check : CloudUpload}
            class="size-5 shrink-0 text-primary"
          />
          <span
            class="min-w-0 flex-1 truncate text-sm font-medium"
            data-testid="upload-progress"
            >{uploads.busy ?? t('upload.finished')}</span
          >
          {#if uploads.finished}
            <Button
              variant="ghost"
              size="sm"
              class="size-8 px-0"
              aria-label={t('common.close')}
              onclick={() => uploads.dismissList()}
            >
              <Icon node={X} />
            </Button>
          {:else}
            <Button
              variant="ghost"
              size="sm"
              class="max-sm:size-11 max-sm:px-0"
              onclick={() => uploads.cancel()}
            >
              <Icon node={X} /><span class="max-sm:sr-only"
                >{t('upload.cancel')}</span
              >
            </Button>
          {/if}
        </div>
        {#if uploads.items.length}
          <ul class="flex flex-col gap-2" data-testid="upload-items">
            {#each uploads.items as item, i (i)}
              <li class="flex flex-col gap-1" data-state={item.state}>
                <div class="flex items-center gap-2 text-sm">
                  <span class="min-w-0 flex-1 truncate">{item.name}</span>
                  <span
                    class={[
                      'shrink-0 tabular-nums',
                      item.state === 'failed'
                        ? 'text-destructive'
                        : 'text-muted-foreground',
                    ]}
                  >
                    {#if item.state === 'uploading' && item.fraction >= 1}
                      <!-- Sent, and the printer is still writing it to the
                         drive: its answer comes when the file is saved. -->
                      {t('upload.item.saving')}
                    {:else if item.state === 'uploading'}
                      {Math.round(item.fraction * 100)} %
                    {:else if item.state === 'done'}
                      <Icon node={Check} class="size-4 text-primary" />
                    {:else}
                      {t(`upload.item.${item.state}`)}
                    {/if}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={item.name}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(item.fraction * 100)}
                  class="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                >
                  <div
                    class={[
                      'h-full',
                      item.state === 'done' ? 'bg-primary' : 'bg-progress',
                    ]}
                    style:width="{item.fraction * 100}%"
                  ></div>
                </div>
              </li>
            {/each}
          </ul>
        {/if}
        {#if uploads.finished}
          <!-- Runs down until the list closes by itself. -->
          <span
            class="countdown absolute inset-x-0 bottom-0 h-1 origin-left bg-primary opacity-40"
            style:animation-duration="{UPLOADED_SHOWN_S}s"
            aria-hidden="true"
          ></span>
        {/if}
      </div>
    {/if}
    {#if uploads.notice}
      <Alert variant={uploads.notice.error ? 'destructive' : 'info'}
        >{uploads.notice.text}</Alert
      >
    {/if}
  </div>
{/if}
