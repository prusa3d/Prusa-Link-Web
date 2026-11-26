<!-- One heater's label on the printer's picture, in the picture's units: the
     leader with a dot on the part, the reading above the line with a heating
     or cooling chevron, the heater's icon and name under it. -->
<script lang="ts">
  import { t } from '../../lib/i18n.svelte';
  import {
    type Label,
    labelLayout,
    type LabelStyle,
    labelValue,
    type Reading,
    tone,
    trend,
  } from '../../lib/printer/status-picture';
  import {
    BED_HEAT,
    BED_PLATE,
    NOZZLE,
  } from '../../lib/ui/telemetry-icon/paths';

  interface Props {
    label: Label;
    style: LabelStyle;
    reading: Reading;
  }

  let { label, style, reading }: Props = $props();

  const l = $derived(labelLayout(label, style));
  const text = $derived(labelValue(reading.current));
  const chevron = $derived(
    {
      up: 'M12 2 24 15v7L12 9 0 22v-7Z',
      down: 'M12 22 0 9V2l12 13L24 2v7Z',
      none: undefined,
    }[trend(reading) ?? 'none'],
  );
  // The value's width is measured once drawn (the unit's sign is as wide as
  // the font makes it); until then, estimated.
  let value = $state<SVGTextElement>();
  let measured = $state<number>();
  const valueWidth = $derived(
    measured ?? ((text.length - 1) * 0.58 + 1.2) * style.value,
  );
  $effect(() => {
    if (!value || !text) return;
    const width = value.getComputedTextLength();
    measured = width > 0 ? width : undefined;
  });
  const chevronSize = $derived(style.value * 0.5);
  const gap = $derived(style.value * 0.12);
  const valueStart = $derived(
    l.textX - (valueWidth + (chevron ? chevronSize + gap : 0)) / 2,
  );
  const bed = $derived(label.heater === 'bed');
  const name = $derived(bed ? t('status.bed') : label.heater);
  const iconWidth = $derived(style.caption * (bed ? 1 : 352 / 512));
  const captionWidth = $derived(name.length * 0.6 * style.caption);
  const captionStart = $derived(
    l.textX - (iconWidth + style.caption * 0.25 + captionWidth) / 2,
  );
  const iconY = $derived(l.captionY - style.caption * 0.85);
</script>

<g
  data-testid="heater-label-{label.heater}"
  data-tone={tone(reading)}
  class={{
    heating: 'text-(--color-orange-light-9)',
    cooling: 'text-(--color-blue-light-9)',
    off: 'text-(--color-gray-light-9)',
  }[tone(reading)]}
>
  <polyline
    points="{label.anchor.join(',')} {label.elbow.join(',')} {label.end.join(
      ',',
    )}"
    fill="none"
    stroke="currentColor"
    stroke-width={style.stroke}
    stroke-linejoin="round"
  />
  <circle
    cx={label.anchor[0]}
    cy={label.anchor[1]}
    r={l.dot}
    fill="currentColor"
  />
  {#if chevron}
    <path
      d={chevron}
      fill="currentColor"
      transform="translate({valueStart} {l.valueY -
        style.value * 0.36 -
        chevronSize / 2}) scale({chevronSize / 24})"
      data-testid="heater-trend-{trend(reading)}"
    />
  {/if}
  <text
    bind:this={value}
    x={valueStart + (chevron ? chevronSize + gap : 0)}
    y={l.valueY}
    font-size={style.value}
    font-weight="600"
    fill="currentColor"
    class="tabular-nums">{text}</text
  >
  <g
    fill="currentColor"
    transform="translate({captionStart} {iconY}) scale({style.caption /
      (bed ? 24 : 512)})"
  >
    {#if bed}
      <path d={BED_HEAT} opacity="0.6" /><path d={BED_PLATE} />
    {:else}
      <path d={NOZZLE} />
    {/if}
  </g>
  <text
    x={captionStart + iconWidth + style.caption * 0.25}
    y={l.captionY}
    font-size={style.caption}
    font-weight="500"
    fill="currentColor">{name}</text
  >
</g>
