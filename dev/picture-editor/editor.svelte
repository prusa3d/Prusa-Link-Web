<script lang="ts">
  import { onMount, tick } from 'svelte';

  import {
    type Bed,
    bedFill,
    bedHeat,
    bedStyle,
    statusStyle,
  } from '../../src/lib/printer/bed-heat.ts';
  import { STATE_TONE } from '../../src/lib/printer/state.ts';
  import { partCopies } from './part-copies.ts';
  import { previewFanTurn, stateColor } from './preview.ts';

  import {
    type Affine,
    clientToSvg,
    formatViewBox,
    moveAffine,
    NO_CHANGE,
    type Point,
    round,
    scaleAffine,
    type ViewBox,
  } from './geometry.ts';
  import {
    type Condition,
    conditionName,
    CONDITIONS,
    met,
    labelCondition,
    parseCondition,
  } from './conditions.ts';
  import type { Reading } from './glyphs.ts';
  import LabelMark from './label-mark.svelte';
  import {
    align,
    distribute,
    layoutRow,
    nearRow,
    respaceRow,
    rowAt,
    rowFits,
    sameLength,
    snap,
    type Snapped,
    snapTargets,
  } from './label-tools.ts';
  import { LivePicture } from './live.ts';
  import {
    AREAS,
    type AreaName,
    type BedArea,
    type BedHandle,
    compareKeys,
    type CarriageParts,
    type FanParts,
    markParts,
    partMark,
    type PartMarks,
    defaultStyle,
    dragBed,
    exportSvg,
    flipLabel,
    type Heater,
    heaterName,
    heatersFor,
    HEATERS,
    isBedParts,
    type Label,
    labelLength,
    type LabelStyle,
    newLabel,
    normalizeBed,
    normalizeBedArea,
    normalizeLabel,
    diffVariant,
    isInherited,
    parseStatus,
    partId,
    resolveVariant,
    SAMPLE_VALUES,
    serializeStatus,
    without,
    type StatusPicture,
    unionBox,
  } from './status.ts';
  import { pictureLabel, type PrinterPicture } from './printers.ts';
  import StatusPicturePreview from './status-picture-preview.svelte';
  import {
    ancestorKeys,
    findKey,
    groupKey,
    importMarkup,
    keyOf,
    outermost,
    type StructureOp,
    uniqueId,
  } from './structure.ts';
  import {
    type Box,
    boxOf,
    buildTree,
    elementsIn,
    isDrawn,
    nameOf,
    partOf,
    type TreeNode,
  } from './tree.ts';

  interface Doc {
    hidden: string[];
    transforms: Record<string, Affine>;
    structure: StructureOp[];
    conditions: Record<string, Condition>;
    style: LabelStyle;
    labels: Label[];
    bed?: BedArea;
    chamber?: BedArea;
    status?: BedArea;
    fans?: FanParts[];
    carriage?: CarriageParts;
  }

  type RectArea = AreaName;

  type SelectMode = 'replace' | 'add' | 'toggle';

  interface PrinterEntry extends PrinterPicture {
    hasStatus: boolean;
  }

  /// A variant's base status picture, when it has one.
  let base = $state<
    | {
        name: string;
        status: Pick<StatusPicture, 'labels' | 'style' | AreaName | 'fans'>;
      }
    | undefined
  >();

  type Handle = 'anchor' | 'elbow' | 'end';
  const CUSTOM = '(custom)';
  /// What the build can copy as a bed part.
  const PART_SHAPES = new Set([
    'path',
    'rect',
    'circle',
    'ellipse',
    'polygon',
    'polyline',
  ]);
  /// Resize handles by the box edges they move: n, s, e, w and corners.
  const RESIZE = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
  type Resize = (typeof RESIZE)[number];

  let printers = $state<PrinterEntry[]>([]);
  let printer = $state('');
  let source = $state('');
  let anchorKey = $state<string | undefined>();
  let viewBox = $state<ViewBox>({ x: 0, y: 0, width: 1000, height: 1000 });
  let tree = $state<TreeNode[]>([]);
  let expanded = $state<string[]>([]);
  let doc = $state<Doc>({
    hidden: [],
    transforms: {},
    structure: [],
    conditions: {},
    style: { value: 60, caption: 30, stroke: 4 },
    labels: [],
  });
  let past = $state<Doc[]>([]);
  let future = $state<Doc[]>([]);
  let dirty = $state(false);
  let selection = $state<string[]>([]);
  let selectedLabel = $state<number | undefined>();
  /// Labels picked for align and distribute; the primary one shows handles.
  let labelSel = $state<number[]>([]);
  let guides = $state<{ x?: number; y?: number }>({});
  let rowCount = $state(2);
  let rowAnchors = $state<Point[]>([]);
  let hover = $state<string | undefined>();
  let mode = $state<'select' | 'label' | 'row' | AreaName>('select');
  /// The area whose rectangle shows handles, or whose parts are outlined.
  let areaSelected = $state<AreaName | undefined>();
  /// What the editor previews the areas and fans with: temperatures on the
  /// app's default scales (room temperature to 110 ℃ and 55 ℃), the
  /// printer's state, and the fans' speed in percent.
  let bedTemp = $state(60);
  let chamberTemp = $state(40);
  /// '' previews a printer that is unreachable.
  let previewState = $state<keyof typeof STATE_TONE | ''>('FINISHED');
  let fanSpeed = $state(50);
  /// The tool the preview has picked, from 1; 0 for none.
  let previewTool = $state(0);
  let animateCarriage = $state(true);
  let fanCenters = $state(true);
  let pendingAnchor = $state<Point | undefined>();
  let cursor = $state<Point | undefined>();
  let newHeater = $state<Heater>('T1');
  let step = $state(1);
  let tab = $state<'edit' | 'preview'>('edit');
  let message = $state('');
  let marquee = $state<Box | undefined>();
  let saved = $state<{ svg: string; status: StatusPicture } | undefined>();
  let clock = $state(0);
  let equipment = $state({
    mmu: false,
    enclosure: false,
    chamber: true,
    present: [1],
  });
  /// The edit view hides the parts whose condition the equipment fails,
  /// else dims them.
  let equipmentView = $state<boolean>(false);
  let importing = $state(false);
  let importText = $state('');
  let importName = $state('');
  let domVersion = $state(0);
  let dragKeys: string[] = [];

  let svgEl = $state<SVGSVGElement>();
  let content = $state<SVGGElement>();
  let live: LivePicture | undefined;

  const heaters = $derived(heatersFor(printer));
  const rows = $derived(flatten(tree));
  const hiddenSet = $derived(new Set(doc.hidden));
  const unit = $derived(viewBox.width / 1000);
  const roots = $derived(rootsOf(selection, domVersion));
  const selectionBoxes = $derived(
    selection.flatMap((k) => boxFor(k, domVersion) ?? []),
  );
  const selectionBox = $derived(unionBox(selectionBoxes));
  const hoverBox = $derived(
    hover === undefined ? undefined : boxFor(hover, domVersion),
  );
  const groups = $derived(groupsOf(domVersion));
  const selectedShapes = $derived(shapeKeys(selection, domVersion));
  const selectionCondition = $derived(
    roots.length === 1 ? (doc.conditions[roots[0] ?? ''] ?? '') : '',
  );
  const marks = $derived<PartMarks>({
    ...Object.fromEntries(AREAS.map((a) => [a, partsOf(doc[a])])),
    fans: (doc.fans ?? []).map((f) => f.parts),
    carriage: doc.carriage?.parts ?? [],
  });
  const areaPartBoxes = $derived(
    areaSelected
      ? partsOf(doc[areaSelected]).flatMap((k) => boxFor(k, domVersion) ?? [])
      : [],
  );
  const fanCentersNow = $derived(
    (doc.fans ?? []).map((f) => f.center ?? autoCenter(f.parts, domVersion)),
  );

  const fanTurnNow = $derived(previewFanTurn(fanSpeed));

  /// How the app paints the area with the preview's readings.
  function areaLook(area: AreaName): string {
    if (area === 'status')
      return statusStyle(previewState && stateColor(previewState));
    return area === 'bed'
      ? bedStyle(bedHeat(bedTemp, 110))
      : 'fill:url(#editor-chamber)';
  }

  function rectOf(area: BedArea | undefined): Bed | undefined {
    return area && !isBedParts(area) ? area : undefined;
  }

  function partsOf(area: BedArea | undefined): string[] {
    return isBedParts(area) ? area.parts : [];
  }

  /// The middle of the parts' box: what the build turns a fan around.
  function autoCenter(keys: string[], version: number): Point | undefined {
    const b = unionBox(keys.flatMap((k) => boxFor(k, version) ?? []));
    return b && [round(b.x + b.width / 2, 1), round(b.y + b.height / 2, 1)];
  }

  /// The parts for `keys` that the previewed equipment shows: the app
  /// leaves out the copies of the others.
  function findParts(keys: readonly string[], version?: unknown): Element[] {
    const root = content;
    if (!root || version === null) return [];
    const shown = (el: Element) => {
      for (
        let at: Element | null = el;
        at && at !== root;
        at = at.parentElement
      ) {
        const when = doc.conditions[keyOf(at) ?? ''];
        if (when && !met(when, previewEquipment)) return false;
      }
      return true;
    };
    return keys.flatMap((k) => findKey(root, k) ?? []).filter(shown);
  }
  /// One screen pixel in picture units, for handles that keep their size.
  const px = $derived(pixel(domVersion));

  function flatten(nodes: TreeNode[]): TreeNode[] {
    return nodes.flatMap((n) => [
      n,
      ...(expanded.includes(n.key) ? flatten(n.children) : []),
    ]);
  }

  /// `version` only makes the caller re-run after the DOM changes.
  function boxFor(key: string, version: number): Box | undefined {
    if (version < 0 || !content || !svgEl) return undefined;
    const el = findKey(content, key);
    return el && boxOf(el, svgEl);
  }

  /// The selected keys that are not inside another selected element: what a
  /// move, scale or regroup acts on.
  function rootsOf(keys: string[], version: number): string[] {
    if (version < 0 || !content) return [];
    return outermost(content, keys).flatMap((el) => keyOf(el) ?? []);
  }

  /// The shapes a fill can tint among `keys`, a group standing for its own.
  function shapeKeys(keys: string[], version: number): string[] {
    const root = content;
    if (version < 0 || !root) return [];
    const fillable = (el: Element) =>
      PART_SHAPES.has(el.tagName) && isDrawn(el, root);
    return keys
      .flatMap((k) => {
        const el = findKey(root, k);
        if (!el) return [];
        return fillable(el) ? [el] : [...el.querySelectorAll('*')];
      })
      .filter(fillable)
      .flatMap((el) => keyOf(el) ?? [])
      .filter((k, i, all) => all.indexOf(k) === i && !hiddenSet.has(k));
  }

  // The live picture is rebuilt on structure edits, so the marks are redone.
  $effect(() => {
    const root = content;
    if (domVersion < 0 || !root) return;
    for (const what of [...AREAS, 'fan' as const, 'carriage' as const])
      for (const el of root.querySelectorAll(`[${partMark(what)}]`))
        el.removeAttribute(partMark(what));
    markParts(root, marks);
  });

  function groupsOf(version: number): { key: string; name: string }[] {
    if (version < 0 || !content) return [];
    return [...content.querySelectorAll('g')].flatMap((g) => {
      const key = keyOf(g);
      return key ? [{ key, name: nameOf(g) ?? key }] : [];
    });
  }

  function pixel(version: number): number {
    const r = svgEl?.getBoundingClientRect();
    if (version < 0 || !r?.width || !r.height) return unit;
    return Math.max(viewBox.width / r.width, viewBox.height / r.height);
  }

  /// Which side of the box a resize handle sits on along one axis: -1 for
  /// west/north, 1 for east/south, 0 for the middle.
  function side(h: Resize, axis: 'x' | 'y'): -1 | 0 | 1 {
    const [low, high] = axis === 'x' ? ['w', 'e'] : ['n', 's'];
    if (h.includes(low)) return -1;
    return h.includes(high) ? 1 : 0;
  }

  function handlePoint(h: Resize, b: Box): Point {
    return [
      b.x + (b.width * (side(h, 'x') + 1)) / 2,
      b.y + (b.height * (side(h, 'y') + 1)) / 2,
    ];
  }

  onMount(() => {
    void (async () => {
      printers = (await (
        await fetch('/__picture-editor/printers')
      ).json()) as PrinterEntry[];
      const wanted = new URLSearchParams(location.search).get('printer');
      await load(
        printers.find((p) => p.name === wanted)?.name ??
          printers.find((p) => p.name === 'coreone')?.name ??
          printers[0]?.name ??
          '',
      );
    })();
  });

  async function load(name: string) {
    if (!name || !content || !svgEl) return;
    if (dirty && !confirm('Discard unsaved changes?')) return;
    const res = await fetch(`/__picture-editor/picture/${name}`);
    const data = (await res.json()) as {
      source: string;
      status: string | null;
      statusSvg: string | null;
      base: string | null;
      baseStatus: string | null;
    };
    printer = name;
    source = data.source;
    history.replaceState(null, '', `?printer=${name}`);
    live = new LivePicture(content, source);
    viewBox = live.mount([]);

    const status = data.status ? parseStatus(data.status) : undefined;
    const baseStatus = data.baseStatus
      ? parseStatus(data.baseStatus)
      : undefined;
    base =
      data.base && baseStatus
        ? { name: data.base, status: baseStatus }
        : undefined;
    // A variant takes its base's current labels and sizes, with its own
    // changes on top: hides, moves and groups name the base's elements, so
    // only the labels carry over.
    const own = base
      ? resolveVariant(base.status, status?.overrides ?? { labels: {} })
      : undefined;
    const from = own ?? status;
    doc = {
      hidden: status?.edits.hidden ?? [],
      transforms: status?.edits.transforms ?? {},
      structure: status?.edits.structure ?? [],
      conditions: status?.edits.conditions ?? {},
      style: own?.style ?? status?.style ?? defaultStyle(viewBox),
      labels: own?.labels ?? status?.labels ?? [],
      ...Object.fromEntries(
        AREAS.flatMap((a) => (from?.[a] ? [[a, from[a]]] : [])),
      ),
      ...(from?.fans && { fans: from.fans }),
      ...(status?.carriage && { carriage: status.carriage }),
    };
    saved =
      status && data.statusSvg ? { svg: data.statusSvg, status } : undefined;
    past = [];
    future = [];
    selection = [];
    selectedLabel = undefined;
    areaSelected = undefined;
    pendingAnchor = undefined;
    mode = 'select';
    newHeater = 'T1';
    expanded = [];
    anchorKey = undefined;
    dirty = false;
    sync(true);
    if (status) message = `Reopened assets/printers/status/${name}.json`;
    else if (base)
      message = `Loaded ${name}.svg with the labels of ${base.name}`;
    else message = `Loaded ${name}.svg`;
    if (!doc.fans?.length) findFans();
  }

  function resetLabelToBase(heater: Heater) {
    const from = base?.status.labels.find((l) => l.heater === heater);
    if (!from) return;
    checkpoint();
    const i = doc.labels.findIndex((l) => l.heater === heater);
    if (i < 0) doc.labels.push($state.snapshot(from));
    else doc.labels[i] = $state.snapshot(from);
  }

  function resetVariant() {
    if (!base) return;
    checkpoint();
    doc.labels = $state.snapshot(base.status.labels);
    doc.style = $state.snapshot(base.status.style);
    for (const a of AREAS) setAreaFromBase(a);
    setFansFromBase();
    selectedLabel = undefined;
  }

  function setAreaFromBase(area: AreaName) {
    const from = base?.status[area];
    if (from) doc[area] = $state.snapshot(from);
    else doc = without(doc, area);
  }

  function resetAreaToBase(area: AreaName) {
    checkpoint();
    setAreaFromBase(area);
  }

  function setFansFromBase() {
    const from = base?.status.fans;
    if (from?.length) doc.fans = $state.snapshot(from);
    else delete doc.fans;
  }

  /// Groups the picture marks as fans (`<g data-fan="hotend">`), offered as
  /// the fans of a picture that has none yet.
  function findFans() {
    const root = content;
    if (!root) return;
    const found = [...root.querySelectorAll('g[data-fan]')].flatMap(
      (g): FanParts[] => {
        const key = keyOf(g);
        const parts = key ? shapeKeys([key], domVersion) : [];
        const kind =
          g.getAttribute('data-fan') === 'print' ? 'print' : 'hotend';
        return parts.length ? [{ parts, kind }] : [];
      },
    );
    if (!found.length) return;
    doc.fans = found;
    dirty = true;
    message = `Found ${String(found.length)} fan${found.length > 1 ? 's' : ''} in the picture; save to keep`;
  }

  /// Draws `doc` on the picture; a structure change rebuilds it and the tree.
  function sync(rebuildTree = false) {
    if (!live || !content || !svgEl) return;
    const before = live.structureKey;
    live.mount(doc.structure);
    live.sync(doc.hidden, doc.transforms);
    if (rebuildTree || before !== live.structureKey)
      tree = buildTree(content, svgEl);
    domVersion++;
  }

  function checkpoint() {
    past.push($state.snapshot(doc));
    future = [];
    dirty = true;
  }

  function undo() {
    const prev = past.pop();
    if (!prev) return;
    future.push($state.snapshot(doc));
    doc = prev;
    dirty = true;
    afterHistory();
  }

  function redo() {
    const next = future.pop();
    if (!next) return;
    past.push($state.snapshot(doc));
    doc = next;
    dirty = true;
    afterHistory();
  }

  function afterHistory() {
    if (selectedLabel !== undefined && selectedLabel >= doc.labels.length)
      selectedLabel = undefined;
    sync();
    if (content) {
      const root = content;
      selection = selection.filter((k) => findKey(root, k));
    }
  }

  function toggleHidden(keys: string[]) {
    if (!keys.length) return;
    checkpoint();
    const hide = keys.some((k) => !hiddenSet.has(k));
    doc.hidden = hide
      ? [...doc.hidden, ...keys.filter((k) => !hiddenSet.has(k))].sort(
          compareKeys,
        )
      : doc.hidden.filter((k) => !keys.includes(k));
    sync();
  }

  function withoutNoChange(t: Record<string, Affine>) {
    return Object.fromEntries(
      Object.entries(t).filter(
        ([, [sx, sy, tx, ty]]) => sx !== 1 || sy !== 1 || tx || ty,
      ),
    );
  }

  /// Applies `change` to every selected root, starting from `from`.
  function transformRoots(
    change: (a: Affine) => Affine,
    from: Record<string, Affine> = doc.transforms,
  ) {
    const t = { ...from };
    for (const k of roots) t[k] = change(t[k] ?? NO_CHANGE);
    doc.transforms = withoutNoChange(t);
    sync();
  }

  function moveSelection(d: Point) {
    if (!roots.length) return;
    checkpoint();
    transformRoots((a) => moveAffine(a, d));
  }

  function scaleSelection(k: Point, anchor: Point) {
    if (!roots.length) return;
    checkpoint();
    transformRoots((a) => scaleAffine(a, k, anchor));
  }

  function resetTransforms() {
    if (!selection.some((k) => doc.transforms[k])) return;
    checkpoint();
    doc.transforms = Object.fromEntries(
      Object.entries(doc.transforms).filter(([k]) => !selection.includes(k)),
    );
    sync();
  }

  /// Sets one side of the selection's box from the X/Y/W/H fields.
  function setBox(field: 'x' | 'y' | 'width' | 'height', value: number) {
    const b = selectionBox;
    if (!b || !Number.isFinite(value)) return;
    if (field === 'x') moveSelection([value - b.x, 0]);
    else if (field === 'y') moveSelection([0, value - b.y]);
    else if (value > 0 && field === 'width' && b.width)
      scaleSelection([value / b.width, 1], [b.x, b.y]);
    else if (value > 0 && field === 'height' && b.height)
      scaleSelection([1, value / b.height], [b.x, b.y]);
  }

  function structure(op: StructureOp, select?: string[]) {
    checkpoint();
    doc.structure = [...doc.structure, op];
    sync();
    if (select) selectKeys(select, 'replace');
  }

  function groupSelection() {
    const root = content;
    if (!root || !roots.length) return;
    const name = prompt('Group name', 'Group')?.trim();
    if (!name) return;
    const id = uniqueId(root, name);
    structure({ op: 'group', id, name, members: roots }, [groupKey(id)]);
  }

  function ungroupSelection() {
    const root = content;
    if (!root) return;
    const gs = roots
      .map((k) => findKey(root, k))
      .filter((el) => el?.tagName === 'g');
    if (!gs.length) return;
    const children = gs.flatMap((g) =>
      [...(g?.children ?? [])].flatMap((c) => keyOf(c) ?? []),
    );
    checkpoint();
    doc.structure = [
      ...doc.structure,
      ...gs.flatMap((g): StructureOp[] => {
        const key = g && keyOf(g);
        return key ? [{ op: 'ungroup', key }] : [];
      }),
    ];
    sync();
    selectKeys(children, 'replace');
  }

  function renameKey(key: string) {
    const el = content && findKey(content, key);
    if (!el) return;
    const name = prompt('Name', nameOf(el) ?? '')?.trim();
    if (!name || name === nameOf(el)) return;
    structure({ op: 'rename', key, name });
  }

  function moveInto(keys: string[], into: string | null) {
    if (!keys.length || keys.includes(into ?? '')) return;
    structure({ op: 'move', keys, into }, keys);
  }

  function selectKeys(keys: string[], how: SelectMode) {
    selectedLabel = undefined;
    if (how === 'replace') selection = keys;
    else if (how === 'add')
      selection = [...selection, ...keys.filter((k) => !selection.includes(k))];
    else
      selection = [
        ...selection.filter((k) => !keys.includes(k)),
        ...keys.filter((k) => !selection.includes(k)),
      ];
    const root = content;
    if (!root) return;
    const parents = keys.flatMap((k) => {
      const el = findKey(root, k);
      return el ? ancestorKeys(el, root) : [];
    });
    expanded = [...expanded, ...parents].filter(
      (k, i, all) => all.indexOf(k) === i,
    );
  }

  /// Shift extends from the last plainly clicked or toggled row over the rows
  /// as they are listed; Cmd/Ctrl toggles one row.
  function clickRow(key: string, e: MouseEvent | KeyboardEvent) {
    const from = rows.findIndex((r) => r.key === anchorKey);
    const to = rows.findIndex((r) => r.key === key);
    if (e.shiftKey && from >= 0 && to >= 0) {
      selectKeys(
        rows
          .slice(Math.min(from, to), Math.max(from, to) + 1)
          .map((r) => r.key),
        'replace',
      );
      return;
    }
    selectKeys([key], e.metaKey || e.ctrlKey ? 'toggle' : 'replace');
    anchorKey = key;
  }

  function selectMode(e: {
    shiftKey: boolean;
    metaKey: boolean;
    ctrlKey: boolean;
  }): SelectMode {
    if (e.metaKey || e.ctrlKey) return 'toggle';
    return e.shiftKey ? 'add' : 'replace';
  }

  function toggleExpanded(key: string) {
    expanded = expanded.includes(key)
      ? expanded.filter((k) => k !== key)
      : [...expanded, key];
  }

  function toSvg(e: { clientX: number; clientY: number }): Point {
    if (!svgEl) return [0, 0];
    const [x, y] = clientToSvg(
      [e.clientX, e.clientY],
      svgEl.getBoundingClientRect(),
      viewBox,
    );
    return [round(x, 1), round(y, 1)];
  }

  let drag:
    | { kind: 'handle'; label: number; handle: Handle; moved: boolean }
    | {
        kind: 'bed';
        area: RectArea;
        handle: BedHandle;
        start: Point;
        from: Bed | undefined;
        moved: boolean;
      }
    | { kind: 'center'; fan: number; moved: boolean }
    | {
        kind: 'move';
        start: Point;
        from: Record<string, Affine>;
        free: boolean;
        moved: boolean;
        target: Element;
        how: SelectMode;
      }
    | {
        kind: 'scale';
        handle: Resize;
        box: Box;
        from: Record<string, Affine>;
        uniform: boolean;
        moved: boolean;
      }
    | {
        kind: 'marquee';
        start: Point;
        how: SelectMode;
        target: Element;
        alt: boolean;
        moved: boolean;
      }
    | undefined;

  function pickLabel(
    i: number,
    e?: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean },
  ) {
    selection = [];
    if (e && (e.shiftKey || e.metaKey || e.ctrlKey)) {
      labelSel = labelSel.includes(i)
        ? labelSel.filter((x) => x !== i)
        : [...labelSel, i];
      selectedLabel = labelSel.includes(i) ? i : labelSel[0];
      return;
    }
    labelSel = [i];
    selectedLabel = i;
  }

  function editLabels(change: (labels: Label[]) => Label[]) {
    checkpoint();
    doc.labels = change($state.snapshot(doc.labels));
  }

  const toolHeaters = $derived(heaters.filter((h) => /^T\d$/.test(h)));

  function startRow() {
    mode = 'row';
    rowAnchors = [];
    selection = [];
    labelSel = [];
    selectedLabel = undefined;
  }

  /// Tool row: one click per nozzle (T1, T2, …), then one for the row's
  /// height. The labels replace any for those tools, in one undo step.
  function addRowPoint(at: Point) {
    if (rowAnchors.length < rowCount) {
      rowAnchors = [...rowAnchors, at];
      return;
    }
    const tools = rowAnchors.map((anchor, k) => ({
      heater: toolHeaters[k] ?? 'T1',
      anchor,
    }));
    const row = layoutRow(tools, at[1], doc.style, viewBox);
    checkpoint();
    const kept = doc.labels.filter(
      (l) => !tools.some((t) => t.heater === l.heater),
    );
    doc.labels = [...kept, ...row];
    labelSel = row.map((_, k) => kept.length + k);
    selectedLabel = labelSel[0];
    rowAnchors = [];
    mode = 'select';
    message = rowFits(tools.length, doc.style, viewBox)
      ? `Added a row of ${String(tools.length)} tools`
      : `Added a row of ${String(tools.length)} tools with shorter lines: the values may touch, a smaller value size fits them`;
  }

  function addLabelPoint(at: Point) {
    if (!pendingAnchor) {
      pendingAnchor = at;
      return;
    }
    checkpoint();
    // A tool joining an existing row lands on it and the row re-spaces.
    const row = /^T\d$/.test(newHeater)
      ? nearRow(doc.labels, at[1])
      : undefined;
    doc.labels.push(
      newLabel(
        newHeater,
        pendingAnchor,
        [at[0], row ?? at[1]],
        labelLength(doc.style),
      ),
    );
    if (row !== undefined)
      doc.labels = respaceRow(
        $state.snapshot(doc.labels),
        row,
        doc.style,
        viewBox,
      );
    selectedLabel = doc.labels.length - 1;
    labelSel = [selectedLabel];
    selection = [];
    pendingAnchor = undefined;
    mode = 'select';
    const free = heaters.find((h) => !doc.labels.some((l) => l.heater === h));
    if (free) newHeater = free;
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || !svgEl || !content) return;
    const target = e.target as Element;
    const at = toSvg(e);
    if (mode === 'label') {
      addLabelPoint(at);
      return;
    }
    if (mode === 'row') {
      addRowPoint(at);
      return;
    }
    const center = target.closest('[data-fan-center]');
    if (center) {
      checkpoint();
      drag = {
        kind: 'center',
        fan: Number(center.getAttribute('data-fan-center')),
        moved: false,
      };
      svgEl.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }
    const drawing = AREAS.find((a) => a === mode);
    const bedHandle = drawing
      ? 'draw'
      : (target.closest('[data-bed]')?.getAttribute('data-bed') as
          BedHandle | null | undefined);
    const area: RectArea | undefined =
      drawing ??
      (target.closest('[data-area]')?.getAttribute('data-area') as
        RectArea | undefined);
    areaSelected = bedHandle && area ? area : undefined;
    if (bedHandle && area) {
      selection = [];
      selectedLabel = undefined;
      labelSel = [];
      checkpoint();
      drag = {
        kind: 'bed',
        area,
        handle: bedHandle,
        start: at,
        from: rectOf($state.snapshot(doc[area])),
        moved: false,
      };
      svgEl.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }
    const handle = target.closest('[data-handle]');
    const resize = target.closest('[data-resize]');
    const root = content;
    const selectedHit = selection.some((k) =>
      findKey(root, k)?.contains(target),
    );
    if (resize && selectionBox) {
      checkpoint();
      drag = {
        kind: 'scale',
        handle: resize.getAttribute('data-resize') as Resize,
        box: selectionBox,
        from: { ...doc.transforms },
        uniform: e.shiftKey,
        moved: false,
      };
    } else if (handle) {
      const label = Number(handle.getAttribute('data-label'));
      selectedLabel = label;
      if (!labelSel.includes(label)) labelSel = [label];
      checkpoint();
      drag = {
        kind: 'handle',
        label,
        handle: handle.getAttribute('data-handle') as Handle,
        moved: false,
      };
    } else if (target.closest('[data-label]')) {
      pickLabel(
        Number(target.closest('[data-label]')?.getAttribute('data-label')),
        e,
      );
      return;
    } else if (selectedHit && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      checkpoint();
      drag = {
        kind: 'move',
        start: at,
        from: { ...doc.transforms },
        free: e.altKey,
        moved: false,
        target,
        how: selectMode(e),
      };
    } else {
      drag = {
        kind: 'marquee',
        start: at,
        how: selectMode(e),
        target,
        alt: e.altKey,
        moved: false,
      };
    }
    svgEl.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    const at = toSvg(e);
    cursor = at;
    if (!drag) return;
    if (drag.kind === 'bed') {
      if (
        !drag.moved &&
        Math.hypot(at[0] - drag.start[0], at[1] - drag.start[1]) < 3 * px
      )
        return;
      drag.moved = true;
      doc[drag.area] = dragBed(drag.from, drag.handle, drag.start, at);
    } else if (drag.kind === 'center') {
      const fan = doc.fans?.[drag.fan];
      if (!fan) return;
      drag.moved = true;
      fan.center = [round(at[0], 1), round(at[1], 1)];
    } else if (drag.kind === 'handle') {
      const l = doc.labels[drag.label];
      if (!l) return;
      drag.moved = true;
      // Snaps to the other labels' points and the centre lines; Alt is free.
      const { xs, ys } = snapTargets(doc.labels, drag.label, viewBox);
      const snapped: Snapped = e.altKey
        ? { point: at }
        : snap(at, xs, drag.handle === 'end' ? [] : ys);
      const p = snapped.point;
      guides = {};
      if (snapped.x !== undefined) guides.x = snapped.x;
      if (snapped.y !== undefined) guides.y = snapped.y;
      if (drag.handle === 'anchor') l.anchor = p;
      else if (drag.handle === 'end') l.end = [p[0], l.elbow[1]];
      else {
        const length = l.end[0] - l.elbow[0];
        l.elbow = p;
        l.end = [p[0] + length, p[1]];
      }
      doc.labels[drag.label] = normalizeLabel(l);
    } else if (drag.kind === 'move') {
      let d: Point = [at[0] - drag.start[0], at[1] - drag.start[1]];
      if (!drag.moved && Math.hypot(...d) < 3 * px) return;
      drag.moved = true;
      // One axis at a time unless Alt is held: the larger component wins.
      if (!drag.free && !e.altKey)
        d = Math.abs(d[0]) >= Math.abs(d[1]) ? [d[0], 0] : [0, d[1]];
      transformRoots(
        (a) => moveAffine(a, [round(d[0]), round(d[1])]),
        drag.from,
      );
    } else if (drag.kind === 'scale') {
      drag.moved = true;
      const { box, handle } = drag;
      const right = box.x + box.width;
      const bottom = box.y + box.height;
      const sx = side(handle, 'x');
      const sy = side(handle, 'y');
      const ax = sx < 0 ? right : box.x;
      const ay = sy < 0 ? bottom : box.y;
      let kx = sx ? (sx * (at[0] - ax)) / box.width : 1;
      let ky = sy ? (sy * (at[1] - ay)) / box.height : 1;
      if ((drag.uniform || e.shiftKey) && handle.length === 2)
        kx = ky = Math.abs(kx - 1) > Math.abs(ky - 1) ? kx : ky;
      kx = round(Math.max(kx, 0.01), 4);
      ky = round(Math.max(ky, 0.01), 4);
      transformRoots((a) => scaleAffine(a, [kx, ky], [ax, ay]), drag.from);
    } else {
      const [x0, y0] = drag.start;
      if (!drag.moved && Math.hypot(at[0] - x0, at[1] - y0) < 4 * px) return;
      drag.moved = true;
      marquee = {
        x: Math.min(x0, at[0]),
        y: Math.min(y0, at[1]),
        width: Math.abs(at[0] - x0),
        height: Math.abs(at[1] - y0),
      };
    }
  }

  function onPointerUp() {
    const d = drag;
    drag = undefined;
    const root = content;
    if (!d || !root || !svgEl) return;
    guides = {};
    if (d.kind === 'bed') {
      if (d.handle === 'draw') mode = 'select';
      if (!d.moved) past.pop();
      else message = d.handle === 'draw' ? `Drew the ${d.area} area` : '';
      return;
    }
    if (d.kind === 'center') {
      if (!d.moved) past.pop();
      return;
    }
    if (d.kind === 'handle' || d.kind === 'scale') {
      if (!d.moved) past.pop();
      return;
    }
    if (d.kind === 'move') {
      if (d.moved) return;
      past.pop();
    }
    if (marquee) {
      const box = marquee;
      marquee = undefined;
      selectKeys(
        elementsIn(box, root, svgEl).flatMap((el) => keyOf(el) ?? []),
        d.how === 'replace' ? 'replace' : 'add',
      );
      return;
    }
    if (!root.contains(d.target)) {
      if (d.how === 'replace') selectKeys([], 'replace');
      return;
    }
    const alt = d.kind === 'marquee' && d.alt;
    const el = alt
      ? d.target
      : partOf(d.target, root, svgEl, viewBox.width * viewBox.height * 0.5);
    const key = keyOf(el);
    if (!key) return;
    selectKeys([key], d.how);
    anchorKey = key;
    void tick().then(() => {
      document
        .querySelector(`.row[data-key="${key}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    });
  }

  function onKey(e: KeyboardEvent) {
    const field = (e.target as Element | null)?.closest(
      'input, select, textarea',
    );
    const mod = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    if (mod && key === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && key === 's') {
      e.preventDefault();
      void save();
      return;
    }
    if (field) return;
    if (mod && key === 'g') {
      e.preventDefault();
      if (e.shiftKey) ungroupSelection();
      else groupSelection();
      return;
    }
    const arrows: Record<string, Point> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const dir = arrows[e.key];
    if (dir) {
      e.preventDefault();
      const n = e.shiftKey ? 10 * step : step;
      moveSelection([dir[0] * n, dir[1] * n]);
    } else if (e.key === 'Escape') {
      pendingAnchor = undefined;
      rowAnchors = [];
      mode = 'select';
      selection = [];
      selectedLabel = undefined;
      labelSel = [];
      areaSelected = undefined;
    } else if (
      (e.key === 'Delete' || e.key === 'Backspace') &&
      selectedLabel !== undefined
    ) {
      deleteLabel(selectedLabel);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && areaSelected) {
      deleteArea(areaSelected);
    } else if (key === 'h' && !mod) {
      toggleHidden(selection);
    } else if (key === 'l' && !mod) {
      startLabel();
    }
  }

  function startArea(area: RectArea) {
    mode = mode === area ? 'select' : area;
    selection = [];
    selectedLabel = undefined;
    labelSel = [];
  }

  function setRectField(area: RectArea, field: keyof Bed, value: number) {
    const rect = rectOf(doc[area]);
    if (!rect || !Number.isFinite(value)) return;
    checkpoint();
    doc[area] = normalizeBed({ ...$state.snapshot(rect), [field]: value });
  }

  /// The selected shapes as the area: in place of it, added or taken out.
  function setAreaParts(area: AreaName, how: 'use' | 'add' | 'remove') {
    const picked = selectedShapes;
    if (!picked.length) return;
    const now = partsOf(doc[area]);
    let parts = picked;
    if (how === 'add') parts = [...now, ...picked];
    else if (how === 'remove') parts = now.filter((k) => !picked.includes(k));
    checkpoint();
    if (parts.length) doc[area] = normalizeBedArea({ parts });
    else doc = without(doc, area);
    areaSelected = parts.length ? area : undefined;
    mode = 'select';
    message = parts.length
      ? `The ${area} is ${String(parts.length)} part${parts.length > 1 ? 's' : ''}`
      : `Removed the ${area}`;
  }

  function deleteArea(area: AreaName) {
    if (!doc[area]) return;
    checkpoint();
    doc = without(doc, area);
    areaSelected = undefined;
  }

  /// The selected shapes, a group's shapes included, as a new fan.
  function addFan() {
    const parts = selectedShapes;
    if (!parts.length) return;
    checkpoint();
    doc.fans = [...(doc.fans ?? []), { parts, kind: 'hotend' }];
    message = `Fan ${String(doc.fans.length)}: ${String(parts.length)} parts`;
  }

  function updateFan(i: number, change: Partial<FanParts>) {
    const fan = doc.fans?.[i];
    if (!fan || !doc.fans) return;
    checkpoint();
    const next: FanParts = { ...$state.snapshot(fan), ...change };
    doc.fans[i] = change.tool === 0 ? without(next, 'tool') : next;
  }

  function autoFanCenter(i: number) {
    const fan = doc.fans?.[i];
    if (!fan?.center || !doc.fans) return;
    checkpoint();
    doc.fans[i] = without($state.snapshot(fan), 'center');
  }

  /// The selected shapes as the toolchanger's carriage, keeping the
  /// positions recorded for it.
  function useAsCarriage() {
    const parts = selectedShapes;
    if (!parts.length) return;
    checkpoint();
    doc.carriage = { parts, positions: doc.carriage?.positions ?? {} };
    message = `Carriage: ${String(parts.length)} parts`;
  }

  function setCarriageAt(n: number, axis: 0 | 1, value: number) {
    const c = doc.carriage;
    if (!c || !Number.isFinite(value)) return;
    checkpoint();
    const at: Point = [...(c.positions[String(n)] ?? [0, 0])];
    at[axis] = round(value, 1);
    c.positions[String(n)] = at;
  }

  /// Where the carriage was dragged to, as its position for tool `n` (0:
  /// none picked): the drag on top of the position shown, and the drag
  /// undone, so the picture keeps the carriage where it is drawn.
  function recordCarriage(n: number) {
    const c = doc.carriage;
    if (!c) return;
    const moved = c.parts.map((k) => doc.transforms[k]).find(Boolean);
    const shown = c.positions[String(previewTool)] ?? [0, 0];
    checkpoint();
    c.positions[String(n)] = [
      round(shown[0] + (moved?.[2] ?? 0), 1),
      round(shown[1] + (moved?.[3] ?? 0), 1),
    ];
    doc.transforms = Object.fromEntries(
      Object.entries(doc.transforms).filter(([k]) => !c.parts.includes(k)),
    );
    previewTool = n;
    sync();
    message = `Recorded the carriage for ${n ? `T${String(n)}` : 'no tool'}`;
  }

  function deleteFan(i: number) {
    if (!doc.fans?.[i]) return;
    checkpoint();
    doc.fans = doc.fans.filter((_, k) => k !== i);
    if (!doc.fans.length) delete doc.fans;
  }

  function startLabel() {
    mode = 'label';
    pendingAnchor = undefined;
    selection = [];
    selectedLabel = undefined;
  }

  function updateLabel(i: number, change: (l: Label) => Label) {
    const l = doc.labels[i];
    if (!l) return;
    checkpoint();
    doc.labels[i] = change($state.snapshot(l));
  }

  function deleteLabel(i: number) {
    checkpoint();
    doc.labels.splice(i, 1);
    selectedLabel = undefined;
  }

  function areasOf(d: Doc): Pick<Doc, AreaName | 'fans'> {
    return {
      ...Object.fromEntries(AREAS.flatMap((a) => (d[a] ? [[a, d[a]]] : []))),
      ...(d.fans?.length && { fans: d.fans }),
    };
  }

  function currentStatus(): StatusPicture {
    const snap = $state.snapshot(doc);
    return {
      source: `${printer}.svg`,
      viewBox: formatViewBox(viewBox),
      style: snap.style,
      labels: snap.labels,
      ...areasOf(snap),
      ...(snap.carriage && { carriage: snap.carriage }),
      ...(base && {
        base: base.name,
        overrides: diffVariant(
          base.status,
          snap.labels,
          snap.style,
          areasOf(snap),
        ),
      }),
      conditional: conditionalParts(),
      edits: {
        hidden: snap.hidden,
        transforms: snap.transforms,
        structure: snap.structure,
        conditions: snap.conditions,
      },
    };
  }

  /// The saved SVG's ids of the conditional parts that are not hidden.
  function conditionalParts(): StatusPicture['conditional'] {
    const root = content;
    if (!root) return [];
    return Object.entries(doc.conditions).flatMap(([key, when]) => {
      const el = findKey(root, key);
      return el && !hiddenSet.has(key) ? [{ id: partId(el, key), when }] : [];
    });
  }

  /// The condition picked in `select`, typed in for "Custom…"; null when
  /// cancelled or not in the syntax (`select` then shows `current` again).
  function pickCondition(
    select: HTMLSelectElement,
    current: string,
  ): Condition | undefined | null {
    if (select.value !== CUSTOM) return parseCondition(select.value);
    const typed = prompt(
      'Show when (mmu, enclosure, chamber, tools>=N, tools<=N, tools=N; ! not, & and, | or)',
      current,
    );
    const when = typed === null ? null : parseCondition(typed.trim());
    if (typed?.trim() && !when) message = `Not a condition: ${typed}`;
    select.value = current;
    return typed?.trim() === '' ? undefined : (when ?? null);
  }

  function setCondition(keys: string[], when: Condition | undefined) {
    if (!keys.length) return;
    checkpoint();
    const rest = Object.entries(doc.conditions).filter(
      ([k]) => !keys.includes(k),
    );
    doc.conditions = Object.fromEntries(
      when
        ? [...rest, ...keys.map((k): [string, Condition] => [k, when])]
        : rest,
    );
  }

  async function readImportFile(
    e: Event & { currentTarget: HTMLInputElement },
  ) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    importText = await file.text();
    if (!importName) importName = file.name.replace(/\.svg$/i, '');
  }

  /// Brings SVG artwork in as a new group on top; with a selection, the
  /// artwork is fitted into the selection's box, else left where it is.
  function importArtwork() {
    const root = content;
    if (!root || !svgEl) return;
    const name = importName.trim() || 'Imported';
    const id = uniqueId(root, name);
    const markup = importMarkup(importText, id);
    if (!markup) {
      message = 'Nothing to import: paste SVG markup or pick an .svg file';
      return;
    }
    const target = selectionBox;
    structure({ op: 'import', id, name, markup }, [groupKey(id)]);
    const placed = boxFor(groupKey(id), domVersion);
    if (target && placed?.width && placed.height) {
      const k = Math.min(
        target.width / placed.width,
        target.height / placed.height,
      );
      const a = moveAffine(
        scaleAffine(NO_CHANGE, [k, k], [placed.x, placed.y]),
        [
          target.x + (target.width - placed.width * k) / 2 - placed.x,
          target.y + (target.height - placed.height * k) / 2 - placed.y,
        ],
      );
      doc.transforms = { ...doc.transforms, [groupKey(id)]: a };
      sync();
    }
    importing = false;
    importText = '';
    importName = '';
    message = `Imported ${name}`;
  }

  function setStyle(key: 'value' | 'caption' | 'stroke', value: number) {
    if (!(value > 0) || doc.style[key] === value) return;
    checkpoint();
    doc.style[key] = value;
  }

  async function save() {
    if (!printer) return;
    const status = currentStatus();
    const svg = exportSvg(source, status.edits, marks);
    const res = await fetch(`/__picture-editor/picture/${printer}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ svg, status: serializeStatus(status) }),
    });
    if (!res.ok) {
      message = `Save failed: ${String(res.status)}`;
      return;
    }
    const where = (await res.json()) as {
      svg: string;
      json: string;
      variants: string[];
    };
    saved = { svg, status: parseStatus(serializeStatus(status)) };
    dirty = false;
    printers = printers.map((p) =>
      p.name === printer ? { ...p, hasStatus: true } : p,
    );
    message = `Saved ${where.svg} and ${where.json}${
      where.variants.length
        ? `; updated the labels of ${where.variants.join(', ')}`
        : ''
    }`;
  }

  /// Made-up readings that heat up to the sample target, hold, cool down and
  /// hold, each heater a little out of phase, so every chevron state shows.
  function sampleReading(h: Heater, t: number): Reading {
    const hot = SAMPLE_VALUES[h];
    const cold = 30;
    const phase = (t + HEATERS.indexOf(h) * 3) % 24;
    const ramp = (from: number, to: number, f: number) =>
      Math.round(from + (to - from) * Math.min(1, f));
    if (phase < 8) return { current: ramp(cold, hot, phase / 7), target: hot };
    if (phase < 12) return { current: hot, target: hot };
    if (phase < 20)
      return { current: ramp(hot, cold, (phase - 12) / 7), target: cold };
    return { current: cold, target: null };
  }

  const previewEquipment = $derived({
    ...equipment,
    tools: equipment.present.length,
  });
  const toolCount = $derived(heaters.filter((h) => /^T\d$/.test(h)).length);

  $effect(() => {
    const root = content;
    if (domVersion < 0 || !root) return;
    for (const el of root.querySelectorAll<SVGElement>('[data-unmet]')) {
      el.removeAttribute('data-unmet');
      el.style.visibility = '';
      el.style.opacity = '';
    }
    for (const [key, when] of Object.entries(doc.conditions)) {
      const el = findKey(root, key);
      if (el instanceof SVGElement && !met(when, previewEquipment)) {
        el.setAttribute('data-unmet', '');
        if (equipmentView) el.style.visibility = 'hidden';
        else el.style.opacity = '0.4';
      }
    }
  });

  function setTool(n: number, on: boolean) {
    const rest = equipment.present.filter((t) => t !== n);
    equipment.present = on ? [...rest, n].sort((a, b) => a - b) : rest;
  }

  const editorReadings = $derived(
    Object.fromEntries(
      HEATERS.map((h) => [
        h,
        { current: SAMPLE_VALUES[h], target: SAMPLE_VALUES[h] + 20 },
      ]),
    ) as Record<Heater, Reading>,
  );
  const previewReadings = $derived(
    Object.fromEntries(
      HEATERS.map((h) => [h, sampleReading(h, clock)]),
    ) as Record<Heater, Reading>,
  );

  $effect(() => {
    if (tab !== 'preview') return;
    const timer = setInterval(() => {
      clock++;
    }, 700);
    return () => {
      clearInterval(timer);
    };
  });
</script>

<svelte:window onkeydown={onKey} />

<div class="editor">
  <header>
    <strong>Printer picture editor</strong>
    <select
      value={printer}
      aria-label="Printer"
      onchange={(e) => {
        const select = e.currentTarget;
        void load(select.value).then(() => {
          select.value = printer;
        });
      }}
    >
      {#each printers as p (p.name)}
        <option value={p.name}
          >{pictureLabel(p)}{p.hasStatus ? ' ✓' : ''}</option
        >
      {/each}
    </select>
    <span class="tabs">
      <button class:on={tab === 'edit'} onclick={() => (tab = 'edit')}
        >Edit</button
      >
      <button
        class:on={tab === 'preview'}
        onclick={() => (tab = 'preview')}
        disabled={!saved}
        title={saved ? '' : 'Save first'}>Preview saved</button
      >
    </span>
    <button onclick={undo} disabled={!past.length} title="⌘Z">Undo</button>
    <button onclick={redo} disabled={!future.length} title="⇧⌘Z">Redo</button>
    <button class="primary" onclick={save} title="⌘S"
      >Save{dirty ? ' *' : ''}</button
    >
    <span class="message" data-testid="message">{message}</span>
  </header>

  {#snippet equipmentBar()}
    <div class="buttons equipment" data-testid="equipment">
      <label><input type="checkbox" bind:checked={equipment.mmu} /> MMU</label>
      <label
        ><input type="checkbox" bind:checked={equipment.enclosure} /> Enclosure</label
      >
      <label
        ><input type="checkbox" bind:checked={equipment.chamber} /> Chamber reading</label
      >
      <span class="tools" aria-label="Preview tools"
        >Tools
        {#each Array.from({ length: Math.max(toolCount, 1) }, (_, i) => i + 1) as n (n)}
          <label
            ><input
              type="checkbox"
              aria-label="Tool {n}"
              checked={equipment.present.includes(n)}
              onchange={(e) => {
                setTool(n, e.currentTarget.checked);
              }}
            />T{n}</label
          >
        {/each}
      </span>
      {#if tab === 'edit'}
        <label title="Hide the parts whose condition does not hold"
          ><input type="checkbox" bind:checked={equipmentView} /> Only what this equipment
          shows</label
        >
      {/if}
    </div>
  {/snippet}
  {#if tab === 'edit'}{@render equipmentBar()}{/if}

  <div class="body" hidden={tab !== 'edit'}>
    <nav class="tree" aria-label="Elements">
      <div
        class="row top-level"
        role="treeitem"
        aria-selected="false"
        tabindex="-1"
        ondragover={(e) => {
          e.preventDefault();
        }}
        ondrop={(e) => {
          e.preventDefault();
          moveInto(dragKeys, null);
        }}
      >
        ⤒ Top level (drop here)
      </div>
      {#each rows as node (node.key)}
        {@const isHidden = hiddenSet.has(node.key)}
        <div
          class="row"
          class:selected={selection.includes(node.key)}
          class:hidden-node={isHidden}
          class:group={node.tag === 'g'}
          style:padding-left="{node.depth * 14 + 4}px"
          data-key={node.key}
          role="treeitem"
          aria-selected={selection.includes(node.key)}
          tabindex="-1"
          draggable="true"
          ondragstart={(e) => {
            dragKeys = selection.includes(node.key) ? roots : [node.key];
            e.dataTransfer?.setData('text/plain', dragKeys.join(' '));
          }}
          ondragover={(e) => {
            if (node.tag === 'g') e.preventDefault();
          }}
          ondrop={(e) => {
            e.preventDefault();
            moveInto(dragKeys, node.key);
          }}
          onpointerenter={() => (hover = node.key)}
          onpointerleave={() => (hover = undefined)}
          onclick={(e) => {
            clickRow(node.key, e);
          }}
          ondblclick={() => {
            renameKey(node.key);
          }}
          onkeydown={(e) => {
            if (e.key === 'Enter') clickRow(node.key, e);
          }}
        >
          {#if node.children.length}
            <button
              class="twisty"
              onclick={(e) => {
                e.stopPropagation();
                toggleExpanded(node.key);
              }}>{expanded.includes(node.key) ? '▾' : '▸'}</button
            >
          {:else}
            <span class="twisty"></span>
          {/if}
          <input
            type="checkbox"
            checked={!isHidden}
            title="Show in the status picture"
            onclick={(e) => {
              e.stopPropagation();
              toggleHidden([node.key]);
            }}
          />
          <span
            class="swatch"
            style:background={node.fill?.startsWith('#') ? node.fill : 'none'}
          ></span>
          <span class="tag">{node.tag}</span>
          <span class="path">{node.key}</span>
          {#if node.name}<span class="name">{node.name}</span>{/if}
          {#if doc.conditions[node.key]}<span class="when"
              >{conditionName(doc.conditions[node.key])}</span
            >{/if}
          <span class="desc">{node.label}</span>
        </div>
      {/each}
    </nav>

    <main>
      <svg
        bind:this={svgEl}
        class="canvas"
        class:labeling={mode !== 'select' && mode !== 'row'}
        viewBox={formatViewBox(viewBox)}
        role="application"
        aria-label="Picture"
        onpointerdown={onPointerDown}
        onpointermove={onPointerMove}
        onpointerup={onPointerUp}
        onpointerleave={() => (cursor = undefined)}
      >
        <g bind:this={content}></g>
        <g class="overlay">
          {#each doc.fans ?? [] as fan, i (i)}
            {@const c = fanCentersNow[i]}
            {#if c}
              <g
                class="copies fan-copy"
                class:turning={fanTurnNow !== undefined}
                style:transform-origin="{c[0] - viewBox.x}px {c[1] -
                  viewBox.y}px"
                style:animation-duration="{fanTurnNow ?? 1}s"
                data-testid="fan-copy"
                use:partCopies={{
                  find: () => findParts(fan.parts),
                  filled: true,
                  version: [domVersion, fan.parts, previewEquipment],
                }}
              ></g>
            {/if}
          {/each}
          {#if doc.carriage}
            {@const at = doc.carriage.positions[String(previewTool)] ?? [0, 0]}
            <g
              class="copies carriage-copy"
              class:animate={animateCarriage}
              style:transform="translate({at[0]}px, {at[1]}px)"
              data-testid="carriage-copy"
              use:partCopies={{
                find: () => findParts(doc.carriage?.parts ?? []),
                filled: true,
                version: [domVersion, doc.carriage.parts, previewEquipment],
              }}
            ></g>
          {/if}
          <radialGradient id="editor-chamber">
            <stop style:stop-color={bedFill(bedHeat(chamberTemp, 55))} />
            <stop
              offset="1"
              style:stop-color={bedFill(bedHeat(chamberTemp, 55))}
              stop-opacity="0"
            />
          </radialGradient>
          {#each ['bed', 'status', 'chamber'] as const as area (area)}
            {@const rect = rectOf(doc[area])}
            <g
              class="copies"
              opacity={area === 'chamber' ? 0.4 : undefined}
              style={areaLook(area)}
              data-testid="{area}-copies"
              use:partCopies={{
                find: () => findParts(partsOf(doc[area])),
                outlined: area === 'bed',
                version: [domVersion, marks, previewEquipment],
              }}
            ></g>
            {#if rect}
              <rect
                class="area-rect"
                class:inherited={base &&
                  JSON.stringify(doc[area]) ===
                    JSON.stringify(base.status[area])}
                data-testid="{area}-area"
                {...rect}
                opacity={area === 'bed' ? 0.9 : 0.4}
                style={areaLook(area)}
              />
            {/if}
          {/each}
          <!-- What a click picks: the bed over the chamber that covers it. -->
          {#each ['chamber', 'status', 'bed'] as const as area (area)}
            {@const rect = rectOf(doc[area])}
            {#if rect}
              <rect
                class="area-hit"
                data-bed="move"
                data-area={area}
                {...rect}
              />
            {/if}
          {/each}
          {#if hoverBox}
            <rect class="hover-box" {...hoverBox} />
          {/if}
          {#each selectionBoxes as b, i (i)}
            <rect class="selection-box" {...b} />
          {/each}
          {#if marquee}
            <rect class="marquee" {...marquee} />
          {/if}
          {#each doc.labels as label, i (i)}
            <g
              class="label"
              class:unmet={!met(
                labelCondition(label.heater, label.when),
                previewEquipment,
              )}
              class:active={selectedLabel === i}
              class:picked={labelSel.includes(i) && selectedLabel !== i}
              class:inherited={base && isInherited(label, base.status.labels)}
              data-label={i}
            >
              <polyline
                class="hit"
                points="{label.anchor.join(',')} {label.elbow.join(
                  ',',
                )} {label.end.join(',')}"
                stroke-width={Math.max(doc.style.stroke * 6, 12 * px)}
              />
              <LabelMark
                {label}
                style={doc.style}
                reading={editorReadings[label.heater]}
              />
              {#if selectedLabel === i}
                {#each ['anchor', 'elbow', 'end'] as const as h (h)}
                  <circle
                    class="handle"
                    data-label={i}
                    data-handle={h}
                    cx={label[h][0]}
                    cy={label[h][1]}
                    r={6 * px}
                  />
                {/each}
              {/if}
            </g>
          {/each}
          {#each areaPartBoxes as b, i (i)}
            <rect class="bed-outline" {...b} stroke-width={2 * px} />
          {/each}
          {#if fanCenters}
            {#each fanCentersNow as c, i (i)}
              {#if c}
                <g
                  class="fan-center"
                  data-fan-center={i}
                  data-testid="fan-center"
                  transform="translate({c[0]} {c[1]})"
                >
                  <circle r={9 * px} stroke-width={1.5 * px} />
                  <path
                    d="M{-14 * px} 0H{14 * px}M0 {-14 * px}V{14 * px}"
                    stroke-width={1.5 * px}
                  />
                </g>
              {/if}
            {/each}
          {/if}
          {#if areaSelected && rectOf(doc[areaSelected])}
            {@const area = areaSelected}
            {@const b = rectOf(doc[area]) ?? {
              x: 0,
              y: 0,
              width: 0,
              height: 0,
            }}
            <rect class="bed-outline" {...b} stroke-width={2 * px} />
            {#each RESIZE as h (h)}
              {@const [x, y] = handlePoint(h, b)}
              <rect
                class="resize"
                data-area={area}
                data-bed={h}
                style:cursor="{h}-resize"
                x={x - 4 * px}
                y={y - 4 * px}
                width={8 * px}
                height={8 * px}
              />
            {/each}
          {/if}
          {#if mode === 'select' && selectionBox && roots.length}
            {@const b = selectionBox}
            {#each RESIZE as h (h)}
              {@const [x, y] = handlePoint(h, b)}
              <rect
                class="resize"
                data-resize={h}
                style:cursor="{h}-resize"
                x={x - 4 * px}
                y={y - 4 * px}
                width={8 * px}
                height={8 * px}
              />
            {/each}
          {/if}
          {#if guides.x !== undefined}
            <line
              class="snap-guide"
              x1={guides.x}
              x2={guides.x}
              y1={viewBox.y}
              y2={viewBox.y + viewBox.height}
            />
          {/if}
          {#if guides.y !== undefined}
            <line
              class="snap-guide"
              y1={guides.y}
              y2={guides.y}
              x1={viewBox.x}
              x2={viewBox.x + viewBox.width}
            />
          {/if}
          {#if mode === 'row'}
            {#each rowAnchors as a, k (k)}
              <circle cx={a[0]} cy={a[1]} r={5 * px} class="pending" />
              <text
                class="row-tag"
                x={a[0] + 8 * px}
                y={a[1] - 8 * px}
                font-size={14 * px}>{toolHeaters[k]}</text
              >
            {/each}
            {#if cursor && rowAnchors.length === rowCount}
              <line
                class="snap-guide"
                y1={cursor[1]}
                y2={cursor[1]}
                x1={viewBox.x}
                x2={viewBox.x + viewBox.width}
              />
            {/if}
          {/if}
          {#if mode === 'label' && pendingAnchor}
            <circle
              cx={pendingAnchor[0]}
              cy={pendingAnchor[1]}
              r={5 * px}
              class="pending"
            />
            {#if cursor}
              <line
                class="pending"
                x1={pendingAnchor[0]}
                y1={pendingAnchor[1]}
                x2={cursor[0]}
                y2={cursor[1]}
                stroke-width={2 * px}
              />
            {/if}
          {/if}
        </g>
      </svg>
      <p class="hint">
        {#if mode === 'bed' || mode === 'chamber' || mode === 'status'}
          Drag a rectangle over the printer's {mode}. Esc cancels.
        {:else if mode === 'row'}
          {rowAnchors.length < rowCount
            ? `Click the nozzle of ${toolHeaters[rowAnchors.length] ?? ''} (${String(rowAnchors.length + 1)} of ${String(rowCount)}). Esc cancels.`
            : 'Click the height of the row of lines.'}
        {:else if mode === 'label'}
          {pendingAnchor
            ? 'Click where the leader turns into the horizontal line.'
            : 'Click the point the label names (nozzle tip, bed, …). Esc cancels.'}
        {:else}
          Click a part (Alt: the exact shape), Shift adds, ⌘ toggles, drag
          elsewhere to box-select. Drag the selection to move it along one axis
          (Alt: freely), its handles to resize (Shift: keep proportions). Arrows
          move (Shift ×10), H hides, ⌘G groups, ⇧⌘G ungroups, L adds a label.
          Click a bed or chamber rectangle to move or resize it; drag a fan's
          crosshair to move the point it turns around.
        {/if}
        {#if cursor}<span class="coords">{cursor[0]}, {cursor[1]}</span>{/if}
      </p>
    </main>

    <aside>
      <section>
        <h2>Selection ({selection.length})</h2>
        <div class="pad">
          <span></span>
          <button aria-label="Up" onclick={() => moveSelection([0, -step])}
            >▲</button
          >
          <span></span>
          <button aria-label="Left" onclick={() => moveSelection([-step, 0])}
            >◀</button
          >
          <button aria-label="Down" onclick={() => moveSelection([0, step])}
            >▼</button
          >
          <button aria-label="Right" onclick={() => moveSelection([step, 0])}
            >▶</button
          >
        </div>
        <label
          >Step <input
            type="number"
            min="0.1"
            step="0.1"
            bind:value={step}
          /></label
        >
        {#if selectionBox}
          {@const b = selectionBox}
          <div class="fields box-fields">
            {#each [['x', 'X'], ['y', 'Y'], ['width', 'W'], ['height', 'H']] as const as [field, name] (field)}
              <label
                >{name}
                <input
                  type="number"
                  step="0.1"
                  aria-label="Selection {name}"
                  value={round(b[field], 1)}
                  onchange={(e) => {
                    setBox(field, e.currentTarget.valueAsNumber);
                  }}
                /></label
              >
            {/each}
          </div>
        {/if}
        <div class="buttons">
          <button
            disabled={!selection.length}
            onclick={() => toggleHidden(selection)}>Hide / show</button
          >
          <button
            disabled={!selection.some((k) => doc.transforms[k])}
            onclick={resetTransforms}>Reset move/size</button
          >
          <button disabled={!roots.length} onclick={groupSelection} title="⌘G"
            >Group…</button
          >
          <button
            disabled={!roots.some((k) => groups.some((g) => g.key === k))}
            onclick={ungroupSelection}
            title="⇧⌘G">Ungroup</button
          >
        </div>
        <label class="move-to"
          >Move to group
          <select
            disabled={!roots.length}
            value=""
            onchange={(e) => {
              const v = e.currentTarget.value;
              e.currentTarget.value = '';
              if (v) moveInto(roots, v === '(top)' ? null : v);
            }}
          >
            <option value="">…</option>
            <option value="(top)">(top level)</option>
            {#each groups as g (g.key)}
              <option value={g.key}>{g.name}</option>
            {/each}
          </select></label
        >
        <label class="move-to"
          >Show when
          <select
            disabled={!roots.length}
            aria-label="Show selection when"
            value={selectionCondition}
            onchange={(e) => {
              const when = pickCondition(e.currentTarget, selectionCondition);
              if (when !== null) setCondition(roots, when);
            }}
          >
            <option value="">always</option>
            {@render conditionOptions(selectionCondition)}
          </select></label
        >
        <div class="buttons">
          <button onclick={() => (importing = !importing)}>Import SVG…</button>
        </div>
        {#if importing}
          <div class="import">
            <input
              type="text"
              placeholder="Group name, e.g. MMU3"
              aria-label="Imported group name"
              bind:value={importName}
            />
            <input
              type="file"
              accept=".svg,image/svg+xml"
              aria-label="SVG file"
              onchange={readImportFile}
            />
            <textarea
              rows="5"
              placeholder="…or paste SVG markup"
              aria-label="SVG markup"
              bind:value={importText}></textarea>
            <div class="small">
              With a selection, the artwork is fitted into its box.
            </div>
            <button class="primary" onclick={importArtwork}>Import</button>
          </div>
        {/if}
        {#each selection.filter((k) => doc.transforms[k]) as k (k)}
          <div class="small">{k}: {doc.transforms[k]?.join(', ')}</div>
        {/each}
        <div class="small">
          {doc.hidden.length} hidden, {Object.keys(doc.transforms).length} moved or
          resized, {doc.structure.length} structure edits
        </div>
      </section>

      <section>
        <h2>Picture</h2>
        <div class="fields">
          {#each [['value', 'Value size'], ['caption', 'Caption size'], ['stroke', 'Line width']] as const as [key, name] (key)}
            <label
              >{name}
              <input
                type="number"
                min="0.1"
                step={key === 'stroke' ? 0.1 : 1}
                value={doc.style[key]}
                onchange={(e) => {
                  setStyle(key, e.currentTarget.valueAsNumber);
                }}
              /></label
            >
          {/each}
        </div>
        <label class="bed-temp"
          ><input
            type="checkbox"
            checked={doc.style.shadow === true}
            onchange={(e) => {
              checkpoint();
              if (e.currentTarget.checked) doc.style.shadow = true;
              else delete doc.style.shadow;
            }}
          /> Label shadow</label
        >
        <div class="small">Sizes in viewBox units.</div>
      </section>

      {#snippet conditionOptions(current: string)}
        {#each CONDITIONS as c (c)}
          <option value={c}>{conditionName(c)}</option>
        {/each}
        {#if current && !CONDITIONS.includes(current)}
          <option value={current}>{conditionName(current)}</option>
        {/if}
        <option value={CUSTOM}>Custom…</option>
      {/snippet}
      {#snippet areaSection(area: AreaName, title: string, note: string)}
        {@const parts = partsOf(doc[area])}
        {@const rect = rectOf(doc[area])}
        {@const missing = parts.filter((k) => !findParts([k]).length)}
        <section>
          <h2>{title}</h2>
          <div class="buttons">
            <button
              class:on={mode === area}
              onclick={() => {
                startArea(area);
              }}>{rect ? 'Redraw rectangle' : 'Draw rectangle'}</button
            >
            <button
              disabled={!selectedShapes.length}
              onclick={() => {
                setAreaParts(area, 'use');
              }}
              title="The selected shapes, a group's shapes included"
              >Use selected parts as {area}</button
            >
            {#if parts.length}
              <button
                disabled={!selectedShapes.some((k) => !parts.includes(k))}
                onclick={() => {
                  setAreaParts(area, 'add');
                }}>Add selected</button
              >
              <button
                disabled={!selectedShapes.some((k) => parts.includes(k))}
                onclick={() => {
                  setAreaParts(area, 'remove');
                }}>Remove selected</button
              >
            {/if}
            <button
              disabled={!doc[area]}
              onclick={() => {
                deleteArea(area);
              }}>Delete</button
            >
            {#if base && JSON.stringify(doc[area]) !== JSON.stringify(base.status[area])}
              <button
                onclick={() => {
                  resetAreaToBase(area);
                }}
                title="Back to {base.name}'s">Reset to base</button
              >
            {/if}
          </div>
          {#if parts.length}
            <div class="small" data-testid="{area}-parts">
              Parts: {parts.join(', ')}
              <button
                class="link"
                onclick={() => {
                  selectKeys(parts, 'replace');
                  areaSelected = area;
                }}>Select</button
              >
            </div>
            {#if missing.length}
              <div class="small warning">
                Not in this picture: {missing.join(', ')}. Pick its own parts.
              </div>
            {/if}
          {/if}
          {#if rect}
            <div class="fields box-fields">
              {#each [['x', 'X'], ['y', 'Y'], ['width', 'W'], ['height', 'H'], ['rx', 'Radius']] as const as [field, name] (field)}
                <label
                  >{name}
                  <input
                    type="number"
                    step="0.1"
                    min={field === 'x' || field === 'y' ? undefined : 0}
                    aria-label="{title} {name}"
                    value={rect[field] ?? 0}
                    onchange={(e) => {
                      setRectField(area, field, e.currentTarget.valueAsNumber);
                    }}
                  /></label
                >
              {/each}
            </div>
          {/if}
          {#if area === 'bed'}
            <label class="bed-temp"
              >Bed {bedTemp} ℃
              <input
                type="range"
                min="20"
                max="120"
                aria-label="Preview bed temperature"
                bind:value={bedTemp}
              /></label
            >
          {:else if area === 'chamber'}
            <label class="bed-temp"
              >Chamber {chamberTemp} ℃
              <input
                type="range"
                min="20"
                max="60"
                aria-label="Preview chamber temperature"
                bind:value={chamberTemp}
              /></label
            >
          {:else}
            <label class="bed-temp"
              >State
              <select aria-label="Preview state" bind:value={previewState}>
                <option value="">none (offline)</option>
                {#each Object.keys(STATE_TONE) as s (s)}
                  <option value={s}>{s}</option>
                {/each}
              </select></label
            >
          {/if}
          <div class="small">{doc[area] ? note : 'None.'}</div>
        </section>
      {/snippet}
      {@render areaSection(
        'bed',
        'Bed',
        "Tinted from dark grey (room temperature) to orange (the bed's target, else 110 ℃), over the picture and under the labels; parts keep their outline.",
      )}
      {@render areaSection(
        'chamber',
        'Chamber',
        "Tinted like the bed by the chamber's temperature (its target, else 55 ℃), at 40 % under the bed, where the printer reports one.",
      )}
      {@render areaSection(
        'status',
        'Status',
        "Filled with the colour of the printer's state, as its state badge shows it, over the bed.",
      )}

      {#if toolCount > 1}
        <section>
          <h2>Carriage</h2>
          <div class="buttons">
            <button disabled={!selectedShapes.length} onclick={useAsCarriage}
              >Use selection as carriage</button
            >
            {#if doc.carriage}
              <button
                onclick={() => {
                  checkpoint();
                  doc = without(doc, 'carriage');
                }}>Delete</button
              >
            {/if}
          </div>
          {#if doc.carriage}
            {@const c = doc.carriage}
            <div class="small">
              Parts: {c.parts.join(', ')}
              <button
                class="link"
                onclick={() => {
                  selectKeys(c.parts, 'replace');
                }}>Select</button
              >
            </div>
            <table class="carriage-positions">
              <tbody>
                {#each Array.from({ length: toolCount + 1 }, (_, i) => i) as n (n)}
                  {@const at = c.positions[String(n)] ?? [0, 0]}
                  <tr class:on={previewTool === n}>
                    <td>{n ? `T${String(n)}` : 'Parked'}</td>
                    {#each [0, 1] as const as axis (axis)}
                      <td
                        ><input
                          type="number"
                          step="0.1"
                          aria-label="Carriage {n
                            ? `T${String(n)}`
                            : 'parked'} {axis ? 'dy' : 'dx'}"
                          value={at[axis]}
                          onchange={(e) => {
                            setCarriageAt(
                              n,
                              axis,
                              e.currentTarget.valueAsNumber,
                            );
                          }}
                        /></td
                      >
                    {/each}
                    <td
                      ><button
                        onclick={() => {
                          recordCarriage(n);
                        }}>Record</button
                      ></td
                    >
                  </tr>
                {/each}
              </tbody>
            </table>
            <label class="bed-temp"
              >Picked
              <select aria-label="Preview picked tool" bind:value={previewTool}>
                <option value={0}>none</option>
                {#each Array.from({ length: toolCount }, (_, i) => i + 1) as n (n)}
                  <option value={n}>T{n}</option>
                {/each}
              </select>
              <input type="checkbox" bind:checked={animateCarriage} /> Animate</label
            >
            <div class="small">
              Offsets from where the carriage is drawn. To set one, Select the
              carriage, drag it in front of the dock and Record.
            </div>
          {:else}
            <div class="small">
              None. Select the carriage block on the rail and use it.
            </div>
          {/if}
        </section>
      {/if}

      <section>
        <h2>Fans</h2>
        <div class="buttons">
          <button disabled={!selectedShapes.length} onclick={addFan}
            >Use selection as fan</button
          >
          {#if base && JSON.stringify(doc.fans ?? []) !== JSON.stringify(base.status.fans ?? [])}
            <button
              onclick={() => {
                checkpoint();
                setFansFromBase();
              }}
              title="Back to {base.name}'s">Reset to base</button
            >
          {/if}
        </div>
        {#each doc.fans ?? [] as fan, i (i)}
          {@const c = fanCentersNow[i]}
          <div class="fan-row" data-testid="fan-row">
            <div class="fields">
              <select
                aria-label="Fan {i + 1} kind"
                value={fan.kind}
                onchange={(e) => {
                  updateFan(i, {
                    kind:
                      e.currentTarget.value === 'print' ? 'print' : 'hotend',
                  });
                }}
              >
                <option value="hotend">Hotend fan</option>
                <option value="print">Print fan</option>
              </select>
              {#if heaters.filter((h) => h.startsWith('T')).length > 1}
                <select
                  aria-label="Fan {i + 1} tool"
                  value={fan.tool ?? 0}
                  onchange={(e) => {
                    updateFan(i, { tool: Number(e.currentTarget.value) });
                  }}
                >
                  <option value={0}>Any tool</option>
                  {#each heaters.filter((h) => h.startsWith('T')) as h, k (h)}
                    <option value={k + 1}>{h}</option>
                  {/each}
                </select>
              {/if}
              <button
                onclick={() => {
                  deleteFan(i);
                }}>Delete</button
              >
            </div>
            <div class="small">
              Parts: {fan.parts.join(', ')}
              <button
                class="link"
                onclick={() => {
                  selectKeys(fan.parts, 'replace');
                }}>Select</button
              >
            </div>
            <div class="fields box-fields">
              {#each [0, 1] as const as axis (axis)}
                <label
                  >{axis ? 'Centre Y' : 'Centre X'}
                  <input
                    type="number"
                    step="0.1"
                    aria-label="Fan {i + 1} centre {axis ? 'Y' : 'X'}"
                    value={c?.[axis] ?? 0}
                    onchange={(e) => {
                      const v = e.currentTarget.valueAsNumber;
                      if (!c || !Number.isFinite(v)) return;
                      const next: Point = [c[0], c[1]];
                      next[axis] = v;
                      updateFan(i, { center: next });
                    }}
                  /></label
                >
              {/each}
              <button disabled={!fan.center} onclick={() => autoFanCenter(i)}
                >Auto</button
              >
            </div>
          </div>
        {/each}
        <label class="bed-temp"
          >Speed {fanSpeed} %
          <input
            type="range"
            min="0"
            max="100"
            aria-label="Preview fan speed"
            bind:value={fanSpeed}
          /></label
        >
        <label class="bed-temp"
          ><input type="checkbox" bind:checked={fanCenters} /> Show the centres</label
        >
        <div class="small">
          {doc.fans?.length
            ? "Drawn in their own colours in place of the picture's, turning around the crosshair with the fan's reported speed. Drag the crosshair to centre a fan that wobbles."
            : 'None. Select a fan (a group counts as its shapes) and use it.'}
        </div>
      </section>

      <section>
        <h2>Labels</h2>
        {#if base}
          <div class="small">
            Inherited from {base.name} (dimmed) until changed.
            <button
              class="link"
              onclick={resetVariant}
              disabled={doc.labels.every((l) =>
                isInherited(l, base?.status.labels ?? []),
              ) && doc.labels.length === base.status.labels.length}
              >Reset all to base</button
            >
          </div>
          {#each base.status.labels.filter((b) => !doc.labels.some((l) => l.heater === b.heater)) as gone (gone.heater)}
            <div class="small">
              {heaterName(gone.heater)} removed here
              <button class="link" onclick={() => resetLabelToBase(gone.heater)}
                >Restore</button
              >
            </div>
          {/each}
        {/if}
        <div class="buttons">
          <select bind:value={newHeater} aria-label="Heater of the new label">
            {#each heaters as h (h)}<option value={h}>{heaterName(h)}</option
              >{/each}
          </select>
          <button class:on={mode === 'label'} onclick={startLabel}
            >Add label</button
          >
        </div>
        {#if toolHeaters.length > 1}
          <div class="buttons">
            <select bind:value={rowCount} aria-label="Tools in the row">
              {#each toolHeaters.slice(1) as h (h)}
                <option value={Number(h.slice(1))}>{h.slice(1)} tools</option>
              {/each}
            </select>
            <button class:on={mode === 'row'} onclick={startRow}
              >Add tool row</button
            >
          </div>
        {/if}
        {#if labelSel.length > 1}
          <div class="buttons arrange" aria-label="Arrange labels">
            {#each [['top', 'Top'], ['middle', 'Middle'], ['bottom', 'Bottom'], ['left', 'Left'], ['right', 'Right']] as const as [how, name] (how)}
              <button
                onclick={() => {
                  editLabels((ls) => align(ls, labelSel, how));
                }}>{name}</button
              >
            {/each}
            <button
              onclick={() => {
                editLabels((ls) => sameLength(ls, labelSel));
              }}
              title="As long as the first picked">Same length</button
            >
            {#if labelSel.length > 2}
              <button
                onclick={() => {
                  editLabels((ls) => distribute(ls, labelSel, 'x'));
                }}>Distribute ↔</button
              >
              <button
                onclick={() => {
                  editLabels((ls) => distribute(ls, labelSel, 'y'));
                }}>Distribute ↕</button
              >
            {/if}
          </div>
          <div class="small">
            {labelSel.length} labels picked (Shift/⌘-click to add)
          </div>
        {/if}
        {#if selectedLabel !== undefined && rowAt(doc.labels, doc.labels[selectedLabel]?.elbow[1] ?? NaN).length > 1}
          <div class="buttons">
            <button
              onclick={() => {
                const y = doc.labels[selectedLabel ?? -1]?.elbow[1];
                if (y !== undefined)
                  editLabels((ls) => respaceRow(ls, y, doc.style, viewBox));
              }}>Re-space tool row</button
            >
          </div>
        {/if}
        {#each doc.labels as label, i (i)}
          {@const inherited =
            base !== undefined && isInherited(label, base.status.labels)}
          <div
            class="label-row"
            class:selected={labelSel.includes(i)}
            class:inherited-row={inherited}
          >
            <button
              class="link"
              onclick={(e) => {
                pickLabel(i, e);
              }}>#{i + 1}</button
            >
            <select
              value={label.heater}
              aria-label="Heater"
              onchange={(e) => {
                const heater = e.currentTarget.value as Heater;
                updateLabel(i, (l) => ({ ...l, heater }));
              }}
            >
              {#each heaters.includes(label.heater) ? heaters : [label.heater, ...heaters] as h (h)}
                <option value={h}>{heaterName(h)}</option>
              {/each}
            </select>
            <select
              value={label.when ?? ''}
              aria-label="Show label when"
              title="Show when"
              onchange={(e) => {
                const when = pickCondition(e.currentTarget, label.when ?? '');
                if (when === null) return;
                updateLabel(i, (l) => {
                  const next: Label = { ...l };
                  if (when) next.when = when;
                  else delete next.when;
                  return next;
                });
              }}
            >
              <option value=""
                >{conditionName(
                  labelCondition(label.heater, undefined),
                )}</option
              >
              {@render conditionOptions(label.when ?? '')}
            </select>
            <button
              onclick={() => updateLabel(i, flipLabel)}
              title="Line to the other side">⇄</button
            >
            <button onclick={() => deleteLabel(i)} title="Delete">✕</button>
            {#if base && !inherited && base.status.labels.some((b) => b.heater === label.heater)}
              <button
                onclick={() => {
                  resetLabelToBase(label.heater);
                }}
                title="Back to {base.name}'s label">Reset to base</button
              >
            {/if}
          </div>
          {#if selectedLabel === i}
            <div class="small">
              anchor {label.anchor.join(', ')} · elbow {label.elbow.join(', ')} ·
              end
              {label.end.join(', ')}
            </div>
          {/if}
        {/each}
      </section>
    </aside>
  </div>

  {#if tab === 'preview' && saved}
    <div class="preview">
      {@render equipmentBar()}
      <div class="preview-picture">
        <StatusPicturePreview
          svg={saved.svg}
          status={saved.status}
          readings={previewReadings}
          equipment={previewEquipment}
          printerState={previewState}
          fanTurn={fanTurnNow}
          pickedTool={previewTool}
          animate={animateCarriage}
          showCenters={fanCenters}
        />
      </div>
      <p class="small">
        assets/printers/status/{printer}.svg with assets/printers/status/{printer}.json,
        drawn by dev/picture-editor/status-picture-preview.svelte with made-up
        readings that heat, hold and cool.
      </p>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    background: #1d1d1f;
    color: #e8e8ea;
    font:
      13px/1.4 system-ui,
      sans-serif;
  }
  .editor {
    --color-orange-light-9: #fa6831;
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
  header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid #333;
  }
  .message {
    color: #9c9ca3;
  }
  button,
  select,
  input {
    font: inherit;
    color: inherit;
    background: #2c2c30;
    border: 1px solid #44444a;
    border-radius: 4px;
    padding: 3px 8px;
  }
  button:hover:not(:disabled) {
    background: #3a3a40;
  }
  button:disabled {
    opacity: 0.4;
  }
  button.on,
  button.primary {
    background: #fa6831;
    border-color: #fa6831;
    color: #fff;
  }
  .tabs {
    display: inline-flex;
    gap: 2px;
  }
  .body {
    display: grid;
    grid-template-columns: minmax(260px, 30%) 1fr 280px;
    flex: 1;
    min-height: 0;
  }
  .body[hidden] {
    display: none;
  }
  .tree {
    overflow: auto;
    border-right: 1px solid #333;
    font-size: 12px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
    cursor: default;
    padding-right: 6px;
  }
  .row:hover {
    background: #2a2a2e;
  }
  .row.selected {
    background: #4a2c1f;
  }
  .row.hidden-node .tag,
  .row.hidden-node .desc {
    text-decoration: line-through;
    opacity: 0.5;
  }
  .row input {
    margin: 0;
    padding: 0;
  }
  .twisty {
    width: 14px;
    padding: 0;
    border: 0;
    background: none;
    text-align: center;
  }
  .swatch {
    width: 10px;
    height: 10px;
    border: 1px solid #666;
    flex: none;
  }
  .tag {
    color: #f0a070;
  }
  .path {
    color: #777;
  }
  .desc {
    color: #b0b0b6;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  main {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    padding: 8px;
    gap: 6px;
  }
  .canvas {
    flex: 1;
    min-height: 0;
    width: 100%;
    background: #dcdcdc;
    border-radius: 6px;
    user-select: none;
    touch-action: none;
  }
  .canvas.labeling {
    cursor: crosshair;
  }
  /* A fixed height, so the canvas (and what is under the pointer) does not
     jump when the coordinates appear. */
  .hint {
    margin: 0;
    color: #9c9ca3;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    height: 2.8em;
    flex: none;
    overflow: hidden;
  }
  .coords {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .overlay rect {
    fill: none;
    vector-effect: non-scaling-stroke;
    pointer-events: none;
  }
  .fields {
    display: grid;
    grid-template-columns: 1fr 80px;
    gap: 4px 8px;
    align-items: center;
  }
  .fields label {
    display: contents;
  }
  .fields input[type='number'] {
    width: 100%;
    box-sizing: border-box;
  }
  .name {
    color: #f4f4f5;
    font-weight: 600;
  }
  .overlay .resize {
    pointer-events: all;
    fill: #fff;
    stroke: #00a3ff;
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
  }
  .row.group .tag {
    color: #7cc4ff;
  }
  .top-level {
    color: #777;
    font-style: italic;
  }
  .when {
    color: #2a9d55;
    font-size: 11px;
    border: 1px solid #2a9d55;
    border-radius: 3px;
    padding: 0 3px;
  }
  .import {
    display: grid;
    gap: 6px;
    margin: 8px 0;
  }
  .import textarea {
    font:
      11px ui-monospace,
      monospace;
    color: inherit;
    background: #2c2c30;
    border: 1px solid #44444a;
    border-radius: 4px;
  }
  .buttons.equipment {
    align-items: center;
    gap: 6px 20px;
    padding: 0 12px;
  }
  .equipment .tools {
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }
  .label.unmet {
    opacity: 0.4;
  }
  .equipment label {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .move-to {
    display: block;
    margin: 4px 0;
  }
  .move-to select {
    margin-left: 6px;
  }
  .box-fields {
    grid-template-columns: repeat(2, auto 1fr);
    margin: 8px 0;
  }
  .box-fields label {
    display: contents;
  }
  .selection-box {
    stroke: #00a3ff;
    stroke-width: 2;
    stroke-dasharray: 5 3;
  }
  .hover-box {
    stroke: #00a3ff;
    stroke-width: 1;
    opacity: 0.6;
  }
  .marquee {
    stroke: #00a3ff;
    stroke-width: 1;
    fill: rgb(0 163 255 / 10%) !important;
  }
  .overlay .area-hit {
    fill: transparent;
    pointer-events: all;
    cursor: move;
  }
  .overlay .area-rect {
    pointer-events: none;
    transition: fill 0.3s;
  }
  .overlay .area-rect.inherited {
    opacity: 0.6;
  }
  /* The app draws the fans and the status light in place of the picture's. */
  .canvas :global([data-fan-part]),
  .canvas :global([data-carriage-part]),
  .canvas :global([data-status-part]) {
    opacity: 0;
  }
  .copies {
    pointer-events: none;
    transition: fill 0.3s;
  }
  .fan-copy {
    transform-box: view-box;
  }
  .fan-copy.turning {
    animation: fan-turn linear infinite;
  }
  @keyframes fan-turn {
    to {
      transform: rotate(360deg);
    }
  }
  .fan-center {
    cursor: move;
    fill: rgb(0 163 255 / 15%);
    stroke: #00a3ff;
  }
  .carriage-copy.animate {
    transition: transform 0.8s ease-in-out;
  }
  .carriage-positions input {
    width: 52px;
  }
  .carriage-positions button {
    padding: 3px 6px;
  }
  .carriage-positions tr.on td:first-child {
    color: #fa6831;
  }
  .fan-row {
    border-top: 1px solid #333;
    padding: 6px 0;
  }
  .small.warning {
    color: #c0392b;
  }
  .bed-outline {
    fill: none;
    stroke: #4da3ff;
    pointer-events: none;
  }
  .bed-temp {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 6px 0;
  }
  .label {
    color: #fa6831;
    cursor: pointer;
  }
  .label.inherited {
    opacity: 0.55;
  }
  .label-row.inherited-row select:first-of-type {
    opacity: 0.6;
  }
  .label.picked {
    color: #ffb27a;
  }
  .snap-guide {
    stroke: #e5398f;
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
    pointer-events: none;
  }
  .row-tag {
    fill: #00a3ff;
    font-weight: 600;
    pointer-events: none;
  }
  .label.active {
    color: #ff9a3c;
  }
  .hit {
    fill: none;
    stroke: transparent;
  }
  .handle {
    fill: #fff;
    stroke: #00a3ff;
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
    cursor: move;
  }
  .pending {
    fill: #00a3ff;
    stroke: #00a3ff;
    pointer-events: none;
  }
  aside {
    border-left: 1px solid #333;
    overflow: auto;
    padding: 8px 12px;
  }
  h2 {
    font-size: 13px;
    margin: 8px 0;
  }
  section + section {
    border-top: 1px solid #333;
    margin-top: 12px;
  }
  .pad {
    display: grid;
    grid-template-columns: repeat(3, 36px);
    gap: 4px;
    margin-bottom: 8px;
  }
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 8px 0;
  }
  label input {
    width: 70px;
  }
  label input[type='checkbox'] {
    width: auto;
    margin: 0;
  }
  .small {
    font-size: 11px;
    color: #9c9ca3;
  }
  .label-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
    margin: 4px 0;
    padding: 2px;
    border-radius: 4px;
  }
  .label-row.selected {
    background: #4a2c1f;
  }
  .link {
    border: 0;
    background: none;
    padding: 0 4px;
  }
  .preview {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px;
    gap: 8px;
    overflow: auto;
  }
  .preview-picture {
    width: min(640px, 100%);
    background: #f4f4f5;
    border-radius: 8px;
  }
</style>
