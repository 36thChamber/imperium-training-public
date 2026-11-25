const fs = require('node:fs');
const { PNG } = require('pngjs');
const manifest = JSON.parse(fs.readFileSync('references/avatar-quadrinho/armour-v3.json', 'utf8'));

function trim(image) {
  let left = image.width, right = 0, top = image.height, bottom = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (image.data[(y * image.width + x) * 4 + 3] < 24) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  if (right <= left || bottom <= top) throw Error('Empty sprite');
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

function packageSprite(image, width, destination) {
  const bounds = trim(image);
  const height = Math.round(bounds.height * width / bounds.width);
  const result = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = bounds.x + Math.max(0, (x + 0.5) * bounds.width / width - 0.5);
      const sy = bounds.y + Math.max(0, (y + 0.5) * bounds.height / height - 0.5);
      const ix = Math.floor(sx), iy = Math.floor(sy), dx = sx - ix, dy = sy - iy;
      const samples = [[ix, iy, (1 - dx) * (1 - dy)], [ix + 1, iy, dx * (1 - dy)],
        [ix, iy + 1, (1 - dx) * dy], [ix + 1, iy + 1, dx * dy]];
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
  fs.writeFileSync(destination, PNG.sync.write(result));
  return bounds;
}

function cavity(image, spec) {
  if (spec.collarEllipse) {
    const [left, right, rimY, bottom] = spec.collarEllipse;
    const center = (left + right) / 2, radius = (right - left) / 2;
    const pixels = [];
    for (let x = left; x <= right; x++) {
      const y = rimY + (bottom - rimY) * Math.sqrt(Math.max(0, 1 - ((x - center) / radius) ** 2));
      pixels.push([x, Math.round(y)]);
    }
    return { left, right, bottom, pixels };
  }
  const { width, height, data } = image;
  const minX = Math.round(width * 0.23), maxX = Math.round(width * 0.78);
  const minY = 0, maxY = Math.round(height * 0.36);
  for (const threshold of [12, 24, 38]) {
    const seen = new Uint8Array(width * height), regions = [];
    for (let y = minY; y < maxY; y++) {
      for (let x = minX; x < maxX; x++) {
        const start = y * width + x;
        if (seen[start]) continue;
        const queue = [start], pixels = [];
        seen[start] = 1;
        let left = maxX, right = minX, top = maxY, bottom = minY;
        for (let i = 0; i < queue.length; i++) {
          const p = queue[i], px = p % width, py = Math.floor(p / width), at = p * 4;
          if (px < minX || px >= maxX || py < minY || py >= maxY || data[at + 3] < 200 ||
            Math.max(data[at], data[at + 1], data[at + 2]) > threshold) continue;
          pixels.push([px, py]);
          left = Math.min(left, px); right = Math.max(right, px);
          top = Math.min(top, py); bottom = Math.max(bottom, py);
          for (const next of [p - 1, p + 1, p - width, p + width]) {
            if (!seen[next]) { seen[next] = 1; queue.push(next); }
          }
        }
        if (pixels.length > 1000 && left > minX && right < maxX - 1 && top > minY && bottom < maxY - 1 &&
          right - left > width * 0.18 && right - left > (bottom - top) * 2.4) {
          regions.push({ pixels, left, right, top, bottom });
        }
      }
    }
    regions.sort((a, b) => b.pixels.length - a.pixels.length);
    if (regions.length) return regions[0];
  }
  throw Error('Measure inner collar anchors for ' + spec.id);
}

fs.mkdirSync('assets/avatar-comic/equipment-v3', { recursive: true });
fs.mkdirSync('assets/avatar-comic/emblems', { recursive: true });
for (const symbol of manifest.symbols) {
  const source = PNG.sync.read(fs.readFileSync(symbol.source));
  packageSprite(source, 480, `assets/avatar-comic/emblems/${symbol.id}.png`);
}

const registrations = [];
for (const spec of manifest.armours) {
  const source = PNG.sync.read(fs.readFileSync(spec.source));
  const hole = cavity(source, spec);
  const scale = (spec.socketWidth ?? 132) / (hole.right - hole.left);
  const center = (hole.left + hole.right) / 2;
  const tx = x => +(200 + (x - center) * scale).toFixed(2);
  const ty = y => +(245 + (y - hole.bottom) * scale).toFixed(2);
  const rows = new Map();
  for (const [x, y] of hole.pixels) rows.set(x, Math.max(rows.get(x) ?? 0, y));
  const xs = [...rows.keys()].sort((a, b) => a - b).filter((x, i, all) => i % 6 === 0 || i === all.length - 1);
  const edge = xs.map((x, i) => `${i ? 'L' : 'M'}${tx(x)} ${ty(rows.get(x))}`).join(' ');
  const crop = packageSprite(source, 800, `assets/avatar-comic/equipment-v3/${spec.id}.png`);
  const bounds = { x: tx(crop.x), y: ty(crop.y), width: +(crop.width * scale).toFixed(2), height: +(crop.height * scale).toFixed(2) };
  const collar = { left: { x: tx(hole.left), y: ty(rows.get(hole.left)) }, mid: { x: 200, y: 245 },
    right: { x: tx(hole.right), y: ty(rows.get(hole.right)) }, edge };
  const symbol = spec.emblem ?? { x: center - (hole.right - hole.left) * 0.46,
    y: hole.bottom + (hole.right - hole.left) * 0.30,
    width: (hole.right - hole.left) * 0.92, height: (hole.right - hole.left) * 0.44 };
  const aquila = { x: tx(symbol.x), y: ty(symbol.y), width: +(symbol.width * scale).toFixed(2), height: +(symbol.height * scale).toFixed(2) };
  const hoodOpening = spec.hoodOpening
    ? 'M' + spec.hoodOpening.map(([x, y]) => `${tx(x)} ${ty(y)}`).join(' L') + ' Z'
    : undefined;
  let helmetRegistration = '';
  if (spec.helmet) {
    const source = PNG.sync.read(fs.readFileSync(spec.helmet.source));
    const crop = packageSprite(source, 280, `assets/avatar-comic/equipment-v3/helm-${spec.id}.png`);
    const height = +(145 * crop.height / crop.width).toFixed(2);
    helmetRegistration = `\n    helmet: { source: require('../../assets/avatar-comic/equipment-v3/helm-${spec.id}.png'), bounds: ${JSON.stringify({ x: 127.5, y: 251 - height, width: 145, height })} },`;
  }
  registrations.push(`  ${spec.id}: {\n    body: { source: require('../../assets/avatar-comic/equipment-v3/${spec.id}.png'), bounds: ${JSON.stringify(bounds)} },\n    collar: ${JSON.stringify(collar)},\n    aquila: ${JSON.stringify(aquila)},${helmetRegistration}\n    hoodOpening: ${JSON.stringify(hoodOpening) ?? 'undefined'},\n    headOffsetY: ${spec.headOffsetY ?? 0},\n  },`);
  console.log(spec.id, 'neck', hole.left, hole.right, hole.bottom, 'body', bounds.width, bounds.height);
}
fs.writeFileSync('src/components/revisedComicEquipment.ts',
  `// Generated by scripts/prepare-comic-equipment-v3.cjs from the inner collar lips.\nimport type { ComicGear } from './ComicEquipment';\n\nexport const revisedComicEquipment: Partial<Record<string, Partial<ComicGear>>> = {\n${registrations.join('\n')}\n};\n`);
