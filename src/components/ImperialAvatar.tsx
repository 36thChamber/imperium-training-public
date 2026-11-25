import React, { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

export type ImperialAvatarProps = {
  faction: 'astartes' | 'sororitas';
  pattern: 'scout' | 'tacticus' | 'mk3' | 'terminator' | 'novice' | 'sororitas' | 'celestian';
  skin?: string;
  hair?: string;
  hairStyle?: 'short' | 'shaved' | 'bob';
  face?: 'square' | 'oval';
  helmet?: boolean;
  size?: number;
};

/** Modular, original vector illustration. Equipment changes the silhouette, not just its colour. */
export default function ImperialAvatar({ faction, pattern, skin = '#BA8B70', hair, hairStyle = 'short', face = 'square', helmet = false, size = 300 }: ImperialAvatarProps) {
  const prefix = `avatar${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const id = (name: string) => `${prefix}${name}`;
  const fill = (name: string) => `url(#${id(name)})`;
  const sister = faction === 'sororitas';
  const novice = pattern === 'novice';
  const scout = pattern === 'scout';
  const light = novice || scout;
  const terminator = pattern === 'terminator';
  const mk3 = pattern === 'mk3';
  const ornate = pattern === 'celestian' || terminator;
  const hairColor = hair ?? (sister ? '#D9D6CF' : '#40332F');
  const plateTop = sister ? '#51545A' : mk3 ? '#56635E' : '#4C6475';
  const plateMid = sister ? '#25282E' : mk3 ? '#303E3C' : '#263B4B';
  const plateLow = sister ? '#111519' : '#101E28';
  const gold = '#C7AA71';
  const dark = '#0B1014';
  const bodyTransform = sister ? 'translate(20 0) scale(.89 1)' : 'translate(0 0)';

  return (
    <Svg width={size} height={size * (440 / 360)} viewBox="0 0 360 440" accessibilityRole="image" accessibilityLabel={`Avatar ${sister ? 'Adepta Sororitas' : 'Astartes'}: ${pattern}`}>
      <Defs>
        <LinearGradient id={id('plate')} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={plateTop} /><Stop offset=".42" stopColor={plateMid} /><Stop offset="1" stopColor={plateLow} />
        </LinearGradient>
        <LinearGradient id={id('gold')} x1="0" y1="0" x2=".8" y2="1">
          <Stop offset="0" stopColor="#E7D7AC" /><Stop offset=".4" stopColor="#B2955D" /><Stop offset="1" stopColor="#665234" />
        </LinearGradient>
        <LinearGradient id={id('cloth')} x1="0" y1="0" x2="1" y2=".6">
          <Stop offset="0" stopColor={scout ? '#5B574A' : '#843A38'} /><Stop offset=".4" stopColor={scout ? '#33342F' : '#4C2026'} /><Stop offset="1" stopColor="#1A171C" />
        </LinearGradient>
        <LinearGradient id={id('habit')} x1="0" y1="0" x2="1" y2=".3">
          <Stop offset="0" stopColor="#9A8C70" /><Stop offset=".43" stopColor="#D5C5A2" /><Stop offset=".68" stopColor="#B8A787" /><Stop offset="1" stopColor="#82745C" />
        </LinearGradient>
        <LinearGradient id={id('steel')} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#A0AFB1" /><Stop offset=".45" stopColor="#53616B" /><Stop offset="1" stopColor="#25313A" />
        </LinearGradient>
        <RadialGradient id={id('halo')} cx="50%" cy="44%" r="50%">
          <Stop offset="0" stopColor={sister ? '#80504C' : '#50616C'} stopOpacity=".23" /><Stop offset="1" stopColor="#15191D" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id={id('face')} x1="0" y1="0" x2="1" y2=".7">
          <Stop offset="0" stopColor={skin} /><Stop offset="1" stopColor={skin} stopOpacity=".73" />
        </LinearGradient>
      </Defs>

      <Ellipse cx="180" cy="213" rx="174" ry="191" fill={fill('halo')} />
      <G fill="none" stroke={gold} opacity=".16">
        <Circle cx="180" cy="163" r="121" strokeWidth=".7" />
        <Circle cx="180" cy="163" r="111" strokeDasharray="2 9" />
        <Path d="M180 22v21M180 284v22M39 163h20M301 163h20M80 63l14 14M266 249l14 14M80 263l14-14M266 77l14-14" />
        <Path d="M164 37h32M164 289h32M54 147v32M306 147v32" strokeWidth="2" />
      </G>
      <Ellipse cx="180" cy="423" rx="94" ry="10" fill="#000" opacity=".34" />

      <G transform={bodyTransform}>
        {/* Back plate, backpack and fabric are behind the limbs. */}
        {!light && <G stroke={dark} strokeWidth="3">
          <Path d={terminator ? 'M97 83 115 65H245L266 85 270 196H92Z' : 'M115 112 127 96H233L245 113 240 207H119Z'} fill={fill('plate')} />
          <Rect x={terminator ? 93 : 111} y="104" width="25" height="82" rx="9" fill={fill('steel')} />
          <Rect x={terminator ? 243 : 224} y="104" width="25" height="82" rx="9" fill={fill('steel')} />
          <Path d="M116 115h13m-13 7h13m102-7h13m-13 7h13" stroke="#17232B" />
        </G>}
        {(sister || scout) && <Path d={novice ? 'M118 137 100 371 142 398 180 372 220 398 259 372 242 140Z' : 'M111 151 100 385 145 399 180 372 220 399 257 384 242 153Z'} fill={fill('cloth')} stroke={dark} strokeWidth="3" />}

        {/* Legs: layered cuisses, ribbed knees and articulated greaves. */}
        <G stroke={dark} strokeWidth="3" strokeLinejoin="round">
          <Path d="M126 262 174 267 172 333 156 346 121 331Z" fill={fill(light ? 'cloth' : 'plate')} />
          <Path d="M186 267 234 262 239 331 204 346 188 333Z" fill={fill(light ? 'cloth' : 'plate')} />
          <Path d="m128 270 39 6-3 46-31 1Z M193 276l39-6-5 53-31-1Z" fill={fill('plate')} />
          <Path d="m128 283 36 6m32 0 36-6" fill="none" stroke="#70808B" strokeWidth="1" opacity=".45" />
          <Rect x="124" y="329" width="44" height="22" rx="10" fill="#161E24" />
          <Rect x="192" y="329" width="44" height="22" rx="10" fill="#161E24" />
          <Path d="M128 334h35m-35 5h35m34-5h34m-34 5h34" stroke="#43515A" strokeWidth="1.5" />
          <Path d="M124 345 166 345 165 399 153 411 116 407Z M194 345 236 345 244 407 207 411 195 399Z" fill={fill('plate')} />
          <Path d="M129 350 138 351 134 398 124 398Z M222 351 231 350 237 398 226 398Z" fill="#79919D" opacity=".2" stroke="none" />
          <Path d="m119 398 45 1 4 21-57 1-2-12Z M196 399l45-1 10 11-2 12-57-1Z" fill={fill('plate')} />
          <Path d="M111 416h55m28 0h55" stroke="#53616A" strokeWidth="1.5" />
          {!light && <>
            <Path d="m124 343 21-9 21 9-7 15h-28Z M194 343l21-9 21 9-7 15h-28Z" fill={fill('plate')} stroke={gold} strokeWidth="1.4" />
            <Path d="m145 340 5 6-5 6-5-6Zm70 0 5 6-5 6-5-6Z" fill={gold} stroke="none" />
          </>}
        </G>

        {/* Under-armour, arm joints and forearm gauntlets. */}
        <G stroke={dark} strokeWidth="3" strokeLinejoin="round">
          <Path d="M90 173 118 183 104 248 77 246 67 221Z M270 173l-28 10 14 65 27-2 10-25Z" fill={fill(light ? 'cloth' : 'plate')} />
          <Path d="m78 226 24 5-2 20-26-4Z M258 231l24-5 6 21-26 4Z" fill="#121C24" />
          <Path d="m79 232 19 4m-20 1 20 4m165-5 18-4m-18 9 20-4" stroke="#5B656A" strokeWidth="1" />
          <Path d="M75 247 104 251 101 289 90 302 64 290Z M256 251l29-4 11 43-26 12-11-13Z" fill={fill(novice ? 'cloth' : 'plate')} />
          <Path d="m76 253 5 1-5 28-6-1Z M279 254l5-1 6 28-6 1Z" fill="#8FA3AC" opacity=".28" stroke="none" />
          <Path d="m70 291 24 4 4 19-10 11-23-7Z M266 295l24-4 5 27-23 7-10-11Z" fill={fill(light ? 'cloth' : 'plate')} />
          <Path d="m72 303 1 11m7-10 1 12m7-9 1 10m184-10-1 10m8-13-1 12m8-13-1 11" stroke="#64717B" strokeWidth="1" />
          {mk3 && <Path d="m73 259 29 5m-31 6 30 5m-32 7 30 5m158-23 29-5m-28 16 30-5m-28 17 30-5" stroke="#87938E" strokeWidth="2" />}
        </G>

        {/* Torso and abdomen. */}
        <Path d={sister ? 'M124 153 149 142H211L236 153 222 214 215 247 230 277 180 292 130 277 145 247 138 213Z' : 'M113 153 145 141H215L247 153 231 221 225 256 232 279 180 294 128 279 135 256 129 221Z'} fill="#152027" stroke={dark} strokeWidth="4" />
        <Path d="M139 213 180 225 221 213 214 248H146Z" fill="#101820" />
        <Path d="m143 222 37 10 37-10m-73 9 36 10 36-10m-71 9 35 10 35-10" fill="none" stroke="#52616B" strokeWidth="3" opacity=".7" />
        <Path d={sister ? 'M126 155 151 143 180 150 209 143 234 155 223 195 205 214 180 204 155 214 137 195Z' : 'M113 156 147 140 180 149 213 140 247 156 232 205 180 225 128 205Z'} fill={fill('plate')} stroke={dark} strokeWidth="3" />
        <Path d="m126 161 25-11 29 7 29-7 24 11" stroke="#8F9CA3" opacity=".45" strokeWidth="1.5" fill="none" />
        {!light && <G fill={fill('gold')}>
          <Path d="m173 179-9-4-32-7 6 12 25 5-21 0 7 9 15-2-8 7 9 4 11-10Zm14 0 9-4 32-7-6 12-25 5h21l-7 9-15-2 8 7-9 4-11-10Z" />
          <Path d="M173 179q7-9 14 0l-1 12-6 5-6-5Z" />
          <Path d="m176 182 3 1-1 4-3-1m9-4-3 1 1 4 3-1" fill="#263039" />
        </G>}
        {light && <G stroke={gold} strokeWidth="1.2" fill="none"><Path d="M151 168h58v32l-29 13-29-13Z" /><Path d="M169 185h22m-11-11v25" /></G>}
        <Path d="m133 253 47 8 47-8 5 23-52 12-52-12Z" fill="#20252A" stroke={dark} strokeWidth="3" />
        <Rect x="165" y="257" width="30" height="27" rx="3" fill={fill('gold')} stroke={dark} strokeWidth="2" />
        <Path d="m180 263 7 7-7 8-7-8Z" fill="#3E3931" />
        <Path d="M136 259v16m8-14v16m72-18v16m-8-14v16" stroke="#697072" strokeWidth="2" />

        {((sister && !novice) || ornate) && <G>
          <Path d="M158 284 202 284 211 373 180 391 149 373Z" fill={fill('cloth')} stroke="#100F14" strokeWidth="2" />
          <Path d="M165 290 160 369 180 380 200 369 195 290" fill="none" stroke={gold} strokeWidth="1.1" opacity=".65" />
          <Path d="M180 302v46m-11-33h22m-17 27h12" stroke={gold} strokeWidth="2" opacity=".8" />
          <Circle cx="180" cy="313" r="4" fill={gold} />
        </G>}

        {/* A novitiate wears a textile habit over light protection, not power armour. */}
        {novice && <G strokeLinejoin="round">
          <Path d="M128 153 150 142 180 152 210 142 233 153 220 206 217 250 243 399 219 410 180 405 141 410 117 399 143 250 140 206Z" fill={fill('cloth')} stroke="#211719" strokeWidth="2.5" />
          <Path d="m148 158-5 45 12 46-25 147 12 6 27-153-9-86Zm64 0 5 45-12 46 25 147-12 6-27-153 9-86Z" fill="#AB5B4C" opacity=".2" />
          <Path d="m156 150 24 10 24-10-6 95 18 145-36 16-36-16 18-145Z" fill={fill('habit')} stroke="#6F604A" strokeWidth="1.5" />
          <Path d="m165 160 3 75m27-75-3 75m-18 27-14 119m26-119 14 119M151 385l29 13 29-13" fill="none" stroke="#F0DDB7" strokeWidth="1" opacity=".45" />
          <Path d="m178 267-6 127 8 5 8-5-6-127Z" fill="#7E6E52" opacity=".27" />
          <Path d="m146 241 34 7 34-7 3 15-37 8-37-8Z" fill="#3D3029" stroke="#211A18" strokeWidth="2" />
          <Rect x="170" y="246" width="20" height="15" rx="2" fill={fill('gold')} stroke="#4B3E29" strokeWidth="1.5" />
          <Rect x="175" y="250" width="10" height="7" rx="1" fill="#493A2D" />
          <Path d="M158 151q22 42 44 0" fill="none" stroke="#BCA36B" strokeWidth="1.5" />
          <Path d="m180 174 4 6-4 7-4-7Z" fill={gold} stroke="#8C7047" strokeWidth="1" />
          <Path d="M158 287q-12 13-8 29" fill="none" stroke="#80673E" strokeWidth="1.5" />
          {[0, 1, 2, 3, 4].map(i => <Circle key={i} cx={152 - Math.sin(i) * 3} cy={293 + i * 5} r="2" fill="#A08D62" />)}
          <Path d="M149 316v12m-5-8h10" stroke={gold} strokeWidth="2" />
        </G>}

        {/* Pauldrons vary in width and construction by equipment. */}
        <G stroke={dark} strokeWidth="3" strokeLinejoin="round">
          <Path d={terminator ? 'M115 125 83 119 51 140 48 191 80 211 120 198 134 157Z' : novice ? 'M122 151 107 145 92 156 92 176 110 185 124 176Z' : scout ? 'M121 149 99 141 79 152 75 182 98 197 122 185Z' : 'M123 145 96 128 65 145 61 181 89 204 122 192 135 166Z'} fill={fill('plate')} />
          <Path d={terminator ? 'M245 125 277 119 309 140 312 191 280 211 240 198 226 157Z' : novice ? 'M238 151 253 145 268 156 268 176 250 185 236 176Z' : scout ? 'M239 149 261 141 281 152 285 182 262 197 238 185Z' : 'M237 145 264 128 295 145 299 181 271 204 238 192 225 166Z'} fill={fill('plate')} />
          {!light && <>
            <Path d={terminator ? 'M115 127 84 123 55 142 53 189 80 206 117 194' : 'M122 148 96 133 69 148 66 179 90 199 120 188'} fill="none" stroke={fill('gold')} strokeWidth="5" />
            <Path d={terminator ? 'M245 127 276 123 305 142 307 189 280 206 243 194' : 'M238 148 264 133 291 148 294 179 270 199 240 188'} fill="none" stroke={fill('gold')} strokeWidth="5" />
          </>}
          {mk3 && <Path d="m75 151 24-9 18 9m-45 10 28-9 21 11m-47 9 24-9 24 11m122-23 18-9 24 9m-45 12 21-11 28 9m-48 13 24-11 24 9" fill="none" stroke="#748177" strokeWidth="2" />}
        </G>
        <G fill={gold} opacity=".85">
          {sister ? <G transform={novice ? 'translate(180 166) scale(.85) translate(-180 -166)' : undefined}>
            <Path d="M263 150q-8 7-1 14-13-7-15 3 8-3 14 5l-4 6h13l-4-6q8-8 14-5-2-10-15-3 7-7-2-14Z" />
            <Path d="m99 156 3 8 9 2-7 5 2 9-7-5-7 5 2-9-7-5 9-2Z" />
          </G> : <>
            <Path d="m92 151 8 8v12l-8 10-8-10v-12Z" fill="none" stroke={gold} strokeWidth="2.5" />
            <Path d="m265 151 5 8 9 2-7 7 1 10-8-5-9 5 2-10-7-7 9-2Z" />
          </>}
          {!light && [74, 111, 249, 286].map((x) => <Circle key={x} cx={x} cy={x === 111 || x === 249 ? 183 : 153} r="1.9" />)}
        </G>

        {/* Collar, neck and head. */}
        <Path d="m139 142 10-9h62l10 9-14 19h-54Z" fill={fill('steel')} stroke={dark} strokeWidth="3" />
        <Path d="M166 128h28v24q-14 10-28 0Z" fill={fill('face')} stroke="#271E1D" strokeWidth="2" />
        {(!helmet || light) ? <G>
          {hairStyle === 'bob' && <Path d="M151 97q-2-28 29-29t29 29l5 52-21-7-13-7-15 7-20 5Z" fill={hairColor} stroke="#18191D" strokeWidth="2" />}
          <Path d={face === 'oval' ? 'M155 96q0-24 25-24t25 24v22q-3 21-25 28-22-7-25-28Z' : 'M154 98q0-27 26-27t26 27v26l-10 19h-31l-11-19Z'} fill={fill('face')} stroke="#342A27" strokeWidth="2" />
          <Path d="m157 109 10 2m26 0 10-2" stroke="#6E4B40" strokeWidth="2.3" strokeLinecap="round" />
          <Path d="M161 114h8m22 0h8" stroke="#D7C5AA" strokeWidth="3" strokeLinecap="round" />
          <Circle cx="166" cy="114" r="1.8" fill="#263137" /><Circle cx="194" cy="114" r="1.8" fill="#263137" />
          <Path d="m180 113-3 12 5 1m-10 7q8 3 16-1" fill="none" stroke="#795148" strokeWidth="1.7" strokeLinecap="round" />
          {!sister && <Path d="m193 116 3 12-4 4" fill="none" stroke="#E4BAA0" strokeWidth="1.2" opacity=".7" />}
          {hairStyle === 'short' && <Path d="M153 103 151 88 161 73 180 67 200 74 209 90 205 106 199 91 162 91 157 106Z" fill={hairColor} />}
          {hairStyle === 'shaved' && <Path d="M155 96q0-24 25-24t25 24l-4-7q-21-13-42 0Z" fill={hairColor} opacity=".53" />}
          {hairStyle === 'bob' && <>
            <Path d="M151 104q-4-32 29-34 33 1 29 34l-7-15-21 1-21-2-4 22Z" fill={hairColor} />
            <Path d="m154 96-2 44 9-2-2-41m42-1 5 44-9-3 3-41" fill={hairColor} />
            <Path d="m162 80 2 7m7-10 2 10m9-11v11m9-9-1 8" stroke="#F5EFE4" opacity=".27" strokeWidth="1.5" />
          </>}
        </G> : <G stroke={dark} strokeWidth="2.5" strokeLinejoin="round">
          <Path d={mk3 ? 'M154 85 168 74h25l14 11 5 47-16 18h-31l-15-18Z' : terminator ? 'M153 92 163 82h34l14 14-3 34-18 17h-19l-21-17Z' : 'M155 87 166 76h28l13 11 4 40-15 23h-31l-16-23Z'} fill={fill('plate')} />
          <Path d="m157 105 20 6-2 6-19-5Zm46 0-20 6 2 6 19-5Z" fill={sister ? '#E7A46E' : '#DA644E'} stroke="#422C2B" strokeWidth="1" />
          <Path d="m159 108 14 4m14 0 13-4" stroke="#FFC0A1" strokeWidth="1.1" />
          {mk3 ? <>
            <Path d="M158 122h45v19l-22 10-23-10Z" fill={fill('steel')} />
            <Path d="M163 128h35m-35 5h35m-28 6h21" stroke="#17252B" strokeWidth="3" />
            <Path d="M179 77v28" stroke={gold} strokeWidth="7" />
          </> : <>
            <Path d="m174 117-9 17 14 13 15-13-8-17Z" fill={fill('steel')} />
            <Path d="M175 127v11m5-13v15m5-13v11" stroke="#17222A" strokeWidth="2" />
            <Path d="M180 79v23" stroke={sister ? '#C7BFAE' : '#8EADB7'} strokeWidth="4" />
            <Path d="M154 122h10v13h-8Zm42 0h11l-3 13h-8Z" fill={fill('steel')} />
          </>}
          <Circle cx="159" cy="91" r="1.5" fill={gold} stroke="none" /><Circle cx="201" cy="91" r="1.5" fill={gold} stroke="none" />
        </G>}

        {/* Parchment purity seal and service detail. */}
        {!light && <G transform="translate(225 197) rotate(10)">
          <Path d="m-7 4-2 40 8-5 7 5 1-40Z" fill="#C8B792" stroke="#655B46" strokeWidth="1" />
          <Path d="M-4 16h7m-7 5h6m-6 5h7m-7 5h5" stroke="#786B53" strokeWidth=".8" />
          <Circle cy="3" r="9" fill="#733735" stroke="#A44D40" strokeWidth="2" /><Circle cy="3" r="4" fill="none" stroke="#C77761" strokeWidth="1" />
        </G>}
        {ornate && <G stroke={fill('gold')} fill="none" strokeWidth="2">
          <Path d="M144 108q-11-10-6-25m1 10-8-3m9-4-5-5m8 1-2-7M217 108q11-10 6-25m-1 10 8-3m-9-4 5-5m-8 1 2-7" />
          <Path d="M145 102q35-52 71 0" strokeWidth="1" opacity=".6" />
        </G>}
      </G>
      <Path d="M58 429h76m92 0h76" stroke={gold} opacity=".25" strokeWidth=".8" />
      <Polygon points="180,426 183,429 180,432 177,429" fill={gold} opacity=".55" />
      <Line x1="180" y1="20" x2="180" y2="26" stroke={gold} opacity=".5" />
    </Svg>
  );
}
