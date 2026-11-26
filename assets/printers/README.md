# Printer pictures

One picture per printer model, optimised at build time (`mock/printer-images.ts`).

`status/` holds the status pictures saved by the picture editor: `<name>.svg`
is the picture to draw instead of `<name>.svg` here, and `<name>.json` its
labels (one per heater, the reading drawn on the part it heats) and the parts
shown only under a condition. A picture without both files is drawn as it is,
without labels. Adding or updating one is a file copy. They are made with
`make picture-editor` from the pictures here.
