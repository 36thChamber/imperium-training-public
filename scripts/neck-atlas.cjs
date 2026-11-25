// Shared indexed PNG layout for the offline Astartes and Sororitas neck plates.
const { Buffer } = require('node:buffer');
const fs = require('node:fs');
const zlib = require('node:zlib');
const { neckSourceY, portraitSheetHeight } = require('../src/components/neckAtlas.ts');

function preparePortrait(base) {
  const stride = base.width + 1; // Each row starts with PNG filter zero.
  const palette = new Map(base.palette.map((rgba, index) => [Buffer.from(rgba).readUInt32BE(0), index]));
  const pixels = Buffer.alloc(stride * portraitSheetHeight * 1.5);
  for (let y = 0; y < neckSourceY.slender * 1.5; y++) {
    for (let x = 0; x < base.width; x++) {
      pixels[y*stride+1+x] = palette.get(base.data.readUInt32BE(4*(y*base.width+x)));
    }
  }
  return { pixels, stride, palette };
}

function chunk(name, bytes) {
  const body = Buffer.concat([Buffer.from(name), bytes]);
  const result = Buffer.alloc(body.length + 8);
  result.writeUInt32BE(bytes.length);
  body.copy(result, 4);
  result.writeUInt32BE(zlib.crc32(body), result.length - 4);
  return result;
}

function savePortrait(file, base, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(base.width);
  header.writeUInt32BE(portraitSheetHeight * 1.5, 4);
  header[8] = 8;
  header[9] = 3;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', header),
    chunk('PLTE', Buffer.from(base.palette.flatMap(color => color.slice(0,3)))),
    chunk('tRNS', Buffer.from(base.palette.map(color => color[3]))),
    chunk('IDAT', zlib.deflateSync(pixels, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]));
}

module.exports = { preparePortrait, savePortrait };
