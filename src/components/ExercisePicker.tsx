import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { Exercise } from '../domain';
import { exerciseIdForName, normalizeExerciseName } from '../exercises';
import { MUSCLE_GROUPS, type MuscleGroup } from '../muscles';
import { C, s } from '../styles';
import { Button, Icon, Label } from '../ui';

type Props = { catalog: Exercise[]; remaining: number; routine?: boolean; onAdd: (exercise: Exercise) => void; onClose: () => void };

export default function ExercisePicker({ catalog, remaining, routine, onAdd, onClose }: Props) {
  const [name, setName] = useState('');
  const [groups, setGroups] = useState<MuscleGroup[]>([]);
  const [showCatalog, setShowCatalog] = useState(false);
  const [setsText, setSetsText] = useState('1'), [repsText, setRepsText] = useState('');
  const query = normalizeExerciseName(name);
  const matches = catalog.filter(item => normalizeExerciseName(item.name).includes(query));
  const exact = catalog.find(item => normalizeExerciseName(item.name) === query);
  const sets = Number(setsText), reps = Number(repsText);
  const validSets = Number.isInteger(sets) && sets >= 1 && sets <= remaining;
  const validReps = !repsText || (Number.isInteger(reps) && reps >= 1 && reps <= 1000);

  function choose(item: Exercise) {
    setName(item.name);
    setGroups(MUSCLE_GROUPS.filter(group => item.muscleGroups?.includes(group)));
    setShowCatalog(false);
  }

  return <View style={[s.card, { gap: 12, marginVertical: 12 }]}>
    <View style={s.rowBetween}>
      <Text style={s.cardTitle}>Adicionar exercício</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar seleção de exercício" onPress={onClose} style={s.iconButton}>
        <Icon name="close" color={C.muted} />
      </Pressable>
    </View>
    <Label>NOME DO EXERCÍCIO</Label>
    <TextInput accessibilityLabel="Nome do exercício" value={name} maxLength={70} style={s.input}
      placeholder="Digite o nome do seu exercício" placeholderTextColor={C.muted}
      onChangeText={value => { setName(value); setGroups([]); setShowCatalog(true); }} />
    <Pressable accessibilityRole="button" onPress={() => setShowCatalog(!showCatalog)} style={s.textButton}>
      <Text style={s.link}>{showCatalog ? 'Recolher catálogo' : 'Consultar catálogo'}</Text>
    </Pressable>
    {showCatalog && matches.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.name}
      onPress={() => choose(item)} style={s.campaignMission}>
      <Icon name="barbell-outline" size={17}/><Text style={[s.body, { flex: 1 }]}>{item.name}</Text>
    </Pressable>)}
    <Label>MÚSCULOS TRABALHADOS · OPCIONAL</Label>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
      {MUSCLE_GROUPS.map(group => {
        const selected = groups.includes(group);
        return <Pressable key={group} accessibilityRole="checkbox" accessibilityLabel={group}
          accessibilityState={{ checked: selected }} aria-checked={selected}
          style={{ borderWidth: 1, borderColor: selected ? C.phosphor : C.line, minHeight: 44,
            paddingHorizontal: 10, justifyContent: 'center', backgroundColor: selected ? C.panel : C.bg }}
          onPress={() => setGroups(old => old.includes(group) ? old.filter(value => value !== group) : [...old, group])}>
          <Text style={[s.meta, selected && { color: C.phosphor }]}>{group}</Text>
        </Pressable>;
      })}
    </View>
    {routine && <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1, gap: 5 }}><Label>SÉRIES</Label>
        <TextInput accessibilityLabel="Séries na rotina" style={s.input} value={setsText} maxLength={3}
          onChangeText={setSetsText} keyboardType="number-pad" selectTextOnFocus /></View>
      <View style={{ flex: 1, gap: 5 }}><Label>REPETIÇÕES</Label>
        <TextInput accessibilityLabel="Repetições na rotina" style={s.input} value={repsText} maxLength={4}
          onChangeText={setRepsText} keyboardType="number-pad" placeholder="Opcional" placeholderTextColor={C.muted}/></View>
    </View>}
    {!validSets && <Text style={s.errorText}>Você pode incluir até {remaining} séries.</Text>}
    {!validReps && <Text style={s.errorText}>Use de 1 a 1.000 repetições ou deixe o campo vazio.</Text>}
    <Button title={routine ? 'Adicionar à rotina' : 'Adicionar ao treino'} disabled={!query || !validSets || !validReps}
      onPress={() => onAdd({ id: exact?.id ?? exerciseIdForName(name), name: exact?.name ?? name.trim(),
        muscleGroups: groups, muscle: groups.join(', '), equipment: exact?.equipment ?? '', sets, reps })}/>
  </View>;
}
