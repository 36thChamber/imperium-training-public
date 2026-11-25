import React, { useId, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { C } from '../styles';

/** Native decorative surfaces. None intercept input or enter the accessibility tree. */
export function Scanlines({ opacity = 0.09 }: { opacity?: number }) {
  const id = `scan${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill, { opacity }]}><Svg width="100%" height="100%"><Defs><Pattern id={id} patternUnits="userSpaceOnUse" width="4" height="4"><Rect width="4" height="1" fill="#000"/><Rect y="1" width="4" height="0.4" fill="#C8E78B"/></Pattern></Defs><Rect width="100%" height="100%" fill={`url(#${id})`}/></Svg></View>;
}

export function ScreenNoise({ opacity = 0.11 }: { opacity?: number }) {
  const id = `noise${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill, { opacity }]}><Svg width="100%" height="100%"><Defs><Pattern id={id} patternUnits="userSpaceOnUse" width="37" height="43"><Path d="M1 4h3m16 7h1m9 17h5M7 38h2M2 22h1" stroke="#C1CEB1" strokeWidth=".4"/><Circle cx="14" cy="26" r=".5" fill="#C1CEB1"/><Circle cx="33" cy="4" r=".45" fill="#000"/></Pattern></Defs><Rect width="100%" height="100%" fill={`url(#${id})`}/></Svg></View>;
}

/** Use a height in style for portrait panels, or let normal-flow children determine its size. */
export function CogitatorFrame({ children, style, tone = 'green', label }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'green' | 'amber'; label?: string }) {
  const accent = tone === 'green' ? C.terminal : C.amber;
  return <View style={[frame.outer, style]}>
    <View pointerEvents="none" style={frame.edge}/>
    {[frame.tl, frame.tr, frame.bl, frame.br].map((position, index) => <View pointerEvents="none" key={index} style={[frame.rivet, position]}><View style={frame.screw}/></View>)}
    {label && <Text style={[frame.label, { color: accent }]}>{label}</Text>}
    <View style={[frame.screen, { borderColor: tone === 'green' ? '#3E5030' : '#625036' }]}>
      <View pointerEvents="none" style={[frame.innerLine,{borderColor:accent}]}/>
      <Scanlines opacity={0.08}/><ScreenNoise opacity={0.075}/>
      {children}
      <View pointerEvents="none" style={[frame.corner, frame.cornerTL, {borderColor:accent}]}/><View pointerEvents="none" style={[frame.corner, frame.cornerTR, {borderColor:accent}]}/><View pointerEvents="none" style={[frame.corner, frame.cornerBL, {borderColor:accent}]}/><View pointerEvents="none" style={[frame.corner, frame.cornerBR, {borderColor:accent}]}/>
    </View>
  </View>;
}

export function GothicDivider({ color = C.gold }: { color?: string }) {
  return <View pointerEvents="none" accessible={false} style={{height:25,width:'100%',justifyContent:'center'}}><Svg width="100%" height="25" viewBox="0 0 360 25" preserveAspectRatio="none"><Path d="M0 12h135l6-4h21m36 0h21l6 4h135M12 15h120m96 0h120" stroke={color} strokeWidth=".5" opacity=".45" fill="none"/><Path d="m180 2 4 6 8 4-8 4-4 7-4-7-8-4 8-4Z" fill="none" stroke={color} strokeWidth=".8"/><Path d="M176 10q4-5 8 0v5l-2 3h-4l-2-3Z" fill={color}/><Path d="m177 12 2 1m4-1-2 1" stroke="#0A0C08"/></Svg></View>;
}

/** A small decorative votive cluster, best at the edge of an onboarding or shrine panel. */
export function CandleShrine({ size = 118, opacity = 1 }: { size?: number; opacity?: number }) {
  const id = `candle${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return <View pointerEvents="none" accessible={false} style={{width:size,height:size*1.35,opacity}}><Svg width="100%" height="100%" viewBox="0 0 120 162"><Defs><RadialGradient id={`${id}glow`}><Stop offset="0" stopColor="#E0A359" stopOpacity=".35"/><Stop offset=".5" stopColor="#B77637" stopOpacity=".12"/><Stop offset="1" stopColor="#9B602D" stopOpacity="0"/></RadialGradient><LinearGradient id={`${id}wax`} x2="1" y2="0"><Stop stopColor="#413624"/><Stop offset=".4" stopColor="#B6A17A"/><Stop offset=".68" stopColor="#786445"/><Stop offset="1" stopColor="#302A1D"/></LinearGradient><LinearGradient id={`${id}flame`} x2="0" y2="1"><Stop stopColor="#D58032"/><Stop offset=".65" stopColor="#FFD58A"/><Stop offset="1" stopColor="#F6E9BB"/></LinearGradient></Defs><Circle cx="64" cy="55" r="57" fill={`url(#${id}glow)`}/><Path d="M9 146h103l-6 12H15Z" fill="#191C18" stroke="#514532"/><Path d="M18 145V94q11-7 23 0v51M48 145V66q14-8 29 0v79M83 145V108q9-5 19 0v37" fill={`url(#${id}wax)`} stroke="#342C1E"/><Path d="M19 95q3 7 6 0v18q4 4 5-1v-13q5 4 10-4M49 67q5 10 10 0v22q4 4 5 0V75q6 5 12-7M84 109q5 7 8-1v17q3 4 4-1v-13" fill="#B39A70" opacity=".66"/><Path d="M30 89q-9-8 0-23 8 15 0 23Zm33-28q-12-11 1-32 9 21-1 32Zm30 43q-8-8 1-21 7 14-1 21Z" fill={`url(#${id}flame)`}/><Path d="M30 94v-7m33-20v-8m30 49v-6" stroke="#19140E" strokeWidth="1.4"/><Path d="m48 149 7 3m17-1 9 1m12-2 3 1" stroke="#675A40" strokeWidth=".5"/></Svg></View>;
}

/** Subtle industrial-Gothic architecture for an absolute background, not a content layer. */
export function CogitatorBackdrop({ opacity = 1 }: { opacity?: number }) {
  const id = `backdrop${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,{opacity}]}><Svg width="100%" height="100%" viewBox="0 0 480 900" preserveAspectRatio="xMidYMid slice"><Defs><RadialGradient id={`${id}ambient`} cx="80%" cy="50%" r="80%"><Stop stopColor="#372617" stopOpacity=".42"/><Stop offset=".6" stopColor="#11160D" stopOpacity=".15"/><Stop offset="1" stopColor="#050705"/></RadialGradient><LinearGradient id={`${id}metal`} x2="1" y2="0"><Stop stopColor="#080B09"/><Stop offset=".5" stopColor="#292B22"/><Stop offset="1" stopColor="#0A0D0A"/></LinearGradient></Defs><Rect width="480" height="900" fill="#070A07"/><Rect width="480" height="900" fill={`url(#${id}ambient)`}/><G fill="none" stroke="#4E5038" opacity=".18"><Path d="M65 900V340Q65 200 240 64 415 200 415 340V900" strokeWidth="2"/><Path d="M78 900V345Q78 210 240 85 402 210 402 345V900" strokeWidth=".7"/><Path d="M97 900V360Q97 225 240 109 383 225 383 360V900" strokeWidth="1"/><Path d="M240 86v815M96 370h288M77 560h325M66 750h348" strokeWidth=".5"/></G><G opacity=".38"><Rect x="14" width="14" height="900" fill={`url(#${id}metal)`}/><Rect x="452" width="14" height="900" fill={`url(#${id}metal)`}/>{[50,200,350,500,650,800].map(y=><G key={y}><Circle cx="21" cy={y} r="2.5" fill="#70644B"/><Circle cx="459" cy={y} r="2.5" fill="#70644B"/></G>)}</G><G fill="none" stroke="#5F753E" opacity=".16"><Path d="M36 135h50v32h42m224 0h42v-32h50M36 603h32v-21h28m288 0h28v21h32M49 760h45v18h38m216 0h38v-18h45"/><Path d="M34 142h31m355 0h25M34 610h20m372 0h20" strokeWidth="2"/></G><G opacity=".2" stroke="#A08145" fill="none"><Path d="m240 49 7 13-7 15-7-15Z"/><Line x1="234" x2="246" y1="61" y2="61"/></G></Svg></View>;
}

const frame = StyleSheet.create({
 outer:{padding:8,backgroundColor:'#252820',borderWidth:1,borderTopColor:'#66654F',borderLeftColor:'#535443',borderRightColor:'#11160F',borderBottomColor:'#0A0D08',borderRadius:4,position:'relative'},
 edge:{...StyleSheet.absoluteFill,borderWidth:2,borderColor:'#090D08',margin:3,borderRadius:2},
 screen:{flexGrow:1,position:'relative',overflow:'hidden',backgroundColor:'#090F09',borderWidth:1,borderRadius:2},
 innerLine:{...StyleSheet.absoluteFill,borderWidth:1,margin:3,opacity:.12},
 rivet:{width:5,height:5,borderRadius:3,backgroundColor:'#555844',borderWidth:1,borderTopColor:'#9A9270',borderLeftColor:'#817C5D',borderRightColor:'#0E120C',borderBottomColor:'#0A0D08',position:'absolute',zIndex:10,alignItems:'center',justifyContent:'center'},
 screw:{width:3,height:1,backgroundColor:'#151C10',transform:[{rotate:'-35deg'}]},
 tl:{top:2,left:2},tr:{top:2,right:2},bl:{bottom:2,left:2},br:{bottom:2,right:2},
 label:{fontFamily:'ShareTechMono_400Regular',fontSize:9,letterSpacing:1.4,textAlign:'center',marginBottom:6},
 corner:{position:'absolute',width:16,height:16,opacity:.8},cornerTL:{left:5,top:5,borderTopWidth:1,borderLeftWidth:1},cornerTR:{right:5,top:5,borderTopWidth:1,borderRightWidth:1},cornerBL:{left:5,bottom:5,borderBottomWidth:1,borderLeftWidth:1},cornerBR:{right:5,bottom:5,borderBottomWidth:1,borderRightWidth:1},
});
