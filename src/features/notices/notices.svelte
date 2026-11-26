<script lang="ts">
  import { t } from '../../lib/i18n.svelte';
  import { notices } from '../../lib/stores/notices.svelte';
  import { Button } from '../../lib/ui/button';
  import { Icon } from '../../lib/ui/icon';
  import { CircleX, X } from '../../lib/ui/icon/icons';
</script>

{#each notices.list as notice (notice.id)}
  <section
    class="rounded-lg relative edge flex items-start gap-3 overflow-hidden border border-state-fault-edge bg-state-fault p-4 text-state-fault-text"
    data-testid="notice"
  >
    <Icon node={CircleX} class="mt-0.5 size-5 shrink-0" />
    <div class="min-w-0 flex-1">
      <p class="font-semibold">{notice.title}</p>
      {#if notice.detail}<p class="mt-1 text-sm break-words">
          {notice.detail}
        </p>{/if}
    </div>
    <Button
      variant="ghost"
      size="sm"
      class="size-8 px-0 text-current"
      aria-label={t('common.close')}
      onclick={() => notices.dismiss(notice.id)}
    >
      <Icon node={X} />
    </Button>
    <!-- Runs down until the notice closes by itself. -->
    <span
      class="countdown absolute inset-x-0 bottom-0 h-1 origin-left bg-current opacity-40"
      style:animation-duration="{notice.seconds}s"
      aria-hidden="true"
    ></span>
  </section>
{/each}
