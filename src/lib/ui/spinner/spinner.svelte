<script lang="ts">
  import { Icon } from '../icon';
  import { LoaderCircle } from '../icon/icons';

  interface Props {
    class?: string;
  }

  let { class: extra }: Props = $props();
</script>

<!-- eslint-disable no-restricted-syntax -- this is the Spinner primitive -->
<Icon
  node={LoaderCircle}
  class={['animate-spin motion-reduce:animate-none', extra]}
/>
<!-- eslint-enable no-restricted-syntax -->
