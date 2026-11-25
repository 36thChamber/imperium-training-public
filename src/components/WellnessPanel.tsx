import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { localDateKey, type Session } from '../domain';
import { MUSCLE_GROUPS, type MuscleGroup } from '../muscles';
import { C, s } from '../styles';
import { Button, Label, Section, Sheet } from '../ui';
import {
  FEELINGS, recordFeeling, recordMeal, summarizeMuscles,
  type Feeling, type MealEntry, type MuscleActivity, type WellnessState,
} from '../wellness';

type WellnessProps = {
  wellness: WellnessState;
  sessions: Session[];
  water: number;
  onWaterChange: (delta: number) => void;
  onChange: (update: (old: WellnessState) => WellnessState) => void;
  section?: 'recovery' | 'nutrition';
  initialMapMode?: 'activity' | 'recovery';
};

type AnatomyRegion = readonly [MuscleGroup, string];
// Each path describes the left half of a muscle pair around the body's midline.
const FRONT: readonly AnatomyRegion[] = [
  ['Ombros', 'M37 39Q28 40 24 49L22 57Q29 57 35 51L39 43Z'],
  ['Peito', 'M48 40Q43 40 38 44L34 53Q37 60 48 60L49 55Z'],
  ['Bíceps', 'M26 58L32 55Q31 65 27 71L21 77Q20 70 22 64Z'],
  ['Antebraços', 'M21 78L26 73Q25 82 21 89L15 101L12 101Q13 91 17 84Z'],
  ['Abdômen', 'M48 62L48 69Q44 72 41 69L40 63ZM48 73L48 80Q44 82 41 78L41 73ZM48 83L48 94Q44 92 42 86L42 82ZM37 62L39 72L40 88L34 83L33 70Z'],
  ['Quadríceps', 'M34 94Q41 99 45 105L47 117L42 142Q38 145 35 137L32 117Q31 102 34 94Z'],
  ['Panturrilhas', 'M37 151Q42 155 42 166L39 187L36 190Q33 173 33 163Z'],
];
const BACK: readonly AnatomyRegion[] = [
  ['Ombros', 'M38 41Q30 39 25 46Q22 50 22 57L32 54Q35 48 38 41Z'],
  ['Costas', 'M43 35L49 38L49 61Q45 58 40 51L35 44ZM36 53Q41 56 48 64L47 81L42 91Q35 84 32 68L31 58Z'],
  ['Tríceps', 'M24 59Q28 57 32 56L30 66L27 74L21 77Q20 68 24 59Z'],
  ['Antebraços', 'M20 78L27 73L24 84L15 101L12 100Q14 88 20 78Z'],
  ['Glúteos', 'M34 88Q40 90 48 87L49 102Q45 109 36 107L32 103Q31 96 34 88Z'],
  ['Posteriores de coxa', 'M33 108Q40 111 46 108L45 124L41 143L37 145Q34 139 33 127Z'],
  ['Panturrilhas', 'M36 151Q39 149 41 154Q45 163 41 171L37 182Q33 178 32 168Q32 158 36 151Z'],
];
const SILHOUETTE = 'M43 28L43 34L36 38Q29 39 25 44L20 56L18 69L16 77L12 85L8 99L6 102L5 109L7 112L10 111L13 105L16 103L18 96L24 88L29 80L32 69L34 65L35 76L32 87Q29 98 31 113L33 130L35 142L34 151Q30 162 32 172L34 187L34 194L31 199L29 204Q31 207 39 206L42 203L42 196L43 183L46 171L46 155L43 147L46 136L49 119L50 110L51 119L54 136L57 147L54 155L54 171L57 183L58 196L58 203Q61 207 70 205L70 202L66 195L66 187L68 172Q70 162 66 151L65 142L67 130L69 113Q71 98 68 87L65 76L66 65L68 69L71 80L76 88L82 96L84 103L87 105L90 111L93 112L95 109L94 102L92 99L88 85L84 77L82 69L80 56L75 44Q71 39 64 38L57 34L57 28Z';
const HEAD = 'M50 4Q41 4 40 13L41 18L40 19L41 24L43 25Q45 31 50 32Q55 31 57 25L59 24L60 19L59 18L60 13Q59 4 50 4Z';
const INK = '#17251C';
const mapColors = { today: '#E2AD66', week: '#91AE79', quiet: '#465749' };
const feelingColors: Record<Feeling, string> = { rested: '#A7C97E', sensitive: '#E2AD66', tired: '#C47969' };

function regionColor(activity: MuscleActivity | undefined) {
  if (activity?.daysAgo === 0) return mapColors.today;
  return activity?.weekSets ? mapColors.week : mapColors.quiet;
}

function BodyFigure({ back, colors, selected, select }: {
  back?: boolean; colors: ReadonlyMap<MuscleGroup, string>; selected: MuscleGroup | null; select: (group: MuscleGroup) => void;
}) {
  const regions = back ? BACK : FRONT;
  return <View style={styles.figure}>
    <Svg height={212} width="100%" viewBox="0 0 100 213" accessible={false}>
      <Path d={SILHOUETTE} fill="#2E3B34" stroke="#748171" strokeWidth={0.85}/>
      <Path d={HEAD} fill="#37443B" stroke="#748171" strokeWidth={0.85}/>
      <Path d={back ? 'M43 25Q50 28 57 25M43 36L50 43L57 36' : 'M42 16L46 17M58 16L54 17M50 18L49 22L51 22M47 26Q50 27 53 26M43 35L46 39M57 35L54 39'}
        fill="none" stroke="#708070" strokeWidth={0.8}/>
      {regions.map(([group, d]) => {
        const stroke = group === selected ? '#F0EBD0' : INK;
        return <G key={group} onPress={() => select(group)} fill={colors.get(group) ?? mapColors.quiet}
          stroke={stroke} strokeWidth={group === selected ? 1.5 : 1.1} strokeLinejoin="round">
          <Path d={d}/><Path d={d} transform="translate(100 0) scale(-1 1)"/>
        </G>;
      })}
    </Svg>
    <Text style={styles.caption}>{back ? 'Posterior' : 'Anterior'}</Text>
  </View>;
}

const countSets = (count: number) => `${count} ${count === 1 ? 'série' : 'séries'}`;
const dayLabel = (at: string) => new Date(at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const quantity = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} aria-pressed={selected} accessibilityLabel={label}
    onPress={onPress} style={[styles.chip, selected && styles.selectedChip]}>
    <Text style={[styles.chipText, selected && { color: C.phosphor }]}>{label}</Text>
  </Pressable>;
}

function RecoveryPanel({ sessions, wellness, onChange, initialMapMode = 'activity' }: Pick<WellnessProps, 'sessions' | 'wellness' | 'onChange' | 'initialMapMode'>) {
  const [selection, setSelection] = useState<MuscleGroup | null>(null);
  const [map, setMap] = useState(initialMapMode);
  const [selecting, setSelecting] = useState(false);
  const today = localDateKey();
  const { activity, reports } = useMemo(() => ({
    activity: summarizeMuscles(sessions),
    reports: new Map(wellness.recovery.filter(entry => localDateKey(entry.at) === today)
      .map(entry => [entry.group, entry.feeling])),
  }), [sessions, wellness.recovery, today]);
  const active = activity.filter(row => row.weekSets);
  const byFeeling = map === 'recovery';
  const colors = new Map(activity.map(row => {
    const feeling = reports.get(row.group);
    const recoveryColor = feeling ? feelingColors[feeling] : mapColors.quiet;
    return [row.group, byFeeling ? recoveryColor : regionColor(row)] as const;
  }));
  const legend = byFeeling
    ? [...(Object.keys(FEELINGS) as Feeling[]).map(key => [feelingColors[key], FEELINGS[key]]), [mapColors.quiet, 'Sem relato hoje']]
    : [[mapColors.today, 'Hoje'], [mapColors.week, '1 a 6 dias atrás'], [mapColors.quiet, 'Sem série recente']];
  const latestActive = [...active].sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? ''))[0]?.group;
  const selected = selection ?? (byFeeling ? reports.keys().next().value : latestActive) ?? null;
  const row = activity.find(item => item.group === selected);
  const report = wellness.recovery.find(entry => entry.group === selected);
  const isToday = report && localDateKey(report.at) === today;
  function choose(group: MuscleGroup) {
    setSelection(group);
    setSelecting(false);
  }
  return <>
    <Section title="Zona de recuperação"/>
    <View style={s.card}>
      <View style={styles.mapHead}>
        <View style={styles.flex}><Label>Mapa muscular</Label><Text style={styles.mapTitle}>{byFeeling ? 'Sensação de hoje' : 'Últimos sete dias'}</Text></View>
        <Text style={styles.mapTotal} accessibilityLabel={`${byFeeling ? reports.size : active.length} grupos de ${MUSCLE_GROUPS.length}`}>{byFeeling ? reports.size : active.length} / {MUSCLE_GROUPS.length}</Text>
      </View>
      <View style={styles.switcher}>
        <Chip label="Atividade" selected={!byFeeling} onPress={() => setMap('activity')}/>
        <Chip label="Recuperação" selected={byFeeling} onPress={() => setMap('recovery')}/>
      </View>
      <View style={styles.scan}>
        <View style={styles.mapGrid} pointerEvents="none">{[0, 1, 2, 3, 4].map(line => <View key={line} style={styles.gridLine}/>)}</View>
        <BodyFigure colors={colors} selected={selected} select={choose}/>
        <BodyFigure back colors={colors} selected={selected} select={choose}/>
      </View>
      <View style={styles.legend}>
        {legend.map(([color, name]) =>
          <View key={name} style={styles.legendItem}><View style={[styles.dot, { backgroundColor: color }]}/><Text style={s.meta}>{name}</Text></View>)}
      </View>
      <Text style={s.bodyMuted}>{byFeeling ? 'Escolha um grupo e registre como você o sente hoje.' :
        active.length ? 'As cores mostram quando você registrou séries para cada grupo.' : 'Conclua séries e indique os músculos trabalhados para colorir o mapa.'}</Text>
      <Button secondary title="Escolher grupo muscular" icon="body-outline" onPress={() => setSelecting(true)}/>
      {row && <View style={styles.detail}>
        <Text style={s.cardTitle}>{row.group}</Text>
        <Text style={s.bodyMuted}>{countSets(row.weekSets)} nos últimos sete dias. {row.lastAt ? `Última atividade em ${dayLabel(row.lastAt)}.` : 'Sem atividade registrada.'}</Text>
        <Text style={[s.body, { marginTop: 8 }]}>Como você sente esse grupo hoje?</Text>
        <View style={styles.choices}>{(Object.entries(FEELINGS) as [Feeling, string][]).map(([key, label]) =>
          <Chip key={key} label={label} selected={!!isToday && report.feeling === key}
            onPress={() => { const at = new Date(); onChange(old => recordFeeling(old, row.group, key, at)); }}/>)}</View>
        <Text accessibilityLiveRegion="polite" style={s.meta}>{report ? `Relato ${isToday ? 'de hoje' : 'de ' + dayLabel(report.at)} · ${FEELINGS[report.feeling]}` : 'Nenhuma sensação registrada para este grupo.'}</Text>
      </View>}
    </View>
    <Sheet visible={selecting} title="Grupos musculares" onClose={() => setSelecting(false)}>
      {activity.map(item => {
        const feeling = reports.get(item.group);
        const reportText = feeling ? FEELINGS[feeling] : 'Sem relato';
        return <Pressable accessibilityRole="button" accessibilityLabel={item.group} key={item.group}
        onPress={() => choose(item.group)} style={styles.pickerRow}>
        <View style={[styles.dot, { backgroundColor: colors.get(item.group) }]}/><Text style={[s.body, styles.flex]}>{item.group}</Text>
        <Text style={s.meta}>{byFeeling ? reportText : countSets(item.weekSets)}</Text>
      </Pressable>;
      })}
    </Sheet>
  </>;
}

function readNumber(input: string): number | undefined {
  const value = input.trim();
  if (!value) return undefined;
  return /^\d{1,5}([.,]\d)?$/.test(value) && Number(value.replace(',', '.')) <= 99_999
    ? Number(value.replace(',', '.')) : NaN;
}

function NutritionPanel({ wellness, water, onWaterChange, onChange }: Omit<WellnessProps, 'sessions' | 'section'>) {
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState(false);
  const [draftId, setDraftId] = useState('');
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [error, setError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const today = localDateKey();
  const meals = wellness.meals.filter(entry => localDateKey(entry.at) === today);
  const sum = (field: 'protein' | 'calories', suffix: string) => {
    const recorded = meals.filter(entry => entry[field] !== undefined);
    return recorded.length ? quantity(recorded.reduce((total, meal) => total + (meal[field] ?? 0), 0)) + suffix : '—';
  };
  function openMeal() {
    setName(''); setKcal(''); setProtein(''); setError('');
    setDraftId(`meal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
    setEditing(true);
  }
  function saveMeal() {
    const calories = readNumber(kcal);
    const grams = readNumber(protein);
    if (!name.trim()) { setError('Escreva o que você comeu.'); return; }
    if (Number.isNaN(calories) || Number.isNaN(grams)) { setError('Use valores a partir de zero, com até uma casa decimal.'); return; }
    const entry: MealEntry = { id: draftId, name: name.trim(), calories, protein: grams, at: new Date().toISOString() };
    onChange(old => recordMeal(old, entry));
    setEditing(false);
  }
  const mealList = (entries: MealEntry[], removable = false) => entries.map(entry =>
    <View key={entry.id} style={styles.meal}>
      <Text style={s.body}>{entry.name}</Text>
      <Text style={s.meta}>{[removable ? dayLabel(entry.at) : null, new Date(entry.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        entry.calories === undefined ? null : quantity(entry.calories) + ' kcal', entry.protein === undefined ? null : quantity(entry.protein) + ' g de proteína'].filter(Boolean).join(' · ')}</Text>
      {removable && (confirmRemove === entry.id
        ? <View style={styles.choices}><Chip label="Confirmar exclusão" onPress={() => {
          onChange(old => ({ ...old, meals: old.meals.filter(item => item.id !== entry.id) })); setConfirmRemove(null);
        }}/><Chip label="Manter" onPress={() => setConfirmRemove(null)}/></View>
        : <Pressable accessibilityRole="button" accessibilityLabel={`Excluir refeição ${entry.name}`} onPress={() => setConfirmRemove(entry.id)} style={styles.inlineButton}><Text style={s.link}>Excluir</Text></Pressable>)}
    </View>);
  return <>
    <Section title="Nutrição" action={wellness.meals.length ? 'Histórico' : undefined} onPress={() => { setConfirmRemove(null); setHistory(true); }}/>
    <View style={s.card}>
      <Label>Registros de hoje</Label>
      <Text style={styles.mapTitle}>{meals.length} {meals.length === 1 ? 'refeição' : 'refeições'}</Text>
      <View style={styles.nutrients}>
        <View style={styles.flex}><Text style={s.meta}>Energia informada</Text><Text style={styles.value}>{sum('calories', ' kcal')}</Text></View>
        <View style={styles.flex}><Text style={s.meta}>Proteína informada</Text><Text style={styles.value}>{sum('protein', ' g')}</Text></View>
      </View>
      {mealList(meals.slice(0, 3))}
      <Button title="Registrar refeição" icon="restaurant-outline" onPress={openMeal}/>
      <View style={styles.detail}>
        <View style={s.rowBetween}><Text style={s.cardTitle}>Água de hoje</Text><Text style={styles.value}>{quantity(water)} ml</Text></View>
        <View style={styles.choices}>
          <Button secondary title="+ 250 ml" disabled={water >= 10_000} onPress={() => onWaterChange(250)}/>
          <Button secondary title="− 250 ml" disabled={water <= 0} onPress={() => onWaterChange(-250)}/>
        </View>
      </View>
    </View>
    <Sheet visible={editing} title="Registrar refeição" onClose={() => setEditing(false)}>
      <Label>O que você comeu?</Label>
      <TextInput accessibilityLabel="Descrição da refeição" style={s.input} maxLength={120} placeholder="Ex.: arroz, feijão e ovos"
        placeholderTextColor={C.muted} value={name} onChangeText={setName}/>
      <Label>Energia em kcal (opcional)</Label>
      <TextInput accessibilityLabel="Energia em kcal" style={s.input} keyboardType="decimal-pad" maxLength={7} value={kcal} onChangeText={setKcal}/>
      <Label>Proteína em gramas (opcional)</Label>
      <TextInput accessibilityLabel="Proteína em gramas" style={s.input} keyboardType="decimal-pad" maxLength={7} value={protein} onChangeText={setProtein}/>
      {!!error && <Text accessibilityLiveRegion="polite" style={{ color: C.amber }}>{error}</Text>}
      <Button title="Salvar refeição" onPress={saveMeal}/>
    </Sheet>
    <Sheet visible={history} title="Histórico de refeições" onClose={() => setHistory(false)}>
      {wellness.meals.length ? mealList(wellness.meals, true) : <Text style={s.bodyMuted}>Nenhuma refeição registrada.</Text>}
    </Sheet>
  </>;
}

export default function WellnessPanel({ section, ...props }: WellnessProps) {
  return <>
    {section !== 'nutrition' && <RecoveryPanel {...props}/>}
    {section !== 'recovery' && <NutritionPanel {...props}/>}
  </>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  mapHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  mapTitle: { ...s.cardTitle, marginTop: 4, fontSize: 17 },
  mapTotal: { color: C.phosphor, fontFamily: 'ShareTechMono_400Regular', fontSize: 15 },
  switcher: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  scan: { flexDirection: 'row', paddingVertical: 10, borderWidth: 1, borderColor: C.line, backgroundColor: '#0D160F' },
  mapGrid: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-evenly' },
  gridLine: { height: 1, backgroundColor: '#17271A' },
  figure: { flex: 1, alignItems: 'center' },
  caption: { color: '#9EAF91', fontFamily: 'ShareTechMono_400Regular', fontSize: 12, letterSpacing: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginVertical: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { height: 8, width: 8, borderRadius: 2 },
  detail: { borderTopWidth: 1, borderTopColor: C.line, marginTop: 14, paddingTop: 12, gap: 4 },
  choices: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginVertical: 3 },
  chip: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: C.line, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: C.bg },
  selectedChip: { borderColor: C.terminal, backgroundColor: '#1F321A' },
  chipText: { ...s.bodyMuted, fontSize: 12 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 10, borderBottomWidth: 1, borderColor: C.line },
  nutrients: { flexDirection: 'row', gap: 14, marginVertical: 14 },
  value: { color: C.phosphor, fontFamily: 'ShareTechMono_400Regular', fontSize: 17 },
  meal: { borderTopWidth: 1, borderColor: C.line, paddingVertical: 8, gap: 2 },
  inlineButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
});
