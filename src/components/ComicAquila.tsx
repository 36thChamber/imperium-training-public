import React from 'react';
import Svg, { Image } from 'react-native-svg';
import type { AquilaStyle } from '../avatarOptions';

const symbols = {
  aquila: require('../../assets/avatar-comic/emblems/aquila.png'),
  imperialis: require('../../assets/avatar-comic/emblems/imperialis.png'),
  ornate: require('../../assets/avatar-comic/emblems/ornate.png'),
};

export type AquilaBounds = { x: number; y: number; width: number; height: number };

export function ComicAquila({ style = 'aquila', bounds }: { style?: AquilaStyle; bounds: AquilaBounds }) {
  return <Image href={symbols[style]} {...bounds} preserveAspectRatio="xMidYMid meet"/>;
}

export function AquilaPreview({ style, size = 80 }: { style: AquilaStyle; size?: number }) {
  return <Svg width={size} height={size * 0.6} viewBox="0 0 160 96" accessibilityRole="image" accessibilityLabel="Símbolo do peitoral">
    <ComicAquila style={style} bounds={{ x: 3, y: 7, width: 154, height: 82 }}/>
  </Svg>;
}
