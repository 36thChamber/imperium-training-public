// Refit the painted throat under each original jaw. Run with
// node scripts/fit-astartes-neck.cjs from any directory.
/* global __dirname */
require('tsx/cjs');
const { preparePortrait, savePortrait } = require('./neck-atlas.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { neckTop, neckHeight, neckSourceY } = require('../src/components/neckAtlas.ts');
const { PNG } = require('pngjs');
const { getComicJawline } = require('./comicJawlines.ts');
const { astartesNeckEdges } = require('../src/components/astartesNeck.ts');

const root = path.resolve(__dirname, '..');
const read = file => PNG.sync.read(fs.readFileSync(path.join(root, file)));
const study = read('references/avatar-quadrinho/estudo-pescoco-astartes.png');
const jawBands = read('references/avatar-quadrinho/encaixes-queixo-astartes.png');
const presets = ['european', 'eastAsian', 'african', 'southAsian', 'middleEastern', 'indigenousAmerican'];
const shapes = ['square', 'oval', 'round'];
const scale = 1.5;
const firstRow = 180; // The reference bands are the original local rows 120–168.
const bandHeight = 72;
const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const mix = (a, b, t) => a * (1 - t) + b * t;
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };

function along(points, x) {
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i];
    if (x <= bx) return mix(ay, by, clamp((x - ax) / (bx - ax)));
  }
  return points.at(-1)[1];
}

// The lower edge of the chin in the new study (coordinates in its source crop).
const studyJaw = [[0,46],[.10,85],[.26,125],[.42,163],[.55,177],[.65,169],[.80,129],[.93,83],[1,42]];

function referencePixel(sx, sy, presetIndex) {
  const row = clamp(sy - firstRow, 0, bandHeight - 1);
  return 4 * ((presetIndex * bandHeight + row) * jawBands.width + sx);
}

const linear = v => (v <= 10 ? v / 3294.6 : ((v / 255 + .055) / 1.055) ** 2.4);
function originalBoundary(jaw, column, presetIndex) {
  const { angle, lowerJaw, chin } = jaw;
  const guide = [[0,132],[angle.left - 6,135],[angle.left,140],[lowerJaw.left,lowerJaw.y],
    [chin.x-17,chin.y-1],[chin.x,chin.y],[chin.x+17,chin.y-1],
    [lowerJaw.right,lowerJaw.y],[angle.right,140],[angle.right+6,135],[200,132]];
  const samples = Array.from({ length: 300 }, (_, ix) => {
    const x = (ix + .5) / scale, expected = along(guide, x);
    const ink = y => {
      const k = referencePixel(300 * column + ix, Math.floor(y * scale), presetIndex);
      return linear(jawBands.data[k]) * jawBands.data[k + 3] / 255;
    };
    let best = -Infinity, boundary = expected;
    for (let y = expected - 4; y <= expected + 4; y += .5) {
      const change = (ink(y + 2) + ink(y + 1) - ink(y - 1) - ink(y - 2)) / 2;
      const score = change - Math.abs(y - expected) * .065;
      if (score > best) { best = score; boundary = y; }
    }
    return boundary;
  });
  const curve = samples.map((_, i) => (samples[Math.max(0, i-2)] + 2*samples[Math.max(0,i-1)]
    + 3*samples[i] + 2*samples[Math.min(299,i+1)] + samples[Math.min(299,i+2)]) / 9);
  // A horizontal scan through a jaw must not meet an isolated island of the
  // old neck outside the jaw corner (particularly visible on the lit side).
  for (let i=Math.floor(lowerJaw.left*scale);i>0;i--) curve[i-1] = Math.min(curve[i-1],curve[i]);
  for (let i=Math.ceil(lowerJaw.right*scale);i<299;i++) curve[i+1] = Math.min(curve[i+1],curve[i]);
  return curve;
}

// Some original faces have a sliver of neck outside the vertical outline of
// the jaw. Keep the ink on the jaw and remove the old skin beyond that line.
function jawRim(p, col, row, fromLeft) {
  const step = fromLeft ? 1 : -1;
  const at = i => referencePixel(col*300+i,row,p);
  let edge = fromLeft ? 0 : 299;
  while (edge >= 0 && edge < 300 && jawBands.data[at(edge)+3] < 128) edge += step;
  const dark = i => jawBands.data[at(i)] >= 222;
  let i = edge;
  while (Math.abs(i-edge)<4 && !dark(i)) i += step;
  while (Math.abs(i-edge)<15 && dark(i)) i += step;
  const endOfOutline = i;
  while (Math.abs(i-edge)<15 && !dark(i)) i += step;
  const secondLine = Math.abs(i-edge)<14 && i !== endOfOutline && dark(i+step);
  return { edge, inset: secondLine ? Math.abs(i-edge) : 0 };
}

function sampleStudy(x, y) {
  x = clamp(x, 0, study.width-2); y = clamp(y, 0, study.height-2);
  const px = Math.floor(x), py = Math.floor(y);
  const luma = (dx, dy) => {
    const k = 4 * ((py+dy)*study.width+px+dx);
    return .35 * study.data[k] + .52 * study.data[k+1] + .13 * study.data[k+2];
  };
  return mix(mix(luma(0,0),luma(1,0),x-px), mix(luma(0,1),luma(1,1),x-px), y-py);
}

function neckSample(x, y, seam, left, right) {
  const alpha = clamp((Math.min(x-left,right-x) + .38) * scale);
  if (!alpha) return [0,0];
  const u = clamp((x-left)/(right-left));
  const depth = y-seam;
  const sx = mix(46,708,u);
  const sy = along(studyJaw,u) + Math.max(0,depth) * 8.1;
  // Sample the printed grain over the pixel footprint so that the hatching
  // reads as a plane of the throat instead of isolated beard-like speckles.
  const lum = (sampleStudy(sx-1.5,sy-1.4) + sampleStudy(sx+1.5,sy-1.4)
    + sampleStudy(sx-1.5,sy+1.4) + sampleStudy(sx+1.5,sy+1.4)) / 4;
  // Keep the chin's occlusion tight. The middle and front of the throat use
  // the drawing's actual halftones and hatching instead of solid face shadow.
  const value = lum < 150 ? clamp((lum-25)/125) ** 1.28 : 1+clamp((lum-150)/73);
  const edge = mix(.50,1,smooth(Math.min(x-left,right-x)/1.15));
  const tone = value * edge * mix(.24,1,smooth(depth/8));
  return [tone,alpha];
}

// Keep the atlas's original indexed palette, including its antialiased edges.
function inkIndex(tone, alpha) {
  if (alpha < .065) return 0;
  const [start, steps] = alpha > .88 ? [1,39] : alpha > .63 ? [80,8]
    : alpha > .38 ? [97,8] : alpha > .19 ? [114,8] : [131,8];
  return start + Math.round(clamp(tone,0,2)*steps);
}
function paintNeck({ p, preset, shape, col, seam, insets, pixels, stride, palette }, bodyType) {
  const rowOffset = (neckSourceY[bodyType] - neckTop) * scale;
  for (let row=firstRow;row<(neckTop+neckHeight)*scale;row++) {
    const y = (row+.5)/scale;
    const { left, right } = astartesNeckEdges(preset,shape,y,bodyType);
    const atCheek = smooth((y-126)/6);
    const coverage = smooth((y-120)/11);
    const leftLimit = jawRim(p,col,row,true).edge + insets[0]*coverage;
    const rightLimit = jawRim(p,col,row,false).edge - insets[1]*coverage;
    for (let i=0;i<300;i++) {
      const x = (i+.5)/scale;
      const sx = col*300+i, idx = (row+rowOffset)*stride+1+sx;
      const depth = y-seam[i], k = referencePixel(sx,row,p);
      const insideJaw = Math.min(insets[0] && coverage ? i-leftLimit : Infinity,
        insets[1] && coverage ? rightLimit-i : Infinity);
      const faceCoverage = clamp(insideJaw+1);
      const faceAlpha = jawBands.data[k+3]/255 * faceCoverage;
      if (depth <= 0 && faceAlpha === 1 && (atCheek === 0 || (x > left+1 && x < right-1))) {
        pixels[idx] = palette.get(jawBands.data.readUInt32BE(k));
        continue;
      }
      const [newTone,newAlpha] = neckSample(x,y,seam[i],left,right);
      const transition = smooth(depth/2);
      const oldTone = (1-linear(jawBands.data[k])+linear(jawBands.data[k+2]))
        * mix(.35,1,smooth(insideJaw/1.5));
      // Paint the jaw over the throat inside a single outer silhouette.
      // The curved shadow under the chin is an interior ink line; it must
      // never cut a notch or a transparent gap in either outer edge.
      const printedTone = mix(newTone,oldTone,faceAlpha*(1-transition));
      const originalCoverage = (1-atCheek)*faceAlpha;
      const neckCoverage = atCheek*newAlpha;
      const alpha = originalCoverage + neckCoverage;
      const tone = alpha ? (oldTone*originalCoverage + printedTone*neckCoverage)/alpha : 0;
      pixels[idx] = inkIndex(tone,alpha);
    }
  }
}

for (const [p, preset] of presets.entries()) {
  const file = path.join(root,'assets/avatar-comic/heads',`astartes-${preset}.png`);
  const base = PNG.sync.read(fs.readFileSync(file));
  const atlas = preparePortrait(base);
  for (const [col, shape] of shapes.entries()) {
    const seam = originalBoundary(getComicJawline('astartes',preset,shape),col,p);
    const insets = [true,false].map(fromLeft => {
      const widths = [134,136,138,140,142].map(y=>jawRim(p,col,Math.round(y*scale),fromLeft).inset);
      return widths.sort((a,b)=>a-b)[2];
    });
    for (const bodyType of Object.keys(neckSourceY)) {
      paintNeck({ p, preset, shape, col, seam, insets, ...atlas }, bodyType);
    }
  }
  savePortrait(file, base, atlas.pixels);
}
