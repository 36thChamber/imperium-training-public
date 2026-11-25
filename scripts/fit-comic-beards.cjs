// node scripts/fit-comic-beards.cjs [source.png]
// Register the three original ink drawings to the jaw in each portrait. Output
// stores ink / local colour / paper coverage in RGB, and edge coverage in alpha.
/* global __dirname */
require('tsx/cjs');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { Buffer } = require('node:buffer');
const { PNG } = require('pngjs');
const { getComicJawline } = require('./comicJawlines.ts');
const { astartesNeckEdges } = require('../src/components/astartesNeck.ts');
const { FACE_PRESETS } = require('../src/avatarOptions.ts');

const root = path.resolve(__dirname, '..');
const source = PNG.sync.read(fs.readFileSync(process.argv[2] || path.join(root, 'references/avatar-quadrinho/barbas-tinta.png')));
if (source.width !== 2172 || source.height !== 724) throw Error('Expected the registered 2172 × 724 beard sheet');
const out = path.join(root, 'assets/avatar-comic/beards');
const scale = 1.5, width = 252, height = 180;
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const mix = (a, b, t) => a + (b - a) * t;

// Each row gives y, left edge and right edge in the original ink drawing.
// Mapping the rows separately keeps the painted tufts while allowing the
// sideburns, cheeks, jaw corners and tip to move independently.
const sourceRows = {
  short: [[66,85,650],[185,85,650],[305,88,645],[338,94,642],[373,101,635],[438,145,601],[510,219,522],[558,317,421]],
  full: [[50,815,1363],[170,811,1366],[271,803,1365],[308,806,1366],[345,807,1368],[425,818,1351],[525,854,1324],[606,922,1277],[689,1039,1150]],
  goatee: [[363,1799,1844],[418,1716,1941],[481,1678,1969],[550,1683,1962],[610,1734,1911],[644,1792,1854]],
};

function targetRows(jaw, style) {
  const { sideburn, cheek, angle, lowerJaw, chin, mouth } = jaw;
  if (style === 'goatee') {
    const radius = Math.min(mouth.halfWidth * .84, (lowerJaw.right - lowerJaw.left) * .31);
    const center = (y, x, r) => [y, x - r, x + r];
    return [
      center(mouth.lowerLipY + 1, mouth.x, radius * .2),
      center(mouth.lowerLipY + 7, mouth.x, radius * .91),
      center(mix(mouth.lowerLipY, chin.y, .53), chin.x, radius),
      center(chin.y - 2, chin.x, radius * .8),
      center(chin.y + 5, chin.x, radius * .48),
      center(chin.y + 12, chin.x, radius * .18),
    ];
  }
  const full = style === 'full';
  const contact = (row, allowance = 0) => [row.y, row.left - allowance, row.right + allowance];
  const midway = (y, rowA, rowB) => {
    const t = (y - rowA.y) / (rowB.y - rowA.y);
    return [y, mix(rowA.left, rowB.left, t), mix(rowA.right, rowB.right, t)];
  };
  const common = [
    [sideburn.y - 3, sideburn.left + 1.6, sideburn.right - 1.6],
    midway(sideburn.y + 11, sideburn, cheek), contact(cheek, full ? 1.3 : .2),
    midway(mouth.lowerLipY + 3, cheek, angle), contact(angle, full ? 2 : .6),
  ];
  // After the jaw corner the long hair falls freely. A half-ellipse suspends
  // the tip below the chin, even when the jaw under the hair is very narrow.
  if (full) {
    const center = (angle.left + angle.right) / 2;
    const radius = (angle.right - angle.left) / 2 + 2;
    const depth = chin.y + 23 - angle.y;
    for (const t of [.26, .57, .8, .98]) {
      const x = mix(center, chin.x, t * .66), r = radius * Math.sqrt(1 - t * t);
      common.push([angle.y + t * depth, x - r, x + r]);
    }
    return common;
  }
  return [...common, contact(lowerJaw, 1.7),
    [chin.y, chin.x - 22, chin.x + 22],
    [chin.y + 5.5, chin.x - 10, chin.x + 10]];
}

// Monotone cubic through the registered widths. A change of slope at a jaw
// corner must not introduce a sudden bend in the painted hairs.
function interpolateRows(heights, rows, field, i, y) {
  const at = n => rows[n][field];
  const slope = n => (at(n + 1) - at(n)) / (heights[n + 1][0] - heights[n][0]);
  const tangent = n => {
    if (n === 0) return slope(0);
    if (n === rows.length - 1) return slope(n - 1);
    const a = slope(n - 1), b = slope(n);
    return a * b > 0 ? 2 * a * b / (a + b) : 0;
  };
  const dy = heights[i][0] - heights[i - 1][0], t = (y - heights[i - 1][0]) / dy;
  const u = 1 - t;
  return u*u*(1 + 2*t)*at(i - 1) + t*t*(3 - 2*t)*at(i)
    + dy*(t*u*u*tangent(i - 1) - t*t*u*tangent(i));
}

// Invert one horizontal section of the mesh using the registered mouth.
function rowSampler(target, art, centerX, sourceCenter, y) {
  const i = target.findIndex((row, index) => index > 0 && y <= row[0]);
  if (i < 0 || y < target[0][0]) return null;
  const left = interpolateRows(target, target, 1, i, y), right = interpolateRows(target, target, 2, i, y);
  const sy = interpolateRows(target, art, 0, i, y);
  const leftSlope = (sourceCenter - interpolateRows(target, art, 1, i, y)) / (centerX - left);
  const rightSlope = (interpolateRows(target, art, 2, i, y) - sourceCenter) / (right - centerX);
  return x => [sourceCenter + (x - centerX) * (x < centerX ? leftSlope : rightSlope), sy];
}

function sampleInk(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix + 1 >= source.width || iy + 1 >= source.height) return [0,0];
  let light = 0, alpha = 0;
  for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) {
    const k = ((iy + dy) * source.width + ix + dx) * 4;
    const w = (dx ? x - ix : 1 - x + ix) * (dy ? y - iy : 1 - y + iy) * source.data[k + 3] / 255;
    alpha += w;
    light += w * (source.data[k] * .35 + source.data[k + 1] * .52 + source.data[k + 2] * .13);
  }
  if (!alpha) return [0,0];
  const luma = light / alpha;
  return [luma <= 88 ? clamp((luma - 21) / 67) ** 1.65 : 1 + clamp((luma - 88) / 94), alpha];
}

const levels = 41, alphaLevels = 6;
const palette = [[0,0,0,0]];
const srgb = n => Math.round(255 * (n <= .0031308 ? 12.92 * n : 1.055 * n ** (1 / 2.4) - .055));
for (let a = 1; a <= alphaLevels; a++) for (let i = 0; i < levels; i++) {
  const tone = 2 * i / (levels - 1), ink = Math.max(0, 1 - tone), paper = Math.max(0, tone - 1);
  palette.push([srgb(ink), srgb(1 - ink - paper), srgb(paper), Math.round(255 * a / alphaLevels)]);
}
function indexFor(tone, alpha) {
  const a = Math.round(clamp(alpha) * alphaLevels);
  return a ? 1 + (a - 1) * levels + Math.round(clamp(tone / 2) * (levels - 1)) : 0;
}

function rasterBeard(jaw, style, neckEdges) {
  const cell = Buffer.alloc(width * height);
  const target = targetRows(jaw, style), art = sourceRows[style];
  const sourceCenter = { short: 370, full: 1088, goatee: 1823 }[style];
  const [boxLeft, boxRight] = { short: [70,665], full: [783,1388], goatee: [1660,1988] }[style];
  for (let j = 0; j < height; j++) {
    const y = 80 + (j + .5) / scale;
    const sampleRow = rowSampler(target, art, jaw.mouth.x, sourceCenter, y);
    if (!sampleRow) continue;
    const neck = neckEdges && neckEdges(y);
    for (let i = 0; i < width; i++) {
      const x = 16 + (i + .5) / scale, [sx, sy] = sampleRow(x);
      if (sx < boxLeft || sx > boxRight) continue;
      const [tone, alpha] = sampleInk(sx, sy);
      if (!alpha) continue;
      const [, rootDensity] = sampleInk(sx, sy - 12);
      // Feather outer whiskers into the same line as the skin below the
      // earlobe. The chin and any hair hanging over the collar stay free.
      const rim = neck ? clamp((Math.min(x-neck.left,neck.right-x)+.25) / 1.25) : 1;
      const coverage = mix(1, rim, clamp((y-120)/12));
      cell[j * width + i] = indexFor(tone, alpha * (.57 + .43 * rootDensity) * coverage);
    }
  }
  return cell;
}

// Seed tiny directional strokes only where the short beard grows AND the
// naked jaw is present. This keeps the shadow and neck clear below the chin.
function rasterStubble(jaw, short) {
  const cell = Buffer.alloc(width * height);
  const rows = [jaw.sideburn, jaw.cheek, jaw.angle, jaw.lowerJaw,
    { left: jaw.chin.x, right: jaw.chin.x, y: jaw.chin.y }];
  const skin = (x, y) => {
    const k = rows.findIndex((p, i) => i > 0 && y <= p.y);
    if (y < rows[0].y || k < 0) return false;
    const a = rows[k - 1], b = rows[k], t = (y - a.y) / (b.y - a.y);
    return x > mix(a.left, b.left, t) + .7 && x < mix(a.right, b.right, t) - .7;
  };
  let seed = 16657;
  const random = () => { seed = seed * 48271 % 2147483647; return seed / 2147483647; };
  for (let gridY = 93; gridY < jaw.chin.y; gridY += 3) for (let gridX = 27; gridX < 174; gridX += 3) {
    const x = gridX + random() * 2.8, y = gridY + random() * 2.8;
    const dx = (jaw.chin.x - x) * .023 + (random() - .5) * .68, dy = .85 + random() * 1.3;
    const radius = .26 + random() * .27, tone = .4 + .9 * random();
    const cx = Math.floor((x - 16) * scale), cy = Math.floor((y - 80) * scale);
    for (let j = cy - 1; j <= cy + 4; j++) for (let i = cx - 4; i <= cx + 4; i++) {
      const k = j * width + i;
      if (i < 0 || i >= width || !short[k]) continue;
      const px = 16 + (i + .5) / scale, py = 80 + (j + .5) / scale;
      if (!skin(px,py)) continue;
      const t = clamp(((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy));
      const distance = Math.hypot(px - x - t * dx, py - y - t * dy);
      const alpha = clamp((radius + .4 - distance) * scale) * .86;
      if (alpha > .09) cell[k] = indexFor(tone, alpha);
    }
  }
  return cell;
}

function pngChunk(type, bytes) {
  const payload = Buffer.concat([Buffer.from(type), bytes]), chunk = Buffer.alloc(payload.length + 8);
  chunk.writeUInt32BE(bytes.length); payload.copy(chunk, 4);
  chunk.writeUInt32BE(zlib.crc32(payload), chunk.length - 4);
  return chunk;
}
function writeAtlas(filename, columns) {
  const stride = width * columns.length + 1;
  // PNG filter 0 at the start of each row, followed by palette indices.
  const pixels = Buffer.alloc(stride * height * 4);
  columns.forEach((cells, col) => cells.forEach((cell, row) => {
    for (let y = 0; y < height; y++) cell.copy(pixels, (row * height + y) * stride + 1 + col * width, y * width, (y + 1) * width);
  }));
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width * 3, 0); header.writeUInt32BE(height * 4, 4); header[8] = 8; header[9] = 3;
  fs.writeFileSync(filename, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
    pngChunk('IHDR',header), pngChunk('PLTE',Buffer.from(palette.flatMap(p => p.slice(0,3)))),
    pngChunk('tRNS',Buffer.from(palette.map(p => p[3]))), pngChunk('IDAT',zlib.deflateSync(pixels, {level:9})),
    pngChunk('IEND',Buffer.alloc(0))]));
}

fs.mkdirSync(out, {recursive:true});
for (const faction of ['astartes', 'sororitas']) for (const { id: preset } of FACE_PRESETS) {
  const columns = ['square', 'oval', 'round'].map(shape => {
    const jaw = getComicJawline(faction, preset, shape);
    const neckEdges = faction === 'astartes' ? y => astartesNeckEdges(preset,shape,y) : null;
    const short = rasterBeard(jaw, 'short', neckEdges);
    return [rasterStubble(jaw, short), short, rasterBeard(jaw, 'full', neckEdges), rasterBeard(jaw, 'goatee', neckEdges)];
  });
  writeAtlas(path.join(out, faction + '-' + preset + '.png'), columns);
}
