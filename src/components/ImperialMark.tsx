import React from 'react';
import Svg, { G, Path, Circle } from 'react-native-svg';

type ImperialMarkProps = { size?: number; color?: string };

/** Original insignia for the prototype, drawn as vector artwork. */
export default function ImperialMark({ size = 56, color = '#C8A96B' }: ImperialMarkProps) {
  return (
    <Svg width={size} height={size * 0.65} viewBox="0 0 100 65" accessibilityRole="image" accessibilityLabel="Insígnia imperial">
      <G fill={color}>
        <Path d="M45 27 34 24 4 9 9 23 34 33 13 29 18 39 36 40 23 43 31 50 43 44ZM55 27 66 24 96 9 91 23 66 33 87 29 82 39 64 40 77 43 69 50 57 44Z" />
        <Path d="m50 1 4 12 10 3-10 3-4 9-4-9-10-3 10-3Z" />
        <Path d="M39 34Q39 23 50 23T61 34L58 42 56 44 56 51 44 51 44 44 42 42Z" />
        <Path d="m50 54 5 3-5 7-5-7Z" />
      </G>
      <Path d="m42 33 6 2-1 5-5-2Zm16 0-6 2 1 5 5-2ZM50 38l-2 5h4Z" fill="#111315" />
      <Path d="M47 47v4m6-4v4" stroke="#111315" strokeWidth="1.5" />
      <Circle cx="50" cy="15" r="2" fill="#111315" />
    </Svg>
  );
}

export { ImperialMark };
