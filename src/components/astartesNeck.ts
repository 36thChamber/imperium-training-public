import type { BodyType, FacePreset, FaceShape } from '../avatarOptions';

// Left and right ink edges below each earlobe, measured on the original face
// at y=130–135, before the jaw turns toward the chin (portrait units).
type CheekEdges = readonly [left: number, right: number];
const cheeks = {
  european:           { square: [41.3,161.3], oval: [52.7,149.3], round: [39.3,164.0] },
  eastAsian:          { square: [42.7,158.7], oval: [54.0,147.3], round: [40.7,161.3] },
  african:            { square: [41.3,162.0], oval: [52.0,150.0], round: [38.7,164.0] },
  southAsian:         { square: [42.0,154.7], oval: [53.3,144.0], round: [40.0,160.7] },
  middleEastern:      { square: [42.7,159.3], oval: [53.3,148.0], round: [40.7,161.3] },
  indigenousAmerican: { square: [40.0,162.0], oval: [52.0,150.0], round: [38.0,164.0] },
} as const satisfies Record<FacePreset, Record<FaceShape, CheekEdges>>;

// All builds meet exactly the same cheek at y=132. The build changes the
// inclination of that straight edge, reaching its target width at y=170.
const throatWidth = { slender: 0.84, regular: 1, broad: 1.16 } satisfies Record<BodyType, number>;

export function astartesNeckEdges(preset: FacePreset, shape: FaceShape, y: number, bodyType: BodyType = 'regular') {
  const [left, right] = cheeks[preset][shape];
  const cheekWidth = right - left;
  const mediumWidth = Math.max(108.4, cheekWidth);
  const distance = (y - 132) / (170 - 132);
  const expansion = (mediumWidth - cheekWidth) / 2 * distance
    + mediumWidth / 2 * (throatWidth[bodyType] - 1) * Math.max(0, distance);
  return { left: left - expansion, right: right + expansion };
}

export function astartesNeckPath(preset: FacePreset, shape: FaceShape, bodyType: BodyType = 'regular') {
  const top = astartesNeckEdges(preset, shape, 120, bodyType);
  const cheek = astartesNeckEdges(preset, shape, 132, bodyType);
  const bottom = astartesNeckEdges(preset, shape, 218, bodyType);
  return `M${top.left} 120 L${cheek.left} 132 L${bottom.left} 218 H${bottom.right} L${cheek.right} 132 L${top.right} 120 Z`;
}

export function astartesBeardClip(preset: FacePreset, shape: FaceShape, bodyType: BodyType) {
  const cheek = astartesNeckEdges(preset, shape, 132, bodyType);
  const bottom = astartesNeckEdges(preset, shape, 218, bodyType);
  return `M0 80 H200 V120 L${cheek.right} 132 L${bottom.right} 218 H${bottom.left} L${cheek.left} 132 L0 120 Z`;
}
