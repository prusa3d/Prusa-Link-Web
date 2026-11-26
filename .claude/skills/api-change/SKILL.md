---
name: api-change
description: Change or extend the printer REST API PrusaLink Web uses (new endpoint, new field, per-tool data, tool mapping). Use whenever the app needs data or actions the current spec does not have.
---

# Change the printer API

The spec is the contract between the firmware and the app. Order matters:

1. **Reuse before inventing.** Check, in this order:
   - the current spec (`spec/openapi.yaml`) and what the firmware actually serves
     (`../Prusa-Firmware-Buddy/lib/WUI/link_content/`, `lib/WUI/nhttp/`);
   - OctoPrint's API (`../OctoPrint/docs/api/*.rst`): if OctoPrint has it, use its path
     and shape so OctoPrint clients work too (e.g. `/api/printer` `tool{n}`);
   - Prusa Connect's shapes (`../prusa-connect/docs/src/content/docs/capabilities.md`):
     `tools[n]`, `start_print` with `path` and `tool_mapping`. The firmware already
     produces these for Connect (`src/connect/` in Buddy): expose them, do not reinvent.
2. **Change the spec.** Today `spec/openapi.yaml` is pinned from `prusa3d/Prusa-Link-Web`
   (`spec/source.json`); the plan is to move it into Buddy. Until then edit
   `spec/openapi.yaml`, set the new `sha256` in `spec/source.json`, and run
   `corepack pnpm spec:sync` to regenerate `src/lib/api/schema.d.ts`.
3. **The mock follows the spec.** Implement it in `mock/api.ts` (handlers are typed by
   the spec's 200 responses) and `mock/printer.ts`, with a case in `mock/api.test.ts`.
4. **App.** Call it through `api` in `src/lib/api/client.ts`; keep state in a class store.
5. **Firmware.** Implement it in the Buddy worktree (the `firmware` skill), then run the
   app against the simulator (`make sim` and `make dev-sim`) to prove mock and firmware agree.

API additions belong to PrusaLink 2.1. The app keeps working on firmware without them:
detect a feature by the response, never by the firmware version string.
