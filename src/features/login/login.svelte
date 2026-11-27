<script lang="ts">
  import { Icon } from '../../lib/ui/icon';
  import {
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Eye,
    KeyRound,
    Printer,
  } from '../../lib/ui/icon/icons';
  import { tick } from 'svelte';

  import { checkKey } from '../../lib/api/client';
  import { pictureFor, rememberedVariant } from '../../lib/printer/picture';
  import { Pairing } from '../../lib/auth/pairing.svelte';
  import { session } from '../../lib/auth/session.svelte';
  import { t, type MessageKey } from '../../lib/i18n.svelte';
  import { Alert } from '../../lib/ui/alert';
  import { Button } from '../../lib/ui/button';
  import { Checkbox } from '../../lib/ui/checkbox';
  import { Input } from '../../lib/ui/input';
  import { Label } from '../../lib/ui/label';
  import { Spinner } from '../../lib/ui/spinner';

  /// The printer generates 15 characters (lib/WUI/wui.cpp).
  const LENGTH = 15;
  let key = $state('');
  let remember = $state(true);
  let shown = $state(false);
  let busy = $state(false);
  let error = $state<MessageKey | undefined>();
  let input: HTMLInputElement | undefined = $state();
  /// Remembered, so a password manager finds its field at once next time.
  const PASSWORD_FIRST = 'prusalink.password-first';
  let withPassword = $state(stored());

  function stored() {
    try {
      return !!localStorage.getItem(PASSWORD_FIRST);
    } catch {
      return false;
    }
  }

  function choosePassword(chosen: boolean) {
    withPassword = chosen;
    error = undefined;
    try {
      if (chosen) localStorage.setItem(PASSWORD_FIRST, '1');
      else localStorage.removeItem(PASSWORD_FIRST);
    } catch {
      // Asked again next time.
    }
  }
  let variant = $state(rememberedVariant());
  const picture = $derived(pictureFor(variant)?.url);

  $effect(() => {
    const refresh = () => (variant = rememberedVariant());
    addEventListener('prusalink:identity', refresh);
    return () => {
      removeEventListener('prusalink:identity', refresh);
    };
  });
  const pairing = __PAIRING__ ? new Pairing() : undefined;

  $effect(() => {
    void pairing?.probe();
    return () => {
      pairing?.cancel();
    };
  });

  async function pair() {
    if (!pairing) return;
    error = undefined;
    const paired = await pairing.start();
    const { state } = pairing;
    if (paired) session.signIn(paired, remember);
    else if (state === 'unreachable') error = 'login.unreachable';
    else if (state) error = `login.pair.${state}`;
  }

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
      error = `login.${result}`;
      await tick();
      input?.focus();
    }
  }
</script>

<div
  class="rounded-lg mt-8 flex max-w-md flex-col gap-4 border bg-card p-6 max-sm:edge sm:mx-auto md:mt-16"
>
  <div class="flex flex-col items-center gap-3 text-center">
    {#if picture}
      <img
        src={picture}
        alt=""
        class="dark:rounded-lg h-28 w-auto object-contain dark:bg-white/90"
      />
    {:else}
      <div
        class="flex size-14 items-center justify-center rounded-full bg-accent text-primary"
      >
        <Icon node={KeyRound} class="size-7" />
      </div>
    {/if}
    <h1 class="text-xl font-semibold">{t('login.title')}</h1>
  </div>
  {#if error}
    <Alert variant="destructive">{t(error)}</Alert>
  {/if}
  {#if pairing?.code}
    <div class="flex flex-col gap-4" data-testid="pairing">
      <p
        class="text-center font-mono text-4xl font-semibold tracking-widest"
        data-testid="pairing-code"
      >
        {pairing.code}
      </p>
      <p class="flex items-center justify-center gap-2 text-sm">
        <Spinner class="size-4 shrink-0" />{t('login.pairCheck')}
      </p>
      <Button
        variant="ghost"
        onclick={() => {
          pairing.cancel();
        }}>{t('upload.cancel')}</Button
      >
    </div>
  {:else if pairing?.supported && !withPassword}
    <p class="text-center text-sm text-muted-foreground">
      {t('login.subtitle')}
    </p>
    <div class="grid grid-cols-2 gap-3">
      {#each [[Printer, 'login.pair', pair], [KeyRound, 'login.havePassword', () => {
            choosePassword(true);
          }]] as const as [icon, label, onclick] (label)}
        <Button
          variant="secondary"
          class="h-auto flex-col py-5 text-base whitespace-normal"
          {onclick}
        >
          <Icon node={icon} class="size-8" />{t(label)}
        </Button>
      {/each}
    </div>
  {:else if pairing?.supported !== undefined || !pairing}
    <form class="flex flex-col gap-4" onsubmit={submit}>
      <!-- Password managers file the password under a user: the firmware's
       fixed Digest user. -->
      <Input
        type="text"
        name="username"
        autocomplete="username"
        value="maker"
        readonly
        hidden
      />
      <div class="flex flex-col gap-1.5">
        <div class="flex items-baseline justify-between">
          <Label for="password">{t('login.password')}</Label>
          <span
            class="text-xs text-muted-foreground tabular-nums"
            aria-hidden="true">{key.trim().length} / {LENGTH}</span
          >
        </div>
        <div class="relative">
          <Input
            id="password"
            name="password"
            type={shown ? 'text' : 'password'}
            autocomplete="current-password"
            autocapitalize="none"
            autocorrect="off"
            spellcheck={false}
            maxlength={LENGTH}
            placeholder={'•'.repeat(LENGTH)}
            aria-invalid={error === 'login.rejected'}
            class="h-16! ps-2! pe-11! text-center font-mono text-2xl! tracking-widest sm:text-3xl!"
            bind:value={key}
            bind:element={input}
            required
          />
          <Button
            variant="ghost"
            class="absolute inset-y-0 end-0 my-auto size-11 px-0 aria-pressed:text-primary"
            aria-label={t('login.show')}
            aria-pressed={shown}
            onclick={() => (shown = !shown)}
          >
            <Icon node={Eye} class="size-5" />
          </Button>
        </div>
      </div>
      <Checkbox bind:checked={remember}>{t('login.remember')}</Checkbox>
      <Button type="submit" size="lg" loading={busy}>{t('login.submit')}</Button
      >
    </form>
    <section
      aria-labelledby="password-help"
      class="flex flex-col gap-2 rounded-md bg-muted p-4 text-sm"
    >
      <h2 id="password-help" class="font-semibold">{t('login.helpTitle')}</h2>
      <a
        href="https://connect.prusa3d.com"
        target="_blank"
        rel="noopener"
        class="flex items-center gap-1 font-medium text-primary underline"
        >{t('login.helpConnect')}<Icon
          node={ExternalLink}
          class="size-3.5"
        /></a
      >
      <div>
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
      </div>
      <p class="text-muted-foreground">
        {t('login.helpRead')}
        {t('login.helpType')}
      </p>
    </section>
    {#if pairing?.supported}
      <Button
        variant="ghost"
        class="self-start"
        onclick={() => {
          choosePassword(false);
        }}><Icon node={ChevronLeft} />{t('login.back')}</Button
      >
    {/if}
  {/if}
</div>
