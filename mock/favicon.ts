import { Resvg } from '@resvg/resvg-js';

const SIZES = [16, 32, 48];

/// A favicon.ico of a printer picture: the printer cropped square and drawn
/// at 16, 32 and 48 px, each stored as PNG inside the ICO, which every
/// current browser reads.
export function printerFavicon(svg: string): Buffer {
  const pngs = SIZES.map((size) => {
    const measure = new Resvg(svg);
    const box = measure.getBBox();
    if (!box) throw new Error('empty picture');
    const side = Math.max(box.width, box.height);
    box.x -= (side - box.width) / 2;
    box.y -= (side - box.height) / 2;
    box.width = side;
    box.height = side;
    const render = new Resvg(svg, {
      fitTo: { mode: 'width', value: size },
      background: 'rgba(0,0,0,0)',
    });
    render.cropByBBox(box);
    return { size, png: render.render().asPng() };
  });
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, png }, i) => {
    const at = 6 + 16 * i;
    header.writeUInt8(size, at);
    header.writeUInt8(size, at + 1);
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(png.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.png)]);
}
