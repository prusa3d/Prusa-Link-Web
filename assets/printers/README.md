# Printer pictures

One picture per printer model, optimised at build time (`mock/printer-images.ts`).

`status/` holds the status pictures saved by the picture editor: `<name>.svg`
is the picture to draw instead of `<name>.svg` here, and `<name>.json` its
labels (one per heater, the reading drawn on the part it heats; `style.shadow`
lifts them off the picture), the parts shown only under a condition (`mmu`,
`enclosure`, `chamber`, `tools>=N`, `tools<=N`, `tools=N`; `!` negates, `&`
joins, `|` separates alternatives) and,
optionally, what the app draws over the picture, in this order under the
labels:

- `fans`: parts drawn in their own colours in place of the picture's
  (`parts`, the editor's keys; `kind` `hotend` or `print`; `tool`; `center`,
  else the middle of the parts), turning with the fan's reported speed.
- `bed`: tinted from dark grey to orange as the bed heats.
- `status`: filled with the colour of the printer's state.
- `chamber`: tinted like the bed by the chamber's temperature, fading out
  towards its edges, see-through; only on a printer that reports one.

Each area is a rectangle (`x`, `y`, `width`, `height`, `rx` on the 1000-unit
canvas) or parts of the picture (`parts`). The SVG marks parts with
`data-bed-part`, `data-chamber-part`, `data-status-part` or `data-fan-part`
(the fans' indices), and the build copies them, the bed's and the status's
with their outline. A picture without both files is drawn as it is, without
labels. Adding or updating one is a file copy. They are made with
`make picture-editor` from the pictures here.

`xl.svg` is every XL in one: one to five tools, with and without the
enclosure, each combination drawn as the 3mf-generator's thumbnail of it;
`status/xl.json` shows the parts of each by condition.
