<script lang="ts">
  import { uploads } from './uploads.svelte';
  import { t, tn } from '../../lib/i18n.svelte';
  import { Button } from '../../lib/ui/button';
  import { Dialog } from '../../lib/ui/dialog';
</script>

<Dialog
  open={uploads.clashes.length > 0}
  title={tn('upload.clash', uploads.clashes.length)}
  onclose={() => {
    uploads.decide('skip');
  }}
>
  <ul class="flex max-h-40 flex-col gap-1 overflow-y-auto text-sm break-all">
    {#each uploads.clashes as name (name)}
      <li class="rounded-sm bg-muted px-2 py-1 font-mono text-xs">{name}</li>
    {/each}
  </ul>
  <p class="text-sm text-muted-foreground">{t('upload.clashBody')}</p>
  <div class="flex flex-wrap justify-end gap-2 max-sm:[&>*]:flex-1">
    <Button variant="secondary" size="lg" onclick={() => uploads.decide('skip')}
      >{t('upload.clashSkip')}</Button
    >
    <Button variant="secondary" size="lg" onclick={() => uploads.decide('keep')}
      >{t('upload.clashKeep')}</Button
    >
    <Button size="lg" onclick={() => uploads.decide('replace')}
      >{t('upload.clashReplace')}</Button
    >
  </div>
</Dialog>
