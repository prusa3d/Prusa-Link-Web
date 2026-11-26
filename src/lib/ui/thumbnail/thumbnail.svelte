<script lang="ts">
  import { Icon } from '../icon';
  import { FileCode } from '../icon/icons';

  interface Props {
    /// An image URL, a promise of one, or a loader called once the thumbnail
    /// is on screen (printer thumbnails cost a request each). The loader gets
    /// a check for whether it is still on screen when its request's turn
    /// comes, and answers null when it skipped; it is called again the next
    /// time the thumbnail scrolls into view.
    src:
      | string
      | Promise<string | undefined>
      | ((onScreen: () => boolean) => Promise<string | null | undefined>)
      | undefined;
    class?: string;
  }

  let { src, class: extra }: Props = $props();
  let url = $state<string | undefined>();
  let box: HTMLDivElement | undefined = $state();

  $effect(() => {
    url = undefined;
    const source = src;
    const element = box;
    if (!source || !element) return;
    let current = true;
    const show = (u: string | undefined) => {
      if (current) url = u;
    };
    if (typeof source !== 'function') {
      void Promise.resolve(source).then(show);
      return () => {
        current = false;
      };
    }
    let visible = false;
    let asking = false;
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (!visible || asking) return;
      asking = true;
      void source(() => visible && current).then((u) => {
        asking = false;
        if (u === null) return;
        observer.disconnect();
        show(u);
      });
    });
    observer.observe(element);
    return () => {
      current = false;
      observer.disconnect();
    };
  });
</script>

<div
  bind:this={box}
  class={[
    'flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground',
    extra,
  ]}
>
  {#if url}
    <img src={url} alt="" class="size-full object-contain" />
  {:else}
    <Icon node={FileCode} class="size-1/2" />
  {/if}
</div>
