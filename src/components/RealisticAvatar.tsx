import React, { memo, useId } from 'react';
import Svg, { ClipPath, Defs, FeColorMatrix, FeGaussianBlur, Filter, G, Image, LinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg';
import {
  AVATAR_VIEWBOX,
  BEARD_COLOR_BASE,
  HAIR_COLOR_BASE,
  getAvatarSprites,
  materialColorMatrix,
  type AvatarFace,
  type AvatarHairStyle,
  type AvatarPattern,
  type AvatarSprite,
} from '../avatarAssets';
import type { Faction } from '../domain';
import type { BeardStyle, FacePreset } from '../avatarOptions';

export type RealisticAvatarProps = {
  faction: Faction;
  pattern: AvatarPattern;
  armourId?: string;
  skin?: string;
  hair?: string;
  hairStyle?: AvatarHairStyle;
  face?: AvatarFace;
  facePreset?: FacePreset;
  beardStyle?: BeardStyle;
  beardColor?: string;
  headOnly?: boolean;
  helmet?: boolean;
  size?: number;
};

function Sprite({ sprite, clipId, filterId }: { sprite: AvatarSprite; clipId: string; filterId?: string }) {
  const { atlas, frame, target } = sprite;
  const scaleX = target.width / frame.width;
  const scaleY = target.height / frame.height;
  return <G clipPath={`url(#${clipId})`} filter={filterId ? `url(#${filterId})` : undefined} opacity={sprite.opacity ?? 1}>
    <Image
      href={atlas.source}
      x={target.x - frame.x * scaleX}
      y={target.y - frame.y * scaleY}
      width={atlas.width * scaleX}
      height={atlas.height * scaleY}
      preserveAspectRatio="none"
    />
  </G>;
}

/**
 * Composites original realistic raster parts. SVG is only the native clipping /
 * colour pipeline; it does not redraw a simplified character. FeColorMatrix is
 * backed by CoreImage on iOS in react-native-svg 15.16 (Expo SDK 58).
 */
function RealisticAvatar({
  faction,
  pattern,
  armourId,
  skin = '#C68D70',
  hair,
  hairStyle = 'short',
  face = 'square',
  facePreset = 'european',
  beardStyle = 'none',
  beardColor,
  headOnly = false,
  helmet = false,
  size = 300,
}: RealisticAvatarProps) {
  const prefix = `realistic${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const sprites = getAvatarSprites({ faction, pattern, armourId, face, facePreset, hairStyle, beardStyle, helmet });
  const hairColor = hair ?? (faction === 'sororitas' ? '#E4DDD1' : '#44362F');
  const head = sprites.face.target;
  const skinFilter = `${prefix}skin`;
  const hairFilter = `${prefix}hair`;
  const beardFilter = `${prefix}beard`;
  const faceAlpha = `${prefix}faceAlpha`;
  const hairShadow = `${prefix}hairShadow`;
  const neckShade = `${prefix}neckShade`;
  const clips = { body: `${prefix}bodyClip`, collar: `${prefix}collarClip`, face: `${prefix}faceClip`, hair: `${prefix}hairClip`, beard: `${prefix}beardClip`, helmet: `${prefix}helmetClip` };
  const headViewBox = `176 ${head.y - 12} 160 200`;
  return (
    <Svg
      width={size}
      height={size * AVATAR_VIEWBOX.height / AVATAR_VIEWBOX.width}
      viewBox={headOnly ? headViewBox : `0 0 ${AVATAR_VIEWBOX.width} ${AVATAR_VIEWBOX.height}`}
      accessibilityRole="image"
      accessibilityLabel={`Retrato ${faction === 'sororitas' ? 'Adepta Sororitas' : 'Astartes'}: ${armourId ?? pattern}${sprites.helmet ? ', com elmo' : `, rosto ${face === 'oval' ? 'oval' : 'angular'}`}`}
    >
      <Defs>
        <ClipPath id={clips.body}><Rect {...sprites.body.target} /></ClipPath>
        <ClipPath id={clips.collar}><Path d={sprites.collarPath} /></ClipPath>
        <ClipPath id={clips.face}><Rect {...head} /></ClipPath>
        {sprites.hair && <ClipPath id={clips.hair}><Rect {...sprites.hair.target} /></ClipPath>}
        {sprites.beard && <ClipPath id={clips.beard}><Rect {...sprites.beard.target} /></ClipPath>}
        {sprites.helmet && <ClipPath id={clips.helmet}><Rect {...sprites.helmet.target} /></ClipPath>}
        <Filter id={skinFilter} filterUnits="userSpaceOnUse" {...head}>
          <FeColorMatrix type="matrix" values={materialColorMatrix(skin, sprites.skinNeutral)} />
        </Filter>
        {sprites.hair && <Filter id={hairFilter} filterUnits="userSpaceOnUse" {...sprites.hair.target}>
          <FeColorMatrix type="matrix" values={materialColorMatrix(hairColor, HAIR_COLOR_BASE)} />
        </Filter>}
        {sprites.beard && <Filter id={beardFilter} filterUnits="userSpaceOnUse" {...sprites.beard.target}>
          <FeColorMatrix type="matrix" values={materialColorMatrix(beardColor ?? hairColor, BEARD_COLOR_BASE)} />
        </Filter>}
        <Mask id={faceAlpha} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" maskType="alpha" {...head}>
          <Sprite sprite={sprites.face} clipId={clips.face} />
        </Mask>
        {sprites.hair && <Filter id={hairShadow} filterUnits="userSpaceOnUse" x={head.x - 5} y={head.y - 20} width={head.width + 10} height={head.height + 30}>
          <FeColorMatrix type="matrix" values={[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.33, 0]} />
          <FeGaussianBlur stdDeviation={1.2} />
        </Filter>}
        <LinearGradient id={neckShade} x1={0} y1={sprites.collarY - 24} x2={0} y2={sprites.collarY + 18} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#10140F" stopOpacity={0} />
          <Stop offset="0.65" stopColor="#10140F" stopOpacity={0.25} />
          <Stop offset="1" stopColor="#080A07" stopOpacity={0.62} />
        </LinearGradient>
      </Defs>
      {!headOnly && <Sprite sprite={sprites.body} clipId={clips.body} />}
      {/* Backpack is behind the head; the foreground collar covers the neck seam. */}
      {sprites.helmet
        ? <Sprite sprite={sprites.helmet} clipId={clips.helmet} />
        : <Sprite sprite={sprites.face} clipId={clips.face} filterId={skinFilter} />}
      {!sprites.helmet && <>
        {sprites.hair && <>
          <G mask={`url(#${faceAlpha})`}><G transform="translate(0 1.2)"><Sprite sprite={sprites.hair} clipId={clips.hair} filterId={hairShadow} /></G></G>
          <Sprite sprite={sprites.hair} clipId={clips.hair} filterId={hairFilter} />
        </>}
        {!headOnly && <G mask={`url(#${faceAlpha})`}><Rect x={head.x} y={sprites.collarY - 24} width={head.width} height={55} fill={`url(#${neckShade})`} /></G>}
      </>}
      {!headOnly && <Sprite sprite={sprites.body} clipId={clips.collar} />}
      {!sprites.helmet && sprites.beard && <Sprite sprite={sprites.beard} clipId={clips.beard} filterId={beardFilter} />}
    </Svg>
  );
}

export default memo(RealisticAvatar);
