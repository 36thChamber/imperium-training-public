// Package the generated paired sprites and register the painted inner collar lip.
// The manifest preserves the original prompts and source paths for reproduction.
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');
const manifest = JSON.parse(fs.readFileSync('references/avatar-quadrinho/power-armours.json', 'utf8'));
const output = 'assets/avatar-comic/equipment';

function crop(image, x0, y0, width, height) {
  const result = new PNG({ width, height });
  PNG.bitblt(image, result, x0, y0, width, height, 0, 0);
  return result;
}

function bounds(image, x0, x1) {
  let left = x1, top = image.height, right = x0, bottom = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = x0; x < x1; x++) {
      if (image.data[(y * image.width + x) * 4 + 3] < 32) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

function resize(image, width) {
  const height = Math.round(image.height * width / image.width);
  const result = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = Math.max(0, (x + 0.5) * image.width / width - 0.5);
      const sy = Math.max(0, (y + 0.5) * image.height / height - 0.5);
      const ix = Math.floor(sx), iy = Math.floor(sy), fx = sx - ix, fy = sy - iy;
      const samples = [[ix, iy, (1 - fx) * (1 - fy)], [ix + 1, iy, fx * (1 - fy)],
        [ix, iy + 1, (1 - fx) * fy], [ix + 1, iy + 1, fx * fy]];
      const rgba = [0, 0, 0, 0];
      for (const [px, py, weight] of samples) {
        const at = (Math.min(py, image.height - 1) * image.width + Math.min(px, image.width - 1)) * 4;
        const alpha = image.data[at + 3];
        rgba[3] += weight * alpha;
        for (let c = 0; c < 3; c++) rgba[c] += weight * alpha * image.data[at + c];
      }
      const at = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) result.data[at + c] = rgba[3] ? Math.round(rgba[c] / rgba[3]) : 0;
      result.data[at + 3] = Math.round(rgba[3]);
    }
  }
  return result;
}

function collar(spec) {
  // Inner lip anchors measured in the original generated sprite, in pixels.
  const [left, right, rimY, bottom] = spec.collarEllipse;
  const center = (left + right) / 2;
  const scale = (spec.socketWidth ?? 132) / (right - left);
  const tx = x => +(200 + (x - center) * scale).toFixed(2);
  const ty = y => +(245 + (y - bottom) * scale).toFixed(2);
  const radius = (right - left) / 2, depth = bottom - rimY;
  const edge = `M${tx(left)} ${ty(rimY)} C${tx(left)} ${ty(rimY + depth * 0.5523)} ${tx(center - radius * 0.5523)} 245 200 245 C${tx(center + radius * 0.5523)} 245 ${tx(right)} ${ty(rimY + depth * 0.5523)} ${tx(right)} ${ty(rimY)}`;
  return { x: tx(0), y: ty(0), scale,
    collar: { left: { x: tx(left), y: ty(rimY) }, mid: { x: 200, y: 245 },
      right: { x: tx(right), y: ty(rimY) }, edge } };
}
const entries = [];
for (const spec of manifest.assets) {
  const source = PNG.sync.read(fs.readFileSync(spec.source));
  let split = spec.split;
  if (!split) {
    let minimum = Infinity;
    for (let x = Math.round(source.width * 0.68); x < source.width * 0.77; x++) {
      let count = 0;
      for (let y = 0; y < source.height; y++) count += source.data[(y * source.width + x) * 4 + 3] > 32 ? 1 : 0;
      if (count < minimum) { minimum = count; split = x; }
    }
    if (minimum > 0) throw Error('Overlapping sprite silhouettes in ' + spec.id);
  }
  const bodyBounds = bounds(source, 0, split);
  const helmBounds = bounds(source, split, source.width);
  const fit = collar(spec);
  const body = crop(source, bodyBounds.x, bodyBounds.y, bodyBounds.width, bodyBounds.height);
  const helm = crop(source, helmBounds.x, helmBounds.y, helmBounds.width, helmBounds.height);
  fs.writeFileSync(path.join(output, spec.id + '.png'), PNG.sync.write(resize(body, 800)));
  fs.writeFileSync(path.join(output, 'helm-' + spec.id + '.png'), PNG.sync.write(resize(helm, 280)));
  const bodyRegistration = { x: +(fit.x + bodyBounds.x * fit.scale).toFixed(2),
    y: +(fit.y + bodyBounds.y * fit.scale).toFixed(2),
    width: +(bodyBounds.width * fit.scale).toFixed(2), height: +(bodyBounds.height * fit.scale).toFixed(2) };
  const helmWidth = spec.helmetWidth ?? 145;
  const helmHeight = +(helmWidth * helm.height / helm.width).toFixed(2);
  entries.push(`  ${spec.id}: {\n    body: { source: require('../../assets/avatar-comic/equipment/${spec.id}.png'), bounds: ${JSON.stringify(bodyRegistration)} },\n    collar: ${JSON.stringify(fit.collar)},\n    helmet: { source: require('../../assets/avatar-comic/equipment/helm-${spec.id}.png'), bounds: ${JSON.stringify({ x: 200 - helmWidth / 2, y: 251 - helmHeight, width: helmWidth, height: helmHeight })} },\n    headScale: ${spec.headScale ?? 1},\n  },`);
}
fs.writeFileSync('src/components/additionalComicEquipment.ts',
  `// Generated by scripts/prepare-power-armour.cjs from the painted collar cavities.\nimport type { ComicGear } from './ComicEquipment';\n\nexport const additionalComicEquipment: Record<string, ComicGear> = {\n${entries.join('\n')}\n};\n`);
