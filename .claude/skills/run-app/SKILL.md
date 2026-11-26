---
name: run-app
description: Start PrusaLink Web against the mock printer, a simulator or a real printer, and check a change in a real browser. Use when asked to run, open, try or screenshot the app.
---

# Run the app

## Against the mock printer (default)

```bash
make                      # or: make DEV_PORT=5960 when 5957 is taken
```

Opens `http://localhost:5957/#key=mockapikey12345`, signed in. The mock is
`mock/printer.ts` (state) and `mock/api.ts` (REST, typed from the spec). Drive it from
the dev panel at `/dev/panel.html`, or over HTTP:

```bash
curl -X PATCH localhost:5957/__mock/state -d '{"model":"XL","reset":true}'
curl -X PATCH localhost:5957/__mock/state -d '{"startPrint":"3DBENC~1.BGC","timeScale":200}'
```

`model`: `MK4S` | `XL` | `COREONE` | `COREONE_INDX`. `reset` restores the seeded state
(idle, cold, USB files including folders and OS junk that must stay hidden).

## Against a simulator or a real printer

```bash
make sim PRINTER=mk4      # terminal 1, see the firmware skill
make dev-sim              # terminal 2: proxies /api to 127.0.0.1:8180, opens signed in
PRINTER_URL=http://192.168.x.y corepack pnpm dev   # a real printer; sign in with its password
```

Send nothing but GETs to a real printer without asking: it may be printing.

## Look at it

Check a UI change in a browser, not just in tests. Playwright is installed:

```js
// node shot.mjs, from the repo root
import { chromium, devices } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
await p.goto('http://localhost:5957/#key=mockapikey12345');
await p.getByTestId('printer-state').waitFor();
await p.screenshot({ path: 'shot.png', fullPage: true });
await b.close();
```

Check a phone (`iPhone 13`) and a desktop viewport.
