import React from 'react';
import { Image } from 'react-native-svg';
import type { ImageSourcePropType } from 'react-native';
import type { Armour } from '../domain';
import { additionalComicEquipment } from './additionalComicEquipment';
import { revisedComicEquipment } from './revisedComicEquipment';
import { ComicAquila, type AquilaBounds } from './ComicAquila';
import type { AquilaStyle } from '../avatarOptions';

type Point = { x: number; y: number };
type Bounds = Point & { width: number; height: number };
type Layer = { source: ImageSourcePropType; bounds: Bounds };
type Collar = { left: Point; mid: Point; right: Point; edge: string };
export type ComicGear = { body: Layer; collar: Collar; helmet?: Layer; hoodOpening?: string; headOffsetY?: number; headScale?: number; aquila?: AquilaBounds };

// All registrations are in the final portrait's 400 × 440 coordinate system.
// The edge follows the *inside* of the inked rim, including each slit and step.
// Keeping it with the artwork lets the neck sit inside rather than over the lip.
const helmet = (source: ImageSourcePropType, width: number, height: number, base: number): Layer => ({
  source, bounds: { x: 200 - width / 2, y: base - height, width, height },
});
const sisterHelmet = helmet(require('../../assets/avatar-comic/equipment/helm-sororitas.png'), 139, 169, 250);

const equipment: Record<Armour['pattern'] | 'canoness', ComicGear> = {
  scout: {
    body: { source: require('../../assets/avatar-comic/equipment/scout.png'), bounds: { x: -30.4, y: 181.85, width: 460.8, height: 307.2 } },
    collar: {
      left: { x: 136.4, y: 223.55 }, mid: { x: 200, y: 245 }, right: { x: 263.3, y: 222.35 },
      edge: 'M136.4 223.55 C136.7 227.45 141.8 233.15 149.6 236.75 C161.6 242.45 178.4 245 200 245 C218.9 245 235.7 242.75 245.6 238.25 C256.1 233.75 263.3 228.35 263.3 222.35',
    },
  },
  tacticus: {
    body: { source: require('../../assets/avatar-comic/equipment-v3/tacticus.png'), bounds: { x: -37, y: 166.3, width: 472.8, height: 297.7 } },
    collar: {
      left: { x: 134, y: 214.4 }, mid: { x: 200, y: 245 }, right: { x: 267.8, y: 214.4 },
      edge: 'M134 214.4 Q134 218.3 144.8 222.3 C146 237.8 176 245 200 245 C230.6 245 254.6 238.5 256.4 222.9 Q267.8 219.7 267.8 214.4',
    },
    helmet: helmet(require('../../assets/avatar-comic/equipment/helm-tacticus.png'), 161, 174, 251),
  },
  mk3: {
    body: { source: require('../../assets/avatar-comic/equipment-v3/mk3.png'), bounds: { x: -28.6, y: 189.4, width: 444, height: 282.1 } },
    collar: {
      left: { x: 136.4, y: 210.2 }, mid: { x: 200, y: 245 }, right: { x: 268.4, y: 210.8 },
      edge: 'M136.4 210.2 C140 223.6 163.4 245 200 245 C233 244.3 261.8 227.6 268.4 210.8',
    },
    helmet: helmet(require('../../assets/avatar-comic/equipment/helm-mk3.png'), 161, 172, 251),
  },
  terminator: {
    body: { source: require('../../assets/avatar-comic/equipment-v3/terminator.png'), bounds: { x: -62.5, y: 101, width: 535.2, height: 368.1 } },
    hoodOpening: 'M115 222 L129 150 L149 142 L160 132 Q200 128 243 132 L255 142 L271 150 L289 222 V270 H115Z',
    collar: {
      left: { x: 144.2, y: 212.7 }, mid: { x: 200, y: 245 }, right: { x: 259.8, y: 212.7 },
      edge: 'M144.2 212.7 C141.5 224.2 150.4 236.5 170.1 241.2 C178.9 244.2 189.1 245 200 245 C228.6 245 249 238.8 257.1 226.5 Q260.5 221.1 259.8 212.7',
    },
    // Recessed into the armoured hood. The top of this helmet must clear its lintel.
    helmet: helmet(require('../../assets/avatar-comic/equipment/helm-terminator.png'), 127, 119, 251),
  },
  novice: {
    body: { source: require('../../assets/avatar-comic/equipment/novice.png'), bounds: { x: -8.4, y: 207.9, width: 389.9, height: 262.8 } },
    collar: {
      left: { x: 141.7, y: 226.8 }, mid: { x: 200, y: 245 }, right: { x: 252.9, y: 226.2 },
      edge: 'M141.7 226.8 Q142.4 238.2 192.6 245 L200 267.8 L207.4 245 Q243.6 238.7 252.9 226.2',
    },
  },
  sororitas: {
    body: { source: require('../../assets/avatar-comic/equipment-v3/sororitas.png'), bounds: { x: -2.3, y: 201.5, width: 408, height: 268 } },
    collar: {
      left: { x: 137.7, y: 221.2 }, mid: { x: 200, y: 245 }, right: { x: 262.3, y: 221.2 },
      edge: 'M137.7 221.2 Q137.7 227.6 168.5 231.7 L169.8 240.4 Q198 248.5 233.5 240.4 L235.5 231.7 Q259.6 227 262.3 221.2',
    },
    helmet: sisterHelmet,
  },
  celestian: {
    body: { source: require('../../assets/avatar-comic/equipment-v3/celestian.png'), bounds: { x: -0.8, y: 198.6, width: 381.6, height: 266.2 } },
    collar: {
      left: { x: 134.4, y: 221.8 }, mid: { x: 200, y: 245 }, right: { x: 263.7, y: 221.8 },
      edge: 'M134.4 221.8 Q135 229.9 161.7 236.4 L163.6 241.2 Q200 248.8 232.5 241.2 L234.5 235.8 Q258.5 228.8 263.7 221.8',
    },
    helmet: sisterHelmet,
  },
  canoness: {
    body: { source: require('../../assets/avatar-comic/equipment-v3/canoness.png'), bounds: { x: -5.7, y: 201.3, width: 409.4, height: 266.2 } },
    collar: {
      left: { x: 136.3, y: 223.4 }, mid: { x: 200, y: 245 }, right: { x: 261, y: 223.4 },
      edge: 'M136.3 223.4 Q139.7 230.4 165.2 235.8 L166.5 241.8 Q200 248.2 233.5 241.8 L235.5 235.3 Q258.3 229.3 261 223.4',
    },
    helmet: sisterHelmet,
  },
};

export function getComicGear(pattern: Armour['pattern'], armourId?: string): ComicGear {
  const key = armourId ?? pattern;
  const original = additionalComicEquipment[key] || equipment[key === 'canoness' ? 'canoness' : pattern];
  return { ...original, ...revisedComicEquipment[key] };
}

function InkLayer({ source, bounds }: Layer) {
  return <Image href={source} {...bounds} preserveAspectRatio="none" />;
}

export function ComicTorso({ gear, aquilaStyle }: { gear: ComicGear; aquilaStyle?: AquilaStyle }) {
  return <>
    <InkLayer {...gear.body} />
    {gear.aquila && <ComicAquila style={aquilaStyle} bounds={gear.aquila}/>}
  </>;
}

export function ComicHelmet({ gear }: { gear: ComicGear }) {
  return gear.helmet ? <InkLayer {...gear.helmet} /> : null;
}
