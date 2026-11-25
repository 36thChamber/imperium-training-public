import React, { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AQUILA_STYLES, BEARD_STYLES, BODY_TYPES, COMPLEXIONS, EYE_SHAPES, FACE_SHAPES,
  HAIR_STYLES, MOUTH_SHAPES, MUSTACHE_STYLES,
} from '../avatarOptions';
import type { Armour, AvatarConfig, Faction } from '../domain';
import { C, s } from '../styles';
import { Button, Icon, Label } from '../ui';
import ComicAvatar from './ComicAvatar';
import { AquilaPreview } from './ComicAquila';

const SKIN_COLORS = {
  '#F1C6A4': 'Porcelana', '#DDAA80': 'Areia', '#C68D70': 'Pêssego', '#B98158': 'Dourado',
  '#8D5A3C': 'Bronze', '#59392C': 'Castanho', '#392A25': 'Castanho profundo',
};
const HAIR_COLORS = {
  '#211F20': 'Preto', '#44362F': 'Castanho escuro', '#654832': 'Castanho', '#C9AE79': 'Louro',
  '#DFE2DF': 'Branco', '#E4DDD1': 'Marfim', '#7D3C2A': 'Ruivo', '#80858A': 'Cinza',
};
const SECTIONS = [
  { id: 'face', label: 'Rosto' }, { id: 'body', label: 'Corpo' },
  { id: 'hair', label: 'Cabelo' }, { id: 'beard', label: 'Barba' },
  { id: 'armour', label: 'Armadura' },
] as const;
type Section = typeof SECTIONS[number]['id'];
type Option<Id extends string> = { id: Id; label: string };

function Choices<Id extends string>({ label, options, value, onSelect, prefix = '', thumbnail, tileWidth = 88 }: {
  label: string; options: readonly Option<Id>[]; value: Id; onSelect: (id: Id) => void;
  prefix?: string; thumbnail?: (id: Id) => ReactNode; tileWidth?: number;
}) {
  const buttons = options.map(option => {
    const selected = value === option.id;
    return <Pressable key={option.id}
      accessibilityRole="button" accessibilityLabel={prefix + option.label}
      accessibilityState={{ selected }} aria-selected={selected} onPress={() => onSelect(option.id)}
      style={[thumbnail ? e.tile : e.chip, thumbnail && { width: tileWidth }, selected && e.selected]}>
      {thumbnail && <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={e.tileArt}>
        {thumbnail(option.id)}
      </View>}
      <Text style={[e.choiceText, selected && e.activeText]}>{option.label}</Text>
      {selected && (thumbnail ? <View style={e.tick}><Icon name="checkmark" color={C.bg} size={12}/></View> : <Icon name="checkmark" size={13}/>)}
    </Pressable>;
  });
  return <View style={e.group}>
    <Label>{label.toLocaleUpperCase('pt-BR')}</Label>
    {thumbnail
      ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={e.tiles}>{buttons}</ScrollView>
      : <View style={e.chips}>{buttons}</View>}
  </View>;
}

function ColorChoices({ label, prefix, colors, value, onSelect }: {
  label: string; prefix: string; colors: Record<string, string>; value: string; onSelect: (color: string) => void;
}) {
  const selectedColor = value.toUpperCase();
  const palette = colors[selectedColor] ? colors : { [selectedColor]: 'Personalizada', ...colors };
  return <View style={e.group}>
    <View style={e.groupHeading}><Label>{label.toLocaleUpperCase('pt-BR')}</Label><Text style={e.colorName}>{palette[selectedColor]}</Text></View>
    <View style={e.chips}>
      {Object.entries(palette).map(([hex, name]) => {
        const selected = hex === selectedColor;
        return <Pressable key={hex} accessibilityRole="button" accessibilityLabel={prefix + ' ' + name}
          accessibilityState={{ selected }} aria-selected={selected}
          onPress={() => onSelect(hex)} style={[e.swatch, selected && e.selected]}>
          <View style={[e.color, { backgroundColor: hex }]}/>
          {selected && <View style={e.tick}><Icon name="checkmark" color={C.bg} size={12}/></View>}
        </Pressable>;
      })}
    </View>
  </View>;
}

/** Only the parent commits this appearance draft, on explicit save. */
export default function AvatarEditor({ value, faction, armour, onChange, onSave, onCancel }: {
  value: AvatarConfig; faction: Faction; armour: Armour; onChange: (next: AvatarConfig) => void;
  onSave: () => void; onCancel: () => void;
}) {
  const [section, setSection] = useState<Section>('face');
  const [showOutfit, setShowOutfit] = useState(false);
  const { height } = useWindowDimensions();
  const landscape = height < 480;
  const previewSize = Math.max(104, Math.min(194, Math.floor(height * 0.224)));
  const hasHelmet = armour.pattern !== 'scout' && armour.pattern !== 'novice';
  const change = <Key extends keyof AvatarConfig>(key: Key, next: AvatarConfig[Key]) => onChange({ ...value, [key]: next });
  const portrait = (size: number, changes: Partial<AvatarConfig> = {}, headOnly = true) => (
    <ComicAvatar {...value} {...changes} faction={faction} pattern={armour.pattern} armourId={armour.id}
      headOnly={headOnly} chestOnly={section === 'armour'} size={size} helmet={!headOnly && hasHelmet && value.helmet}/>
  );
  return <View style={e.root}>
    <View style={[e.workArea, landscape && e.horizontal]}>
      <View testID="avatar-preview" style={[e.stage, landscape && { width: 145 }]}>
        {portrait(previewSize, {}, !showOutfit)}
        {section !== 'armour' && <View style={e.modes}>
          {([{ full: false, text: 'Rosto', name: 'Ver rosto em detalhe' }, { full: true, text: 'Traje', name: 'Ver traje completo' }]).map(mode =>
            <Pressable key={mode.name} accessibilityRole="button" accessibilityLabel={mode.name}
              accessibilityState={{ selected: showOutfit === mode.full }} aria-selected={showOutfit === mode.full}
              onPress={() => setShowOutfit(mode.full)} style={[e.mode, showOutfit === mode.full && e.modeActive]}>
              <Text style={[e.modeText, showOutfit === mode.full && e.activeText]}>{mode.text}</Text>
            </Pressable>)}
        </View>}
      </View>
      <View style={e.panel}>
        <View style={e.tabs}>
          {SECTIONS.map(item => <Pressable key={item.id} accessibilityRole="tab"
            accessibilityLabel={'Editar ' + item.label.toLowerCase()}
            accessibilityState={{ selected: section === item.id }} aria-selected={section === item.id}
            onPress={() => { setSection(item.id); setShowOutfit(item.id === 'body' || item.id === 'armour'); }}
            style={[e.tab, section === item.id && e.selectedTab]}>
            <Text style={[e.tabText, section === item.id && e.activeText]}>{item.label}</Text>
          </Pressable>)}
        </View>
        <ScrollView key={section} style={e.scroll} contentContainerStyle={e.controls} keyboardShouldPersistTaps="handled">
          {section === 'face' && <>
            <ColorChoices label="Tom de pele" prefix="Tom de pele" colors={SKIN_COLORS} value={value.skin} onSelect={id => change('skin', id)}/>
            <Choices label="Formato da cabeça" options={FACE_SHAPES} value={value.face} onSelect={id => change('face', id)}/>
            <Choices label="Formato dos olhos" options={EYE_SHAPES} value={value.eyeShape} onSelect={id => change('eyeShape', id)}/>
            <Choices label="Formato dos lábios" options={MOUTH_SHAPES} value={value.mouthShape} onSelect={id => change('mouthShape', id)}/>
            <Choices label="Textura da pele" options={COMPLEXIONS} value={value.complexion} onSelect={id => change('complexion', id)}/>
          </>}
          {section === 'body' && <>
            <Choices label="Tipo de corpo" options={BODY_TYPES} value={value.bodyType} onSelect={id => change('bodyType', id)}/>
            {hasHelmet && <Text style={s.bodyMuted}>A armadura mantém a mesma estrutura nos três tipos de corpo.</Text>}
            <View style={e.helmetRow}>
              <View style={e.helmetText}>
                <Text style={s.body}>Exibir elmo</Text>
                <Text style={s.bodyMuted}>{hasHelmet ? armour.name : 'Disponível ao equipar uma armadura com elmo no Arsenal.'}</Text>
              </View>
              <Switch accessibilityLabel="Exibir elmo" disabled={!hasHelmet} value={hasHelmet && value.helmet}
                onValueChange={helmet => { change('helmet', helmet); setShowOutfit(true); }}
                trackColor={{ false: C.line, true: C.terminal }} thumbColor={C.pale}/>
            </View>
          </>}
          {section === 'armour' && <>
            <Choices label="Tipo de áquila" prefix="Áquila: " options={AQUILA_STYLES} tileWidth={108}
              value={value.aquilaStyle} onSelect={id => change('aquilaStyle', id)}
              thumbnail={aquilaStyle => <AquilaPreview style={aquilaStyle} size={76}/>}/>
            {!hasHelmet && <Text style={s.bodyMuted}>A áquila escolhida aparece ao equipar uma power armour.</Text>}
          </>}
          {section === 'hair' && <>
            <Choices label="Estilo do cabelo" options={HAIR_STYLES} value={value.hairStyle} onSelect={id => change('hairStyle', id)}
              thumbnail={hairStyle => portrait(72, { hairStyle })}/>
            <ColorChoices label="Cor do cabelo" prefix="Cabelo" colors={HAIR_COLORS} value={value.hair} onSelect={id => change('hair', id)}/>
          </>}
          {section === 'beard' && <>
            <Choices label="Estilo da barba" prefix="Barba: " options={BEARD_STYLES} value={value.beardStyle}
              onSelect={id => change('beardStyle', id)} thumbnail={beardStyle => portrait(72, { beardStyle })}/>
            <Choices label="Estilo do bigode" prefix="Bigode: " options={MUSTACHE_STYLES} value={value.mustacheStyle} onSelect={id => change('mustacheStyle', id)}/>
            <ColorChoices label="Cor da barba e do bigode" prefix="Cor da barba e do bigode" colors={HAIR_COLORS} value={value.beardColor} onSelect={id => change('beardColor', id)}/>
          </>}
        </ScrollView>
      </View>
    </View>
    <SafeAreaView edges={['bottom']} style={e.footer}>
      <Pressable accessibilityRole="button" accessibilityLabel="Cancelar alterações" style={e.cancel} onPress={onCancel}>
        <Text style={e.cancelText}>Cancelar</Text>
      </Pressable>
      <View style={e.save}><Button title="Salvar aparência" icon="checkmark" onPress={onSave}/></View>
    </SafeAreaView>
  </View>;
}

const e = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: '#10130F' },
  workArea: { flex: 1, minHeight: 0 }, horizontal: { flexDirection: 'row' },
  stage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', position: 'relative', backgroundColor: '#11120F', borderBottomColor: '#655738', borderBottomWidth: 1, overflow: 'hidden' },
  modes: { position: 'absolute', right: 6, bottom: 6, borderWidth: 1, borderColor: '#675A42', backgroundColor: '#141611' },
  mode: { paddingHorizontal: 7, minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }, modeActive: { backgroundColor: '#26301D' },
  modeText: { fontFamily: 'ShareTechMono_400Regular', fontSize: 12, color: '#CCC6AB' }, activeText: { color: C.phosphor },
  panel: { flex: 1, minHeight: 0, minWidth: 0 },
  tabs: { flexDirection: 'row', borderBottomColor: '#4C503D', borderBottomWidth: 1 },
  tab: { flex: 1, minHeight: 46, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  selectedTab: { backgroundColor: '#1D2719', borderBottomColor: C.phosphor },
  tabText: { color: '#ABB09B', fontSize: 14, fontFamily: 'ShareTechMono_400Regular' },
  scroll: { flex: 1 }, controls: { padding: 16, gap: 19 }, group: { gap: 8 },
  groupHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  colorName: { color: '#BEBAAB', fontSize: 12, fontFamily: 'Inter_400Regular' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, tiles: { flexDirection: 'row', gap: 7, paddingBottom: 2 },
  tile: { width: 88, alignItems: 'stretch', borderWidth: 1, borderColor: '#454A3B', backgroundColor: '#1B2018' },
  tileArt: { width: '100%', height: 83, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111410' },
  chip: { flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', borderColor: '#454A3B', minHeight: 44, borderWidth: 1, paddingHorizontal: 6, backgroundColor: '#1B2018' },
  choiceText: { color: '#D6D1BE', fontFamily: 'ShareTechMono_400Regular', fontSize: 13, lineHeight: 16, textAlign: 'center', padding: 5 },
  selected: { borderColor: C.phosphor, backgroundColor: '#24301B' },
  swatch: { width: 44, height: 44, borderColor: '#555746', borderWidth: 1, padding: 3 },
  color: { flex: 1 }, tick: { position: 'absolute', top: 0, right: 0, width: 16, height: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.phosphor },
  helmetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopColor: '#454A3B', borderTopWidth: 1, paddingTop: 14 }, helmetText: { flex: 1, gap: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 8, borderTopColor: '#4C503D', borderTopWidth: 1, backgroundColor: '#171D13' },
  cancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 5 }, cancelText: { fontFamily: 'ShareTechMono_400Regular', color: '#CECAB6', fontSize: 15 },
  save: { flex: 1 },
});
