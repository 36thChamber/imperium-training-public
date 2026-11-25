/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { PNG } = require('pngjs');
const { FACE_PRESETS, FACE_SHAPES } = require('../src/avatarOptions.ts');
const { astartesNeckEdges } = require('../src/components/astartesNeck.ts');

// Alternate body tiles carry local neck rows 120–218 at 1.5 pixels per unit.
const rowOffset = { slender: 591 - 180, regular: 0, broad: 738 - 180 };
const builds = ['slender', 'regular', 'broad'];

function atlas(section, faction, preset) {
  const file = path.join(__dirname, '../assets/avatar-comic', section, `${faction}-${preset}.png`);
  return PNG.sync.read(fs.readFileSync(file));
}

function opaqueSpan(image, column, row) {
  const covered = [];
  for (let x = 0; x < 300; x++) {
    const pixel = row * image.width + column * 300 + x;
    if (image.data[pixel * 4 + 3] >= 128) covered.push(x);
  }
  assert.ok(covered.length);
  const left = covered[0], right = covered.at(-1) + 1;
  assert.equal(covered.length, right - left, 'gap between the cheek and the throat');
  return { left, right };
}

test('each Astartes build keeps straight painted sides from the same cheeks to the collar', () => {
  for (const { id: preset } of FACE_PRESETS) {
    const image = atlas('heads', 'astartes', preset);
    const beards = atlas('beards', 'astartes', preset);
    assert.deepEqual([image.width, image.height], [900, 885]);
    for (const [column, { id: shape }] of FACE_SHAPES.entries()) {
      const first = 198, last = 283; // From just under the earlobe to the lip of the collar.
      const cheek = astartesNeckEdges(preset, shape, 132, 'regular');
      for (const build of builds) {
        const offset = rowOffset[build];
        const top = opaqueSpan(image, column, first+offset), bottom = opaqueSpan(image, column, last+offset);
        assert.deepEqual(astartesNeckEdges(preset, shape, 132, build), cheek, 'build moved the cheek anchor');
        let previous = opaqueSpan(image, column, first-8+offset);
        for (let row = first-7; row <= first; row++) {
          const next = opaqueSpan(image, column, row+offset);
          assert.ok(Math.abs(next.left-previous.left) <= 2 && Math.abs(next.right-previous.right) <= 2,
            'step where the cheek meets the neck');
          previous = next;
        }
        for (let row = first; row <= last; row++) {
          const span = opaqueSpan(image, column, row+offset);
          const shadow = astartesNeckEdges(preset, shape, (row + .5) / 1.5, build);
          for (const side of ['left','right']) {
            const line = top[side] + (bottom[side] - top[side]) * (row-first)/(last-first);
            assert.ok(Math.abs(span[side] - line) <= 1, `${preset}/${shape}/${build}: bent ${side} edge at row ${row}`);
            assert.ok(Math.abs(span[side] - shadow[side]*1.5) <= 1, 'shadow extends past the ink');
          }
          // Beard art is registered to the original medium jaw. The renderer
          // additionally clips the whiskers where the slender neck narrows.
          if (build === 'regular') for (let style = 0; style < 4; style++) {
            const beardRow = row - 120 + style*180; // The beard tile starts at local y=80.
            for (let x = 0; x < 252; x++) {
              const alpha = beards.data[4*(beardRow*beards.width + column*252 + x)+3];
              if (alpha >= 128) assert.ok(x+24 >= span.left-1 && x+24 < span.right+1, 'beard introduces a notch');
            }
          }
        }
      }
    }
  }
});

test('the painted throat widens from slender through medium to broad on every face in both campaigns', () => {
  for (const faction of ['astartes', 'sororitas']) {
    for (const { id: preset } of FACE_PRESETS) {
      const image = atlas('heads', faction, preset);
      assert.deepEqual([image.width, image.height], [900, 885]);
      for (const [column, { id: shape }] of FACE_SHAPES.entries()) {
        for (const y of [170, 185]) {
          const widths = builds.map(build => {
            const span = opaqueSpan(image, column, Math.floor(y*1.5) + rowOffset[build]);
            return span.right - span.left;
          });
          assert.ok(widths[0] < widths[1] && widths[1] < widths[2],
            `${faction}/${preset}/${shape}: widths at y=${y} are ${widths.join(', ')}`);
        }
      }
    }
  }
});
