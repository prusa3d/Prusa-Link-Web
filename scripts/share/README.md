# PrusaLink Web

One self-contained `index.html` per printer, as the firmware would serve it,
with `index.html.gz` and `favicon.ico.gz` gzipped exactly as the firmware
embeds them. `manifest.json` names the release, its commit, and the size and
SHA-256 of every file.

| Folder                                                                            | Printer                                                   |
| --------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `generic`                                                                         | any printer (picture and favicon of none in particular)   |
| `mk4`, `mk35`, `coreone`, `coreonel`, `coreone_indx`, `coreonel_indx`, `xl`, `ix` | that printer                                              |
| `mini-<lang>`                                                                     | MINI, one language each (its firmware ships per language) |

## Try it against your printer, without flashing

Needs Node.js 18 or newer. PrusaLink must be enabled on the printer
(Settings > Network > PrusaLink), where you also find its password.

    node serve.mjs http://192.168.1.20            # generic page
    node serve.mjs http://192.168.1.20 xl         # the XL page
    node serve.mjs http://192.168.1.20 mk4 5971   # another port

Then open http://localhost:5970/ and sign in with the printer's PrusaLink
password.

Opening `index.html` straight from disk (file://) cannot work: the printer does
not allow pages from other origins to call its API, so the browser blocks every
request. `serve.mjs` serves the page and forwards the API, like the printer does.

## Put it on a printer

Copy the folder's `index.html` (and `favicon.ico`) to `src/resources/web/` of
the Buddy firmware and build it.
