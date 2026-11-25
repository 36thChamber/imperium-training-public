import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Exercise, Session } from '../domain';
import { exerciseIdForName } from '../exercises';
import {
  bestLoad, bodyweightProgress, recordWeight, setStrengthGoal, validGoalKg, weeklyTrainingDays,
  type GoalBook, type StrengthGoal,
} from '../goals';
import { C, s } from '../styles';
import { Button, Icon, Label, Progress, Section, Sheet, type IconName } from '../ui';

type GoalType = 'strength' | 'bodyweight' | 'consistency';
type Editor = GoalType | 'weigh';
type NamedExercise = Pick<Exercise, 'id' | 'name'>;
type Props = {
  book: GoalBook;
  sessions: Session[];
  exercises: NamedExercise[];
  onChange: (update: (book: GoalBook) => GoalBook) => void;
};

const TYPES: Record<GoalType, { title: string; icon: IconName; empty: string; add: string }> = {
  strength: { title: 'Força', icon: 'barbell-outline', empty: 'Escolha um exercício e a carga que quer alcançar em uma série.', add: 'Criar objetivo de força' },
  bodyweight: { title: 'Peso corporal', icon: 'scale-outline', empty: 'Defina seu peso de partida e o peso que quer alcançar.', add: 'Criar objetivo de peso corporal' },
  consistency: { title: 'Consistência', icon: 'calendar-outline', empty: 'Escolha quantos dias por semana você quer registrar um treino.', add: 'Criar objetivo de consistência' },
};
const kgText = (kg: number) => kg.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const numberFromText = (text: string) => /^\d+(?:[.,]\d{1,2})?$/.test(text.trim()) ? Number(text.trim().replace(',', '.')) : NaN;
const labelDay = (date: string) => new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
const searchKey = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

function GoalHeader({ type }: { type: GoalType }) {
  return <View style={g.heading}>
    <View style={g.emblem}><Icon name={TYPES[type].icon} color={C.phosphor} size={21}/></View>
    <Text accessibilityRole="header" style={s.sectionTitle}>{TYPES[type].title}</Text>
  </View>;
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={g.action}>
    <Text style={s.link}>{label}</Text><Icon name="chevron-forward" size={14}/>
  </Pressable>;
}

function NumericField({ label, text, onChange }: { label: string; text: string; onChange: (value: string) => void }) {
  return <View><Label>{label}</Label><TextInput accessibilityLabel={label} style={s.input} value={text} onChangeText={onChange}
    keyboardType="decimal-pad" placeholder="0,0" placeholderTextColor={C.muted} maxLength={8}/></View>;
}

type PreviewProps = Pick<Props, 'book' | 'sessions'> & { onOpen: () => void };

function PreviewRow({ type, title, detail, progress }: { type: GoalType; title: string; detail: string; progress: number }) {
  return <View style={g.previewRow}>
    <View style={s.row}><Icon name={TYPES[type].icon} size={17}/><Text style={g.previewTitle}>{title}</Text></View>
    <Text style={s.body}>{detail}</Text>
    <Progress value={progress}/>
  </View>;
}

export function GoalsPreview({ book, sessions, onOpen }: PreviewProps) {
  const first = book.strength[0];
  const weight = book.bodyweight;
  const hasGoals = !!(first || weight || book.weeklyDays);
  const best = first ? bestLoad(sessions, first.exerciseId) : null;
  const latest = book.weights[book.weights.length - 1];
  const days = book.weeklyDays ? weeklyTrainingDays(sessions).size : 0;
  return <>
    <Section title="Seus objetivos" action={hasGoals ? 'Ver objetivos' : undefined} onPress={hasGoals ? onOpen : undefined}/>
    <View style={s.card}>
      {first && <PreviewRow type="strength" title={first.exerciseName}
        detail={(best === null ? 'Sem série registrada' : 'Melhor série · ' + kgText(best) + ' kg') + ' · Alvo ' + kgText(first.targetKg) + ' kg'}
        progress={(best ?? 0) / first.targetKg}/>}
      {book.strength.length > 1 && <Text style={s.meta}>Outros objetivos de força · {book.strength.length - 1}</Text>}
      {weight && <PreviewRow type="bodyweight" title="Peso corporal"
        detail={(latest ? 'Última pesagem · ' + kgText(latest.kg) + ' kg' : 'Sem pesagem') + ' · Alvo ' + kgText(weight.targetKg) + ' kg'}
        progress={latest ? bodyweightProgress(weight, latest.kg) : 0}/>}
      {book.weeklyDays !== null && <PreviewRow type="consistency" title="Consistência"
        detail={days + ' de ' + book.weeklyDays + (book.weeklyDays === 1 ? ' dia' : ' dias') + ' nesta semana'}
        progress={days / book.weeklyDays}/>}
      {!hasGoals && <>
        <Text style={s.body}>Escolha uma meta de força, peso corporal ou frequência de treino.</Text>
        <Button title="Definir meu objetivo" icon="add-outline" onPress={onOpen}/>
      </>}
    </View>
  </>;
}

export function GoalsPanel({ book, sessions, exercises, onChange }: Props) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [exerciseId, setExerciseId] = useState('');
  const [target, setTarget] = useState('');
  const [start, setStart] = useState('');
  const [error, setError] = useState('');
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const latest = book.weights[book.weights.length - 1];
  const days = weeklyTrainingDays(sessions).size;
  const loads = useMemo(() => new Map(book.strength.map(goal => [goal.exerciseId, bestLoad(sessions, goal.exerciseId)])), [book.strength, sessions]);
  const choices = useMemo(() => {
    const byId = new Map(exercises.map(item => [item.id, item]));
    for (const session of sessions) for (const set of session.sets) {
      if (set.exerciseName && !byId.has(set.exerciseId)) byId.set(set.exerciseId, { id: set.exerciseId, name: set.exerciseName });
    }
    return [...byId.values()];
  }, [exercises, sessions]);
  const suggestions = choices.filter(choice => searchKey(choice.name).includes(searchKey(name.trim()))).slice(0, 6);

  function openEditor(next: Editor, goal?: StrengthGoal) {
    setConfirmRemoval(false); setError('');
    setEditingId(goal?.exerciseId ?? null);
    setName(goal?.exerciseName ?? ''); setExerciseId(goal?.exerciseId ?? '');
    if (next === 'strength') setTarget(goal ? kgText(goal.targetKg).replace(/\./g, '') : '');
    if (next === 'bodyweight') {
      setStart(String(book.bodyweight?.startKg ?? latest?.kg ?? '').replace('.', ','));
      setTarget(String(book.bodyweight?.targetKg ?? '').replace('.', ','));
    }
    if (next === 'consistency') setTarget(String(book.weeklyDays ?? ''));
    if (next === 'weigh') setTarget('');
    setEditor(next);
  }

  function save() {
    const amount = numberFromText(target);
    if (editor === 'strength') {
      if (!name.trim()) { setError('Informe o nome do exercício.'); return; }
      if (!validGoalKg(amount)) { setError('Informe uma carga maior que zero, até 2.000 kg.'); return; }
      const selected = choices.find(item => searchKey(item.name) === searchKey(name.trim()));
      const goal = { exerciseId: editingId || exerciseId || selected?.id || exerciseIdForName(name.trim()), exerciseName: selected?.name || name.trim(), targetKg: amount };
      onChange(current => setStrengthGoal(current, goal));
    } else if (editor === 'bodyweight') {
      const startingKg = numberFromText(start);
      if (!validGoalKg(startingKg) || !validGoalKg(amount)) { setError('Informe os dois pesos em kg, maiores que zero e até 2.000 kg.'); return; }
      if (amount === startingKg) { setError('Escolha um alvo diferente do peso de partida.'); return; }
      onChange(current => {
        const withStart = current.bodyweight || current.weights.length ? current : recordWeight(current, startingKg);
        return { ...withStart, bodyweight: { startKg: startingKg, targetKg: amount } };
      });
    } else if (editor === 'consistency') {
      if (!Number.isInteger(amount) || amount < 1 || amount > 7) { setError('Escolha de 1 a 7 dias por semana.'); return; }
      onChange(current => ({ ...current, weeklyDays: amount }));
    } else if (editor === 'weigh') {
      if (!validGoalKg(amount)) { setError('Informe o peso medido em kg, maior que zero e até 2.000 kg.'); return; }
      onChange(current => recordWeight(current, amount));
    }
    setEditor(null);
  }

  function removeGoal() {
    if (!confirmRemoval) { setConfirmRemoval(true); return; }
    if (editor === 'strength') onChange(current => ({ ...current, strength: current.strength.filter(goal => goal.exerciseId !== editingId) }));
    if (editor === 'bodyweight') onChange(current => ({ ...current, bodyweight: null }));
    if (editor === 'consistency') onChange(current => ({ ...current, weeklyDays: null }));
    setEditor(null);
  }

  const existing = (editor === 'strength' && !!editingId) || (editor === 'bodyweight' && !!book.bodyweight) || (editor === 'consistency' && !!book.weeklyDays);
  const weightProgress = book.bodyweight && latest ? bodyweightProgress(book.bodyweight, latest.kg) : 0;
  const sheetTitle = editor === 'weigh' ? 'Registrar peso' : editor ? 'Objetivo de ' + TYPES[editor].title.toLowerCase() : '';
  return <View>
    <Text accessibilityRole="header" style={s.title}>Objetivos</Text>
    <Text style={s.intro}>Acompanhe suas metas com os treinos e as pesagens que você registrar.</Text>

    <View style={s.card}>
      <GoalHeader type="strength"/>
      {book.strength.length === 0 && <Text style={s.bodyMuted}>{TYPES.strength.empty}</Text>}
      {book.strength.map(goal => {
        const best = loads.get(goal.exerciseId) ?? null;
        return <View key={goal.exerciseId} style={g.detail}>
          <Text style={s.cardTitle}>{goal.exerciseName}</Text>
          <Text style={s.body}>{best === null ? 'Sem série registrada' : 'Melhor série · ' + kgText(best) + ' kg'}</Text>
          <Progress value={(best ?? 0) / goal.targetKg}/>
          <Text style={s.meta}>{best !== null && best >= goal.targetKg ? 'Objetivo atingido' : 'Alvo'} · {kgText(goal.targetKg)} kg</Text>
          <Action label={'Editar objetivo de ' + goal.exerciseName} onPress={() => openEditor('strength', goal)}/>
        </View>;
      })}
      <Action label={TYPES.strength.add} onPress={() => openEditor('strength')}/>
    </View>
    <View style={s.card}>
      <GoalHeader type="bodyweight"/>
      {book.bodyweight ? <View style={g.detail}>
        <Text style={s.cardTitle}>Alvo de {kgText(book.bodyweight.targetKg)} kg</Text>
        <Text style={s.body}>{latest ? 'Última pesagem · ' + kgText(latest.kg) + ' kg' : 'Nenhuma pesagem registrada'}</Text>
        <Progress value={weightProgress}/>
        <Text style={s.meta}>Partida · {kgText(book.bodyweight.startKg)} kg{weightProgress >= 1 ? ' · Objetivo atingido' : ''}</Text>
      </View> : <Text style={s.bodyMuted}>{TYPES.bodyweight.empty}</Text>}
      <Action label={book.bodyweight ? 'Editar objetivo de peso corporal' : TYPES.bodyweight.add} onPress={() => openEditor('bodyweight')}/>
      <Button title="Registrar peso" secondary icon="scale-outline" onPress={() => openEditor('weigh')}/>
      {latest && <View style={g.detail}><Label>Últimas pesagens</Label>
        {book.weights.slice(-3).reverse().map(reading => <View key={reading.day} style={s.rowBetween}>
          <Text style={s.meta}>{labelDay(reading.day)}</Text><Text style={s.body}>{kgText(reading.kg)} kg</Text>
        </View>)}
      </View>}
    </View>
    <View style={s.card}>
      <GoalHeader type="consistency"/>
      {book.weeklyDays ? <View style={g.detail}>
        <Text style={s.cardTitle}>{days} de {book.weeklyDays} {book.weeklyDays === 1 ? 'dia' : 'dias'} nesta semana</Text>
        <Progress value={days / book.weeklyDays}/>
        <Text style={s.meta}>{days >= book.weeklyDays ? 'Meta da semana atingida' : 'Segunda a domingo · um registro por dia conta para a meta'}</Text>
      </View> : <Text style={s.bodyMuted}>{TYPES.consistency.empty}</Text>}
      <Action label={book.weeklyDays ? 'Editar objetivo de consistência' : TYPES.consistency.add} onPress={() => openEditor('consistency')}/>
    </View>
    <Sheet visible={editor !== null} title={sheetTitle} onClose={() => setEditor(null)}>
      {editor === 'strength' && <>
        <Label>Exercício</Label>
        {editingId ? <Text style={s.cardTitle}>{name}</Text> : <>
          <TextInput accessibilityLabel="Exercício do objetivo" value={name} onChangeText={value => { setName(value); setExerciseId(''); }}
            maxLength={70} style={s.input} placeholder="Buscar ou digitar um exercício" placeholderTextColor={C.muted}/>
          {!exerciseId && suggestions.map(item => <Pressable accessibilityRole="button" accessibilityLabel={'Escolher ' + item.name}
            onPress={() => { setName(item.name); setExerciseId(item.id); }} key={item.id} style={g.option}><Text style={s.body}>{item.name}</Text></Pressable>)}
        </>}
        <NumericField label="Carga alvo (kg)" text={target} onChange={setTarget}/>
      </>}
      {editor === 'bodyweight' && <>
        {book.bodyweight ? <Text style={s.body}>Peso de partida · {kgText(book.bodyweight.startKg)} kg</Text> :
          latest ? <Text style={s.body}>Partida pela pesagem de {labelDay(latest.day)} · {kgText(latest.kg)} kg</Text> :
            <NumericField label="Peso de partida hoje (kg)" text={start} onChange={setStart}/>}
        <NumericField label="Peso alvo (kg)" text={target} onChange={setTarget}/>
      </>}
      {editor === 'consistency' && <>
        <Label>Dias de treino por semana</Label>
        <View style={g.days}>{[1, 2, 3, 4, 5, 6, 7].map(value => <Pressable key={value} accessibilityRole="button"
          accessibilityLabel={value + (value === 1 ? ' dia por semana' : ' dias por semana')} accessibilityState={{ selected: target === String(value) }}
          onPress={() => setTarget(String(value))} style={[g.day, target === String(value) && g.selected]}><Text style={s.body}>{value}</Text></Pressable>)}</View>
        <Text style={s.bodyMuted}>A semana começa na segunda-feira. Dois treinos no mesmo dia contam uma vez.</Text>
      </>}
      {editor === 'weigh' && <>
        <NumericField label="Peso de hoje (kg)" text={target} onChange={setTarget}/>
        <Text style={s.bodyMuted}>Uma nova pesagem hoje atualiza o registro deste dia.</Text>
      </>}
      {error !== '' && <Text accessibilityRole="alert" style={g.error}>{error}</Text>}
      <Button title={editor === 'weigh' ? 'Salvar pesagem' : 'Salvar objetivo'} onPress={save}/>
      {existing && <Action label={confirmRemoval ? 'Confirmar remoção do objetivo' : 'Remover objetivo'} onPress={removeGoal}/>}
    </Sheet>
  </View>;
}

const g = StyleSheet.create({
  previewRow: { gap: 7, paddingVertical: 9 },
  previewTitle: { ...s.cardTitle, flexShrink: 1 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  emblem: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line, backgroundColor: C.bg },
  detail: { gap: 8, borderTopWidth: 1, borderColor: C.line, paddingTop: 11, marginTop: 8 },
  action: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 8 },
  option: { minHeight: 44, justifyContent: 'center', borderBottomWidth: 1, borderColor: C.line, paddingHorizontal: 8 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  day: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, borderWidth: 1, borderColor: C.line },
  selected: { borderColor: C.phosphor, backgroundColor: C.raised },
  error: { color: '#F4B58E', fontSize: 14 },
});
