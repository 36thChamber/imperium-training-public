import type { BodyType } from '../avatarOptions';

const regular = 'M52 149 Q61 158 67 174 Q69.5 184 67.5 193 Q65 206 51 217 H149 Q135 206 132.5 193 Q130.5 184 133 174 Q139 158 148 149 Z';
const atCollar = { slender: 0.88, regular: 1, broad: 1.12 };

// The cheek and chin retain their original registration. Width changes begin
// below the lowest chin landmark and settle before the front of the collar.
export function sororitasNeckScale(bodyType: BodyType, y: number) {
  const t = Math.max(0, Math.min(1, (y-160)/22));
  return 1 + (atCollar[bodyType]-1) * t*t*(3-2*t);
}

// The registered half-widths of the regular printed throat. A single outline
// serves the six faces: it is conservatively inset at y149 where chins differ.
const widths = [[149,43], [156,41.5], [160,39], [174,33], [185,31.5], [193,32.5], [205,38], [217,49]] as const;

function fittedPath(bodyType: BodyType) {
  const left: string[] = [], right: string[] = [];
  const add = (y: number, half: number) => {
    const radius = half * sororitasNeckScale(bodyType, y);
    left.push(`${(100-radius).toFixed(3)} ${y}`);
    right.push(`${(100+radius).toFixed(3)} ${y}`);
  };
  for (let i=1; i<widths.length; i++) {
    const [top, from] = widths[i-1], [bottom, to] = widths[i];
    for (let y=top; y<bottom; y+=2) {
      add(y, from + (to-from)*(y-top)/(bottom-top));
    }
  }
  add(217, 49);
  return 'M' + [...left, ...right.reverse()].join(' L') + ' Z';
}

const paths = { slender: fittedPath('slender'), regular, broad: fittedPath('broad') };

export function sororitasNeckPath(bodyType: BodyType = 'regular') {
  return paths[bodyType];
}
