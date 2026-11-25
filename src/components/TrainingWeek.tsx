import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, s } from '../styles';
import { Button, Icon, Label } from '../ui';
import { localDateKey } from '../trainingRecords';

type Props = {
  days: Set<string>;
  goal: number | null;
  portrait: ReactNode;
  faction: string;
  rank: string;
  active: boolean;
  onStart: () => void;
  onCampaign: () => void;
};

export function TrainingWeek({ days, goal, portrait, faction, rank, active, onStart, onCampaign }: Props) {
  const today = new Date();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (today.getDay() + 6) % 7);
  const todayKey = localDateKey(today);
  return <View style={st.panel}>
    <View style={st.top}>
      <View style={st.heading}>
        <Label>{faction}</Label>
        <Text accessibilityRole="header" style={s.title}>Sua semana</Text>
        <Text style={s.meta}>{today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Ver campanha · ${rank}`} onPress={onCampaign} style={st.portrait}>{portrait}</Pressable>
    </View>
    <View style={st.body}>
      <View style={s.rowBetween}>
        <Text style={s.cardTitle}>Frequência</Text>
        <Text style={st.count}>{days.size}{goal ? ` / ${goal}` : ''} {days.size === 1 && !goal ? 'dia' : 'dias'}</Text>
      </View>
      <View style={s.week}>
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, index) => {
          const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index);
          const key = localDateKey(date);
          const trained = days.has(key);
          return <View key={day} style={s.day} accessible accessibilityLabel={`${day}, dia ${date.getDate()}${key === todayKey ? ', hoje' : ''}, ${trained ? 'com treino' : 'sem treino registrado'}`}>
            <Text style={s.dayLabel}>{day}</Text>
            <View style={[s.dayCircle, trained && s.dayDone, key === todayKey && s.dayToday]}>
              {trained ? <Icon name="checkmark" color={C.bg} size={16}/> : <Text style={s.dayNumber}>{date.getDate()}</Text>}
            </View>
          </View>;
        })}
      </View>
      <Button title={active ? 'Retomar treino' : 'Registrar treino livre'} icon={active ? 'play' : 'add'} onPress={onStart}/>
    </View>
  </View>;
}

const st = StyleSheet.create({
  panel: { backgroundColor: C.panel, borderWidth: 1, borderTopWidth: 2, borderTopColor: C.gold, borderColor: C.line },
  top: { minHeight: 108, paddingLeft: 15, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: C.line, backgroundColor: '#162015' },
  heading: { flex: 1, gap: 3, paddingVertical: 12 },
  portrait: { width: '32%', maxWidth: 120, height: 106, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-start', alignSelf: 'flex-end' },
  body: { padding: 14 },
  count: { fontFamily: 'ShareTechMono_400Regular', color: C.phosphor, fontSize: 19 },
});
