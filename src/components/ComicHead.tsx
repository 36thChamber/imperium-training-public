import React, { memo, useId } from 'react';
import { ClipPath, Defs, FeColorMatrix, FeGaussianBlur, Filter, G, Image, Path, Rect } from 'react-native-svg';
import type { AvatarConfig, Faction } from '../domain';
import { BEARDS, GROOMING, PORTRAITS } from './comicHeadArt';
import { astartesBeardClip, astartesNeckPath } from './astartesNeck';
import { neckHeight, neckSourceY, neckTop, portraitSheetHeight } from './neckAtlas';
import { sororitasNeckPath } from './sororitasNeck';

type HeadProps = Partial<AvatarConfig> & { faction: Faction };

// Follow the inked throat of each portrait sheet so the rim casts its shadow only on skin.
export function comicNeckPath(faction: Faction, preset: AvatarConfig['facePreset'] = 'european',
  face: AvatarConfig['face'] = 'square', bodyType: AvatarConfig['bodyType'] = 'regular') {
  return faction === 'astartes' ? astartesNeckPath(preset, face, bodyType) : sororitasNeckPath(bodyType);
}

const INK = '#191513';
const PAPER = '#F5CF9F';
const hexChannels = (hex: string) => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
const linearLight = (n: number) => {
  const value = n / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

// The raster channels encode the coverage of three printed colours in linear
// light. This keeps deep shadows in the ink colour even on ivory hair, and
// keeps highlights visible on dark skin without multiplying away the detail.
function inkMatrix(local: string, highlightAmount: number) {
  const color = hexChannels(/^#[\da-f]{6}$/i.test(local) ? local : '#B98158');
  const ink = hexChannels(INK);
  const paper = hexChannels(PAPER);
  return color.flatMap((channel, i) => [
    linearLight(ink[i]), linearLight(channel),
    linearLight(channel + (paper[i] - channel) * highlightAmount), 0, 0,
  ]).concat([0, 0, 0, 1, 0]);
}

const FRECKLES = [
  [49,94,.8],[53,97,1.3],[57,93,1],[60,99,.95],[65,94,1.25],[68,98,.8],[74,91,.7],[80,94,.7],
  [47,102,.9],[50,107,.7],[55,104,.7],[59,108,1.05],[64,103,.8],[71,100,.65],[77,97,.75],
  [87,94,.65],[93,91,.75],[97,95,1],[103,93,.7],[109,94,.9],[116,96,.7],
  [125,96,.9],[131,94,1.15],[135,98,.85],[140,94,1.3],[145,98,1],[150,95,.7],[153,101,.9],
  [121,100,.7],[127,104,1.05],[134,102,.9],[141,105,.75],[146,103,1.1],[151,107,.8],
].map(([x, y, size]) => `M${x} ${y}q${size} ${-size} ${size * 1.65} 0q0 ${size * 1.8} ${-size * 1.4} ${size}Z`).join(' ');

const WRINKLES = [
  'M44 78q6 2 11 1l-8 3z M44 85l10-2-7 5z M144 79l12-4-7 5z M146 84l10 3-9-1z',
  'M55 91q8 4 18 2-8 4-18-2z M126 92q10 1 17-4-5 6-17 4z',
  'M75 108q-5 6-7 17l2-1q0-6 5-16z M125 108q7 6 9 16l-3-3q-1-7-6-13z',
  'M69 48q9-5 19-2-12-1-19 2z M105 43q12-3 21 0l-15-1z M88 59l5-7-2 7z',
  'M60 107l5-2-6 5z M141 109l-5-3 5 5z M86 146q7 1 12 0l-8 2z',
].join(' ');

const MUSTACHE_FIT = {
  pencil: { x: 71, y: 113, width: 58, height: 7 },
  chevron: { x: 66, y: 109, width: 68, height: 13 },
  horseshoe: { x: 69, y: 109, width: 62, height: 36 },
};
const HAIR_FIT = {
  crop: { x: 19, y: -19, width: 161, height: 114 },
  pixie: { x: 15, y: -18, width: 166, height: 120 },
  bob: { x: 7, y: -10, width: 184, height: 173 },
  curly: { x: 7, y: -20, width: 186, height: 129 },
};
const FACE_COLUMN = { square: 0, oval: 1, round: 2 };
const BEARD_ROW = { stubble: 0, short: 1, full: 2, goatee: 3 };
const BEARD_FRAME = { x: 16, y: 80, width: 168, height: 120 };
// Tiny broken brush marks at the registered pupils keep eyes readable when
// both the skin value and the socket shadow are deep.
const CATCHLIGHT = 'M71.8 76.4q.5-1 1.6-.6l-.35 1.2-1.25.2z M127 76.1q.7-.8 1.6-.4l-.5 1.2-1.2.1z';

export const ComicHead = memo(function ComicHead({
  faction, facePreset = 'european', face = 'square', bodyType = 'regular', skin = '#C68D70',
  eyeShape = 'almond', mouthShape = 'balanced', complexion = 'smooth',
}: HeadProps) {
  const id = `portrait${useId().replace(/[^a-z\d]/gi, '')}`;
  const sheet = PORTRAITS[faction][facePreset];
  const x = -200 * FACE_COLUMN[face];
  const bands = [
    // The original face overlaps the strip's top edge to keep a filtered
    // neighbour from the atlas out of the visible chin on fractional scales.
    ...(bodyType === 'regular' ? [] : [{ name: 'neck', y: neckTop, height: neckHeight, sourceY: neckSourceY[bodyType] }]),
    { name: 'base', y: 0, height: bodyType === 'regular' ? 218 : neckTop+2, sourceY: 0 },
    ...(eyeShape === 'almond' ? [] : [{ name: 'eyes', y: 54, height: 47, sourceY: eyeShape === 'round' ? 220 : 268 }]),
    ...(mouthShape === 'balanced' ? [] : [{ name: 'mouth', y: 102, height: 38, sourceY: mouthShape === 'thin' ? 316 : 355 }]),
  ];
  const url = (key: string) => `url(#${id}${key})`;
  return <G>
    <Defs>
      {bands.map(band => <ClipPath key={band.name} id={id + band.name}>
        <Rect x={0} y={band.y} width={200} height={band.height}/>
      </ClipPath>)}
      <Filter id={id + 'skinInk'} filterUnits="userSpaceOnUse" x={0} y={0} width={200} height={218}>
        <FeColorMatrix type="matrix" values={inkMatrix(skin, .52)}/>
      </Filter>
    </Defs>
    <G filter={url('skinInk')}>
      {bands.map(band => <G key={band.name} clipPath={url(band.name)}>
        <Image href={sheet} x={x} y={band.y - band.sourceY} width={600} height={portraitSheetHeight} preserveAspectRatio="none"/>
      </G>)}
    </G>
    <Path d={CATCHLIGHT} fill="#F4D6AC" opacity={eyeShape === 'hooded' ? .72 : .88}/>
    {complexion === 'freckles' && <Path d={FRECKLES} fill="#472A20" opacity={.76}/>}
    {complexion === 'weathered' && <Path d={WRINKLES} fill={INK} opacity={.8}/>}
  </G>;
});

export const ComicGrooming = memo(function ComicGrooming({
  faction, facePreset = 'european', face = 'square', bodyType = 'regular', hairStyle = 'short',
  hair = faction === 'sororitas' ? '#E4DDD1' : '#44362F',
  beardStyle = 'none', mustacheStyle = 'none', beardColor = hair,
}: HeadProps) {
  const id = `groom${useId().replace(/[^a-z\d]/gi, '')}`;
  const url = (key: string) => `url(#${id}${key})`;
  const hairPiece = hairStyle === 'short' ? (faction === 'sororitas' ? 'pixie' : 'crop') : hairStyle;
  const trimBeard = faction === 'astartes' && bodyType === 'slender' && beardStyle !== 'none';
  const beard = beardStyle !== 'none' && <G clipPath={url('tile')}>
    <G clipPath={trimBeard ? url('slenderBeard') : undefined}>
      <Image href={BEARDS[faction][facePreset]}
        x={BEARD_FRAME.x - FACE_COLUMN[face] * BEARD_FRAME.width}
        y={BEARD_FRAME.y - BEARD_ROW[beardStyle] * BEARD_FRAME.height}
        width={BEARD_FRAME.width * 3} height={BEARD_FRAME.height * 4} preserveAspectRatio="none"/>
    </G>
  </G>;
  const castsShadow = beardStyle === 'short' || beardStyle === 'full' || beardStyle === 'goatee';
  if (!beard && mustacheStyle === 'none' && hairPiece === 'shaved') return null;

  return <G>
    <Defs>
      {beard && <ClipPath id={id + 'tile'}><Rect {...BEARD_FRAME}/></ClipPath>}
      {trimBeard && <ClipPath id={id + 'slenderBeard'}><Path d={astartesBeardClip(facePreset, face, bodyType)}/></ClipPath>}
      {castsShadow && <>
        <ClipPath id={id + 'throat'}><Path d={comicNeckPath(faction, facePreset, face, bodyType)}/></ClipPath>
        <Filter id={id + 'shadow'} filterUnits="userSpaceOnUse" {...BEARD_FRAME}>
          <FeColorMatrix type="matrix" values={[0,0,0,0,.015, 0,0,0,0,.009, 0,0,0,0,.006, 0,0,0,.48,0]}/>
          <FeGaussianBlur stdDeviation={1.15}/>
        </Filter>
      </>}
      {(beard || mustacheStyle !== 'none') && <Filter id={id + 'facialInk'} filterUnits="userSpaceOnUse" {...BEARD_FRAME}>
        <FeColorMatrix type="matrix" values={inkMatrix(beardColor, .36)}/>
      </Filter>}
      {hairPiece !== 'shaved' && <Filter id={id + 'hairInk'} filterUnits="userSpaceOnUse" x={0} y={-25} width={200} height={215}>
        <FeColorMatrix type="matrix" values={inkMatrix(hair, .52)}/>
      </Filter>}
    </Defs>
    {castsShadow && <G clipPath={url('throat')}>
      <G transform="translate(.3 1.65)"><G filter={url('shadow')}>{beard}</G></G>
    </G>}
    {(beard || mustacheStyle !== 'none') && <G filter={url('facialInk')}>
      {beard}
      {mustacheStyle !== 'none' && <Image href={GROOMING[mustacheStyle]} {...MUSTACHE_FIT[mustacheStyle]} preserveAspectRatio="none"/>}
    </G>}
    {hairPiece !== 'shaved' && <G filter={url('hairInk')}>
      <Image href={GROOMING[hairPiece]} {...HAIR_FIT[hairPiece]} preserveAspectRatio="none"/>
    </G>}
  </G>;
});
