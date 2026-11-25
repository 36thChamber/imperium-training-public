import type { ImageSourcePropType } from 'react-native';
import type { Faction } from './domain';
import type { BeardStyle, FacePreset, FaceShape, HairStyle } from './avatarOptions';

export type AvatarPattern = 'scout' | 'tacticus' | 'mk3' | 'terminator' | 'novice' | 'sororitas' | 'celestian';
export type AvatarFace = FaceShape;
export type AvatarHairStyle = HairStyle;

export type SpriteRect = { x: number; y: number; width: number; height: number };
export type SpriteAtlas = { source: ImageSourcePropType; width: number; height: number };
export type AvatarSprite = { atlas: SpriteAtlas; frame: SpriteRect; target: SpriteRect; opacity?: number };
export type AvatarSprites = {
  body: AvatarSprite;
  face: AvatarSprite;
  hair?: AvatarSprite;
  beard?: AvatarSprite;
  helmet?: AvatarSprite;
  collarY: number;
  collarPath: string;
  skinNeutral: string;
};

/**
 * Runtime atlas coordinates, not destructive PNG crops. Each atlas is scaled into
 * this documented coordinate system; frame coordinates can be tuned after art QA.
 * Source files are generated raster artwork, bundled locally for offline iOS use.
 */
export const AVATAR_VIEWBOX = { width: 512, height: 640 } as const;

export const AVATAR_ATLASES = {
  armour: {
    source: require('../assets/avatar-realistic/armour-atlas.png'),
    width: 1586,
    height: 992,
  },
  faceMale: {
    source: require('../assets/avatar-realistic/face-male-v2.png'),
    width: 1374,
    height: 1145,
  },
  faceFemale: {
    source: require('../assets/avatar-realistic/face-female-v2.png'),
    width: 1374,
    height: 1145,
  },
  hair: {
    source: require('../assets/avatar-realistic/hair-v2.png'),
    width: 1374,
    height: 1145,
  },
  beard: {
    source: require('../assets/avatar-realistic/beard-v2.png'),
    width: 1374,
    height: 1145,
  },
  helmet: {
    source: require('../assets/avatar-realistic/helmet-atlas.png'),
    width: 1122,
    height: 1402,
  },
} satisfies Record<string, SpriteAtlas>;

const fullBody: SpriteRect = { x: 0, y: 0, width: 512, height: 640 };
const standardHead: SpriteRect = { x: 181, y: 36, width: 150, height: 188 };

type BodyEntry = {
  column: number;
  row: number;
  head: SpriteRect;
  collarY: number;
  helmet?: { column: number; target: SpriteRect };
};

/** The source order is a production contract with the generated asset sheets. */
export const ARMOUR_SPRITES: Record<AvatarPattern | 'canoness', BodyEntry> = {
  scout: { column: 0, row: 0, head: { ...standardHead }, collarY: 198 },
  tacticus: { column: 1, row: 0, head: { ...standardHead }, collarY: 194, helmet: { column: 0, target: { x: 184, y: 46, width: 144, height: 180 } } },
  mk3: { column: 2, row: 0, head: { ...standardHead }, collarY: 194, helmet: { column: 1, target: { x: 184, y: 46, width: 144, height: 180 } } },
  terminator: { column: 3, row: 0, head: { ...standardHead }, collarY: 196, helmet: { column: 2, target: { x: 185, y: 50, width: 142, height: 177 } } },
  novice: { column: 0, row: 1, head: { ...standardHead, y: 30 }, collarY: 194 },
  sororitas: { column: 1, row: 1, head: { ...standardHead, y: 26 }, collarY: 190, helmet: { column: 3, target: { x: 191, y: 53, width: 130, height: 163 } } },
  celestian: { column: 2, row: 1, head: { ...standardHead, y: 26 }, collarY: 188, helmet: { column: 3, target: { x: 191, y: 51, width: 130, height: 163 } } },
  canoness: { column: 3, row: 1, head: { ...standardHead, y: 10 }, collarY: 160, helmet: { column: 3, target: { x: 191, y: 23, width: 130, height: 163 } } },
};

export const HAIR_COLOR_BASE = '#75685D';
export const BEARD_COLOR_BASE = '#493F37';

export function getAvatarSprites({ faction, pattern, armourId, face, facePreset = 'european', hairStyle, beardStyle = 'none', helmet }: {
  faction: Faction;
  pattern: AvatarPattern;
  armourId?: string;
  face: AvatarFace;
  facePreset?: FacePreset;
  hairStyle: AvatarHairStyle;
  beardStyle?: BeardStyle;
  helmet: boolean;
}): AvatarSprites {
  // A separate Canoness body gives its earned mantle a visible identity while
  // retaining the existing domain's shared "celestian" renderer pattern.
  const bodyKey = faction === 'sororitas' && pattern === 'celestian' && armourId === 'canoness' ? 'canoness' : pattern;
  const entry = ARMOUR_SPRITES[bodyKey];
  const genderRow = faction === 'sororitas' ? 1 : 0;
  const faceAtlas = faction === 'sororitas' ? AVATAR_ATLASES.faceFemale : AVATAR_ATLASES.faceMale;
  const faceIndex = { european: 0, eastAsian: 1, african: 2, southAsian: 3, middleEastern: 4, indigenousAmerican: 5 }[facePreset];
  const hairColumn = { short: 0, shaved: 0, bob: 1, curly: 2 }[hairStyle];
  const frame = (atlas: SpriteAtlas, columns: number, rows: number, column: number, row: number): SpriteRect => ({
    x: column * atlas.width / columns,
    y: row * atlas.height / rows,
    width: atlas.width / columns,
    height: atlas.height / rows,
  });
  const shapeScale = face === 'oval' ? 0.96 : 1.035;
  const head: SpriteRect = { ...entry.head, x: 256 - entry.head.width * shapeScale / 2, width: entry.head.width * shapeScale };
  const hairWidth = (hairStyle === 'short' ? 116 : 125) * shapeScale;
  const hairTarget: SpriteRect = { x: 256 - hairWidth / 2, y: entry.head.y - (genderRow ? 10 : 18), width: hairWidth, height: hairStyle === 'short' ? 145 : 156 };
  const hairFrame = frame(AVATAR_ATLASES.hair, 3, 2, hairColumn, genderRow);
  if (genderRow) {
    // The middle female cut crosses the nominal grid gutter. Trim each sprite at
    // its own transparent gap, keeping its original scale and head registration.
    const sourceX = hairStyle === 'bob' ? 432 : hairStyle === 'curly' ? 922 : 0;
    const sourceWidth = hairStyle === 'bob' ? 490 : hairStyle === 'curly' ? 452 : 432;
    const scale = hairTarget.width / hairFrame.width;
    hairTarget.x += (sourceX - hairFrame.x) * scale;
    hairTarget.width = sourceWidth * scale;
    hairFrame.x = sourceX;
    hairFrame.width = sourceWidth;
  }
  const collarHalfWidth = pattern === 'novice' ? 43 : 56;
  const beardIndex = { none: 0, stubble: 0, short: 1, full: 2, goatee: 3, moustache: 4 }[beardStyle];
  const mouthPositions = genderRow ? [333, 338, 337, 324, 332, 330] : [345, 352, 350, 327, 330, 330];
  const skinNeutrals = genderRow
    ? ['#C8947E', '#C79988', '#B6856C', '#C5927C', '#CDA18C', '#C7957E']
    : ['#B97D62', '#C79980', '#A17562', '#BC8D78', '#CE9F86', '#C3957E'];
  const beardWidth = (genderRow ? 110 : 116) * shapeScale;
  const beardHeight = beardStyle === 'full' ? 145 : genderRow ? 110 : 120;
  const beardFrame = frame(AVATAR_ATLASES.beard, 3, 2, beardIndex % 3, Math.floor(beardIndex / 3));
  const beardTarget: SpriteRect = {
    x: 256 - beardWidth / 2,
    y: head.y + mouthPositions[faceIndex] * head.height / 572.5 - 299 * beardHeight / 572.5,
    width: beardWidth,
    height: beardHeight,
  };
  if (beardStyle === 'goatee') {
    // The atlas has detached sideburns in this cell; keep only the central goatee.
    const scale = beardTarget.width / beardFrame.width;
    beardFrame.x += 100;
    beardFrame.width = 260;
    beardTarget.x += 100 * scale;
    beardTarget.width = 260 * scale;
  }
  return {
    body: { atlas: AVATAR_ATLASES.armour, frame: frame(AVATAR_ATLASES.armour, 4, 2, entry.column, entry.row), target: fullBody },
    face: { atlas: faceAtlas, frame: frame(faceAtlas, 3, 2, faceIndex % 3, Math.floor(faceIndex / 3)), target: head },
    hair: hairStyle === 'shaved' ? undefined : { atlas: AVATAR_ATLASES.hair, frame: hairFrame, target: hairTarget },
    beard: beardStyle === 'none' ? undefined : { atlas: AVATAR_ATLASES.beard, frame: beardFrame, target: beardTarget, opacity: beardStyle === 'stubble' ? 0.4 : 1 },
    collarY: entry.collarY,
    skinNeutral: skinNeutrals[faceIndex],
    collarPath: `M0 ${entry.collarY} H${256 - collarHalfWidth} Q256 ${entry.collarY + 28} ${256 + collarHalfWidth} ${entry.collarY} H512 V640 H0 Z`,
    helmet: helmet && entry.helmet ? {
      atlas: AVATAR_ATLASES.helmet,
      frame: frame(AVATAR_ATLASES.helmet, 2, 2, entry.helmet.column % 2, Math.floor(entry.helmet.column / 2)),
      target: entry.helmet.target,
    } : undefined,
  };
}

/** SVG filters and iOS CoreImage both process these matrices in linear light. */
export function materialColorMatrix(color: string | undefined, neutral: string): number[] {
  const linear = (channel: number) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  const parse = (value: string) => [1, 3, 5].map(offset => linear(parseInt(value.slice(offset, offset + 2), 16) / 255));
  const safeColor = color && /^#[\da-f]{6}$/i.test(color) ? color : neutral;
  const target = parse(safeColor);
  const base = parse(neutral);
  const gain = target.map((channel, index) => Math.max(0, Math.min(32, channel / Math.max(0.001, base[index]))));
  return [
    gain[0], 0, 0, 0, 0,
    0, gain[1], 0, 0, 0,
    0, 0, gain[2], 0, 0,
    0, 0, 0, 1, 0,
  ];
}
