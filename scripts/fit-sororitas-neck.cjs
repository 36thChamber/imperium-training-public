// Rebuild only the additional body-type strips of the six Sororitas portraits.
/* global __dirname */
require('tsx/cjs');
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');
const { FACE_PRESETS } = require('../src/avatarOptions.ts');
const { sororitasNeckScale } = require('../src/components/sororitasNeck.ts');
const { neckHeight, neckSourceY, neckTop } = require('../src/components/neckAtlas.ts');
const { preparePortrait, savePortrait } = require('./neck-atlas.cjs');

const scale = 1.5;
const colWidth = 300;
const headDir = path.join(__dirname, '../assets/avatar-comic/heads');
const linear = value => value <= 10 ? value/3294.6 : ((value/255 + .055)/1.055) ** 2.4;

// The atlas encodes ink, skin colour and paper as ink coverage, rather than
// ordinary RGB. Resample the continuous tone with premultiplied edge coverage
// and quantize back onto the existing palette used by all skin colours.
function makeSampler(palette) {
  const tones = palette.map(([r,,b]) => 1-linear(r)+linear(b));
  const levels = [...new Set(palette.map(c=>c[3]))];
  const closest = (values, target) => values.reduce((best,v) =>
    Math.abs(v-target) < Math.abs(best-target) ? v : best);
  const nearestAlpha = Array.from({ length: 256 }, (_,alpha) => closest(levels,alpha));
  const indices = new Map();
  for (const alpha of levels) {
    const matches = tones.flatMap((tone,i) => palette[i][3] === alpha ? [{ tone, i }] : []);
    indices.set(alpha, Array.from({ length: 201 }, (_,k) =>
      matches.reduce((best,v) => Math.abs(v.tone-k/100)<Math.abs(best.tone-k/100) ? v : best).i));
  }
  return (a,b,t) => {
    if (a === b || t === 0) return a;
    const wa = (1-t)*palette[a][3], wb = t*palette[b][3], coverage = wa+wb;
    const alpha = nearestAlpha[Math.round(coverage)];
    if (!alpha) return 0;
    const tone = (wa*tones[a]+wb*tones[b])/coverage;
    return indices.get(alpha)[Math.max(0,Math.min(200,Math.round(tone*100)))];
  };
}

for (const { id } of FACE_PRESETS) {
  const file = path.join(headDir,`sororitas-${id}.png`);
  const base = PNG.sync.read(fs.readFileSync(file));
  const { pixels, stride } = preparePortrait(base);
  const sample = makeSampler(base.palette);
  for (const bodyType of ['slender','broad']) {
    for (let j=0; j<neckHeight*scale; j++) {
      const y = neckTop + (j+.5)/scale;
      const factor = sororitasNeckScale(bodyType,y);
      const fromRow = (neckTop*scale+j)*stride + 1;
      const toRow = (neckSourceY[bodyType]*scale+j)*stride + 1;
      if (factor === 1) {
        pixels.copy(pixels,toRow,fromRow,fromRow+base.width);
        continue;
      }
      for (let col=0; col<3; col++) {
        const offset = col*colWidth;
        for (let x=0; x<colWidth; x++) {
          const sourceX = Math.max(0,Math.min(colWidth-1, (x+.5-colWidth/2)/factor+colWidth/2-.5));
          const i = Math.floor(sourceX);
          const a = pixels[fromRow+offset+i], b = pixels[fromRow+offset+Math.min(colWidth-1,i+1)];
          pixels[toRow+offset+x] = sample(a,b,sourceX-i);
        }
      }
    }
  }
  savePortrait(file,base,pixels);
}
