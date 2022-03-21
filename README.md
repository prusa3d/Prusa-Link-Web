# PrusaLink

This is a printer connect webservice. It is compatible with other 3D printer services, so many applications can use this service.

### Install

```bash
npm install
```

## Commands

```
npm run {command}[:{config}] [option]

```
Where `{command}` is one of the following:

* `build` -> build static files with production
* `start` -> run a dev server, including virtual printer mockup
* start [http-*] -> run a dev server with authentication

`{config}` is one of the following:

* `sl1` -> Prusa SL1 printer configuration (see `config.sl1.js`)
* `m1` -> Prusa SL1 printer configuration (see `config.m1.js`)
* `mini` -> Prusa Mini printer configuration (see `config.mini.js`)
* `custom` -> Tries to use custom configuration file `config.custom.js` (not a part of the git repository)
* if not set, default configuration from `webpack.config.js` is being used

`option` is one of the following:

* ` http-basic` -> enables Basic authentication on virtual printer
* ` http-apikey` -> enables API-KEY authentication on virtual printer

Examples:

```bash
npm run build
npm run build:mini
npm run start
npm run start http-basic
npm run start http-apikey
npm run start:sl1

```


## Translations

1. Append all new keys in `src/locales/source/en.json` and add default english translation.
2. Send `src/locales/source/en.json` file to the content
3. Copy all files from translators in `src/locales/source` folder. Name of the files should be `cs_CZ.json`, `en_US.json`, ...
4. Run `src/locales/update_translations.py` script to extract only used strings.
5. Check the diff.
6. Delete `cs_CZ.json`, `en_US.json`, ... files.
7. Commit

## Icons

1. Add icons into the `src/assets/` directory.
2. Run the `npm run recolor` script, it will do the following:
    1. Fix the primary (orange) color to use only the correct one.
    2. Create a green version for m1 printers.

The script may not recognize the primary (orange) color. If that happens, you have two choices:
1. Add this color into `tools\recolor_icons\config\fix_primary_color.js`.
2. Or manually change the color of an icon and run the script again.
