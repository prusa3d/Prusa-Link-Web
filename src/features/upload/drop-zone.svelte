<script lang="ts">
  import { uploads } from './uploads.svelte';
  import type { Picked } from '../../lib/files/collect';
  import { t } from '../../lib/i18n.svelte';
  import { FileDrop } from '../../lib/ui/file-drop';
  import { Icon } from '../../lib/ui/icon';
  import { CloudUpload } from '../../lib/ui/icon/icons';
</script>

<!-- Stays in place during an upload, so the storage column does not jump; a
     drop then waits for the batch in progress (see the upload panel). -->
<FileDrop onfiles={(p: Picked) => void uploads.upload(p)}>
  <Icon node={CloudUpload} class="size-6 shrink-0 text-primary md:size-8" />
  <span class="font-medium md:hidden">{t('upload.phone')}</span>
  <span class="text-lg font-medium max-md:hidden"
    >{t('upload.dropDesktop')}</span
  >
  <span class="text-sm text-muted-foreground max-md:hidden"
    >{t('upload.chooseDesktop')}</span
  >
</FileDrop>
