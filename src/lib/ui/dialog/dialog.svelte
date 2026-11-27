<!-- A modal on the native <dialog>: the browser traps focus, closes it on
     Escape and returns focus to what opened it. The title and the actions
     stay in view while the content scrolls between them. -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  import { t } from '../../i18n.svelte';
  import { Button } from '../button';
  import { Icon } from '../icon';
  import { X } from '../icon/icons';

  interface Props {
    open: boolean;
    title: string;
    onclose: () => void;
    /// `lg` for dialogs whose actions need a wider row, `xl` for ones full
    /// of content (a print's preview, details and tool mapping).
    size?: 'md' | 'lg' | 'xl';
    children: Snippet;
    /// The actions, kept in view at the bottom while the content scrolls.
    footer?: Snippet | undefined;
  }

  let { open, title, onclose, size = 'md', children, footer }: Props = $props();
  let element: HTMLDialogElement | undefined = $state();
  const id = $props.id();

  $effect(() => {
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  });
</script>

<!-- eslint-disable svelte/no-restricted-html-elements -- this is the Dialog primitive -->
<dialog
  bind:this={element}
  aria-labelledby="{id}-title"
  {onclose}
  class={[
    'rounded-lg m-auto max-h-dvh w-full overflow-y-auto',
    {
      md: 'max-w-md',
      lg: 'max-w-xl',
      xl: 'max-w-xl md:max-w-2xl lg:max-w-3xl',
    }[size],
    'border bg-card p-0 text-card-foreground backdrop:bg-black/50 max-sm:mb-0 max-sm:max-w-full max-sm:rounded-b-none max-sm:border-x-0',
  ]}
>
  <div class="sticky top-0 z-10 flex items-start gap-2 bg-card px-5 pt-5 pb-3">
    <h2
      id="{id}-title"
      class="min-w-0 flex-1 text-lg font-semibold break-words"
    >
      {title}
    </h2>
    <Button
      variant="ghost"
      class="-me-2 -mt-1 size-9 shrink-0 px-0 max-sm:size-11"
      aria-label={t('common.close')}
      onclick={onclose}
    >
      <Icon node={X} />
    </Button>
  </div>
  <div class={['flex flex-col gap-4 px-5', footer ? 'pb-4' : 'safe-bottom']}>
    {@render children()}
  </div>
  {#if footer}
    <div class="sticky bottom-0 z-10 border-t bg-card px-5 pt-3 safe-bottom">
      {@render footer()}
    </div>
  {/if}
</dialog>
<!-- eslint-enable svelte/no-restricted-html-elements -->
