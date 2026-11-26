# Printer pictures

One picture per printer model, optimised at build time (`mock/printer-images.ts`).

`status/` holds the status pictures saved by the picture editor: `<name>.svg`
is the picture to draw instead of `<name>.svg` here, and `<name>.json` its
labels (one per heater, the reading drawn on the part it heats), the parts
shown only under a condition and, optionally, the bed area (`bed`: `x`, `y`,
`width`, `height`, `rx` on the 1000-unit canvas) that the app tints from dark
grey to orange as the bed heats, over the picture and under the labels. A picture without both files is drawn as it is,
without labels. Adding or updating one is a file copy. They are made with
`make picture-editor` from the pictures here.
