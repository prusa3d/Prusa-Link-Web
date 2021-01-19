# Prusa-Connect-Local

This is a printer connect webservice. It is compatible with another 3D printer services, so many applications which use this service.

### Install

```bash
npm install
```

## UI

`npm run {build_type}:{printer_type}`

build type:
- dev -> build mode developer
- build -> build mode production
- start -> run a dev server (Should run dev/build first for generate preprocessing code)

printer types:
- sl1
- mk3
- mini

Example:
```bash
npm run dev:mini
npm run build:mini
npm run start:mini
```
