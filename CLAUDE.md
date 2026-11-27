@README.md

# Working on PrusaLink Web 2

The app runs on the printer: the Buddy firmware embeds `dist/<variant>/index.html`
and serves it from the printer's own web server. Every decision follows from that.

## Start here

- `make` sets up and opens the app on the mock printer (port 5957). `make help` lists the rest.
- Skills in `.claude/skills/` cover the common jobs: running and checking the app
  (`run-app`), changing the printer API (`api-change`), building firmware and running
  it in the simulator (`firmware`), recording a demo video (`record-demo`).
- Before handing work back: `make check && make build && make e2e` (`make ci` adds `demo-e2e`).

## Hard rules

- **Budget**: each `dist/<variant>/index.html` stays under 83 KB gzip for the MINI builds and 140 KB gzip for every other printer (`scripts/check-size.ts`)
  (`scripts/check-size.ts`, run by `make build`). Check it after adding a dependency.
- **Per-build features live in one place**: `build/features.ts`. To change what a printer's page includes, edit that table; gate the code with its `__FLAG__` constant, never with a check of the variant. A new feature gets a flag there (and a line in `src/virtual.d.ts`).
- **Nothing dev-only ships**: `mock/`, `dev/`, `demo/`, `scripts/`, `e2e/`, `e2e-demo/` are never imported from `src/`.
  The Pages demo (`demo/`, `make demo`) bundles `mock/` and `dev/` into a browser
  page, so those stay free of Node-only imports at runtime (`mock/vite-plugin.ts` is
  the Node side).
- **Release zip is a contract**: `make package` makes `share/prusalink-web-<version>.zip`
  (`scripts/package.ts`), which the Buddy firmware downloads from GitHub releases.
  Do not rename its folders or files or change `manifest.json`'s shape (README,
  "Releases and firmware").
- **Every API call goes through `src/lib/api`** and carries `X-Api-Key`. A request without
  it makes the firmware answer with a Digest challenge, and the browser shows its own
  login dialog. Never call the API before `session.signedIn`.
- **The spec is the contract**: types come from `spec/openapi.yaml` (`make spec-sync`).
  The mock is typed from it too. Change the API by changing the spec first (`api-change`).
- **Mobile pickers ignore `accept`**: on touch devices the file input has no type filter
  and the app filters by extension (`src/lib/files/filter.ts`). Hidden files (`.` prefix,
  `._` twins, `System Volume Information`, ...) are never shown or uploaded.
- **Ports**: dev 5957, e2e 5958, demo preview 5959. Never 5173 (other projects use it) and never kill a
  process you did not start.
- Follow `@prusa/frontend-standards` (`node_modules/@prusa/frontend-standards/rules/*.md`):
  runes only, class stores in `.svelte.ts`, Tailwind utilities on the Prusa tokens, every
  user-facing string in `src/locales/en.json` through `t()`/`tn()`, with the same key in
  every other `src/locales/<lang>.json` (cs, de, es, fr, it, ja, pl, uk; a test checks), primitives from
  `src/lib/ui` instead of raw `button`/`input`.

## Things worth knowing

- Theme: light, dark or automatic (`src/lib/theme`), stored in localStorage
  (`prusalink.theme`); `index.html` applies it before the first paint.
- Firmware updates: `src/lib/firmware/releases.ts` asks the public GitHub releases of
  Prusa-Firmware-Buddy from the browser for the printer's `.bbf`. GitHub sends no CORS
  headers for release files, so the page fetches it from the Prusa mirror
  (`fetchableUrl`) and uploads it to the USB root, where the printer finds it on boot
  and asks to flash it. If the mirror fails, the person downloads the file and drops it
  in the dialog. Firmware older than the `.bbf` upload support answers 415; then the
  file has to be copied to the USB drive by hand.
- Size: `scripts/build-all.ts` drops colour steps no `var()` reads (`mock/prune-css-vars.ts`).
  XL is the largest build because of its picture; watch it first.

## Printer facts the app relies on

- Login: the PrusaLink password (printer: Settings > Network > PrusaLink). The Digest
  user `maker` is fixed in firmware; the app only uses `X-Api-Key`.
- Model: `/api/version` `printer` is the firmware's type.version.subversion
  (`src/lib/printer/models.ts`). Name: `/api/v1/info` `hostname`.
- USB files use 8.3 names (`BENCHY~1.BGC`); the long name is `display_name`.
- `/api/v1/status` reports the _active_ tool only. Per-tool data and tool mapping need
  new firmware API (planned for 2.1: OctoPrint-compatible `/api/printer` `tool0..N`, then
  prusa-connect-shaped `tools[]` and `start_print` with `tool_mapping`).

- `pnpm-lock.yaml`: the `@prusa/frontend-standards` resolution must keep `path: packages/standards`. pnpm 11 drops it when it rewrites the lockfile, and a clean `--frozen-lockfile` install (CI) then gets the whole prusa-connect repo instead of the package.
