# Prusa-Connect-Local

This is a printer connect webservice. It is compatible with other 3D printer services, so many applications can use this service.

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
- start [http-*] -> run a dev server with authentication

printer types:

- sl1
- mini

Example:

```bash
npm run dev:mini
npm run build:mini
npm run start:mini
npm run start:mini http-basic
npm run start:mini http-apikey
```

## Translations

1. Append all new keys in `src/locales/source/en.json` and add default english translation.
2. Send `src/locales/source/en.json` file to the content
3. Copy all files from translators in `src/locales/source` folder. Name of the files should be `cs_CZ.json`, `en_US.json`, ...
4. Run `src/locales/update_translations.py` script to extract only used strings.
5. Check the diff.
6. Delete `cs_CZ.json`, `en_US.json`, ... files.
7. Commit
