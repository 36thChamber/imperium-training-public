import React, { memo, useId } from 'react';
import Svg, { ClipPath, Defs, FeGaussianBlur, Filter, G, Path, Rect } from 'react-native-svg';
import type { Armour, AvatarConfig, Faction } from '../domain';
import { comicNeckPath, ComicGrooming, ComicHead } from './ComicHead';
import { ComicHelmet, ComicTorso, getComicGear } from './ComicEquipment';

export type ComicAvatarProps = Partial<AvatarConfig> & {
  faction: Faction;
  pattern: Armour['pattern'];
  headOnly?: boolean;
  chestOnly?: boolean;
  size?: number;
};

// Scale the shoulders about the throat so changing build never pulls the
// neckline sideways under a fixed head. The foreground follows the same fit.
const buildProportions = {
  slender: { width: 0.84, height: 1.07 },
  regular: { width: 1, height: 1 },
  broad: { width: 1.16, height: 0.94 },
};

function ComicAvatar({
  faction, pattern, armourId, bodyType = 'regular', helmet = false, aquilaStyle = 'aquila',
  headOnly = false, chestOnly = false, size = 300, ...appearance
}: ComicAvatarProps) {
  const id = `ink${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const gear = getComicGear(pattern, armourId);
  const fittedBody = pattern === 'scout' || pattern === 'novice' ? bodyType : 'regular';
  const { left, mid, right } = gear.collar;
  const { width, height } = buildProportions[fittedBody];
  const equipmentScale = pattern === 'terminator' ? 1 : 460 / gear.body.bounds.width;
  const shoulders = `translate(${mid.x} ${mid.y}) scale(${width * equipmentScale} ${height * equipmentScale}) translate(${-mid.x} ${-mid.y})`;
  // All three layers follow the actual drawn lip, including folds of cloth
  // and notches in the metal, rather than an approximate ellipse.
  const curve = gear.collar.edge;
  // The supplied reference has a bare head about 15% of the ordinary suit's
  // shoulder width, and about 11.5% for Tactical Dreadnought armour.
  const headScale = faction === 'sororitas' ? 0.91 : pattern === 'scout' ? 1
    : pattern === 'terminator' ? gear.body.bounds.width * 0.115 / 126 : 0.56;
  const headX = mid.x - headScale * 100;
  const headY = mid.y - headScale * 189 + (gear.headOffsetY ?? 0);
  const headTransform = `translate(${headX} ${headY}) scale(${headScale})`;
  const withHelmet = helmet && Boolean(gear.helmet);
  const helmetScale = !gear.helmet ? 1 : pattern === 'terminator'
    ? gear.body.bounds.width * 0.17 / gear.helmet.bounds.width
    : (faction === 'sororitas' ? 174 : 104.4) / gear.helmet.bounds.height;
  const helmetTransform = `translate(${mid.x} ${mid.y + (gear.headOffsetY ?? 0)}) scale(${helmetScale}) translate(${-mid.x} ${-mid.y})`;
  const fullWidth = pattern === 'terminator' ? Math.max(560, gear.body.bounds.width * width + 40) : 560;
  const bodyTop = mid.y + (gear.body.bounds.y - mid.y) * height * equipmentScale;
  // Scout/novice artwork already ends at the elbows. Power-armour artwork
  // retains complete arms underneath this shared bust crop.
  const cropFraction = pattern === 'scout' || pattern === 'novice' ? 0.985 : 0.58;
  const bodyBottom = mid.y + (gear.body.bounds.y + gear.body.bounds.height * cropFraction - mid.y) * height * equipmentScale;
  const fullTop = Math.min(headY - 24 * headScale, bodyTop) - 10;
  const fullHeight = bodyBottom - fullTop;
  const viewBox = chestOnly ? '55 245 290 319' : headOnly
    ? `${mid.x - 115 * headScale} ${headY - 24 * headScale} ${230 * headScale} ${253 * headScale}`
    : `${mid.x - fullWidth / 2} ${fullTop} ${fullWidth} ${fullHeight}`;
  const portraitHeight = size * (headOnly || chestOnly ? 1.1 : fullHeight / fullWidth);

  return (
    <Svg width={size} height={portraitHeight} viewBox={viewBox} accessibilityRole="image"
      accessibilityLabel={`Retrato ${faction === 'sororitas' ? 'Adepta Sororitas' : 'Astartes'}: ${armourId ?? pattern}${withHelmet ? ', com elmo' : ''}`}>
      <Defs>
        <ClipPath id={`${id}bust`}>
          <Rect x={mid.x - fullWidth / 2} y={fullTop} width={fullWidth} height={fullHeight}/>
        </ClipPath>
        <ClipPath id={`${id}opening`}>
          <Path d={`${curve} L480 ${right.y} V-120 H-80 V${left.y} Z`} transform={shoulders} />
        </ClipPath>
        <ClipPath id={`${id}skin`}>
          <Path d={comicNeckPath(faction, appearance.facePreset, appearance.face, fittedBody)} transform={headTransform} />
        </ClipPath>
        <Filter id={`${id}penumbra`} filterUnits="userSpaceOnUse" x={left.x - 16} y={left.y - 24}
          width={right.x - left.x + 32} height={90}>
          <FeGaussianBlur stdDeviation={3.3} />
        </Filter>
        {gear.hoodOpening && <ClipPath id={`${id}hood`}><Path d={gear.hoodOpening} transform={shoulders} /></ClipPath>}
      </Defs>
      <G clipPath={!headOnly && !chestOnly ? `url(#${id}bust)` : undefined}>
      <G transform={shoulders}><ComicTorso gear={gear} aquilaStyle={aquilaStyle}/></G>
      <G clipPath={gear.hoodOpening ? `url(#${id}hood)` : undefined}>
        <G clipPath={`url(#${id}opening)`}>
          {withHelmet ? <G transform={helmetTransform}><ComicHelmet gear={gear} /></G> : <>
            <G transform={headTransform}><ComicHead faction={faction} bodyType={fittedBody} {...appearance} /></G>
            <G clipPath={`url(#${id}skin)`}>
              <G transform={shoulders} fill="none" strokeLinejoin="round">
                <G filter={`url(#${id}penumbra)`}>
                  <Path d={curve} stroke="#251A17" strokeWidth={9} strokeOpacity={0.67} />
                </G>
                <Path d={curve} stroke="#171410" strokeWidth={1.4} strokeOpacity={0.82} />
              </G>
            </G>
          </>}
        </G>
        {/* Roots follow the face; the ends can hang in front of the collar. */}
        {!withHelmet && <G transform={headTransform}><ComicGrooming faction={faction} bodyType={fittedBody} {...appearance} /></G>}
      </G>
      </G>
    </Svg>
  );
}

export default memo(ComicAvatar);
