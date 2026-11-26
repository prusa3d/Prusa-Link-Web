<script lang="ts">
  import { Icon } from '../../lib/ui/icon';
  import { ChevronRight, KeyRound } from '../../lib/ui/icon/icons';
  import { tick } from 'svelte';

  import { checkKey } from '../../lib/api/client';
  import { pictureFor, rememberedVariant } from '../../lib/printer/picture';
  import { session } from '../../lib/auth/session.svelte';
  import { t } from '../../lib/i18n.svelte';
  import { Alert } from '../../lib/ui/alert';
  import { Button } from '../../lib/ui/button';
  import { Checkbox } from '../../lib/ui/checkbox';
  import { Input } from '../../lib/ui/input';
  import { Label } from '../../lib/ui/label';

  /// The printer generates 15 characters (lib/WUI/wui.cpp).
  const LENGTH = 15;
  let key = $state('');
  let remember = $state(true);
  let busy = $state(false);
  let error = $state<'rejected' | 'unreachable' | undefined>();
  let input: HTMLInputElement | undefined = $state();
  const picture = pictureFor(rememberedVariant())?.url;

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    const trimmed = key.trim();
    busy = true;
    error = undefined;
    const result = await checkKey(trimmed);
    busy = false;
    if (result === 'ok') {
      session.signIn(trimmed, remember);
    } else {
      error = result;
      await tick();
      input?.focus();
    }
  }
</script>

<form
  class="rounded-lg mt-8 flex max-w-md flex-col gap-4 border bg-card p-6 max-sm:edge sm:mx-auto md:mt-16"
  onsubmit={submit}
>
  <div class="flex flex-col items-center gap-3 text-center">
    {#if picture}
      <img
        src={picture}
        alt=""
        class="dark:rounded-lg h-28 w-auto object-contain dark:bg-white/90 dark:p-2"
      />
    {:else}
      <div
        class="flex size-14 items-center justify-center rounded-full bg-accent text-primary"
      >
        <Icon node={KeyRound} class="size-7" />
      </div>
    {/if}
    <h1 class="text-xl font-semibold">{t('login.title')}</h1>
    <p class="text-sm text-muted-foreground">{t('login.subtitle')}</p>
  </div>
  <section
    aria-labelledby="password-help"
    class="rounded-md bg-muted p-4 text-sm"
  >
    <h2 id="password-help" class="font-semibold">{t('login.helpTitle')}</h2>
    <ol class="mt-2 flex list-decimal flex-col gap-1.5 ps-5">
      <li>
        {t('login.helpOpen')}
        <span class="mt-1 flex flex-wrap items-center gap-1 font-medium">
          {#each [t('login.menuSettings'), t('login.menuNetwork'), 'PrusaLink'] as step, i (step)}
            {#if i > 0}<Icon
                node={ChevronRight}
                class="size-3.5 text-muted-foreground"
              />{/if}
            <span class="rounded-sm border bg-background px-1.5 py-0.5"
              >{step}</span
            >
          {/each}
        </span>
      </li>
      <li>{t('login.helpRead')}</li>
      <li>{t('login.helpType')}</li>
    </ol>
  </section>
  <div class="flex flex-col gap-1.5">
    <div class="flex items-baseline justify-between">
      <Label for="password">{t('login.password')}</Label>
      <span
        class="text-xs text-muted-foreground tabular-nums"
        aria-hidden="true">{key.trim().length} / {LENGTH}</span
      >
    </div>
    <Input
      id="password"
      type="text"
      autocomplete="current-password"
      autocapitalize="none"
      autocorrect="off"
      spellcheck={false}
      maxlength={LENGTH}
      placeholder={'•'.repeat(LENGTH)}
      aria-describedby="password-hint"
      aria-invalid={error === 'rejected'}
      class="h-16! text-center font-mono text-3xl! tracking-widest"
      bind:value={key}
      bind:element={input}
      required
    />
    <p id="password-hint" class="text-sm text-muted-foreground">
      {t('login.hint')}
    </p>
  </div>
  <Checkbox bind:checked={remember}>{t('login.remember')}</Checkbox>
  {#if error}
    <Alert variant="destructive">{t(`login.${error}`)}</Alert>
  {/if}
  <Button type="submit" size="lg" loading={busy}>{t('login.submit')}</Button>
</form>
