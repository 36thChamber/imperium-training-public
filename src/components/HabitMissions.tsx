import { Pressable, Text, View } from 'react-native';
import type { AppState } from '../domain';
import { localDateKey } from '../trainingRecords';
import { summarizeMuscles } from '../wellness';
import { C, s } from '../styles';
import { Icon, Section } from '../ui';

type Destination = 'goals' | 'activity' | 'recovery' | 'nutrition';

export function HabitMissions({ state, weekDays, onOpen }: { state: AppState; weekDays: number; onOpen: (destination: Destination) => void }) {
  const goal = state.goals.weeklyDays;
  const today = localDateKey();
  const groups = summarizeMuscles(state.sessions).filter(group => group.weekSets > 0).length;
  const checkins = state.wellness.recovery.filter(item => localDateKey(item.at) === today).length;
  const meals = state.wellness.meals.filter(item => localDateKey(item.at) === today).length;
  const water = state.waterDate === today ? state.water : 0;
  const items = [
    { title: 'Consistência', detail: goal ? `${weekDays} de ${goal} ${goal === 1 ? 'dia' : 'dias'} de treino nesta semana` : 'Defina sua frequência semanal em Objetivos.', done: !!goal && weekDays >= goal, action: 'goals', icon: 'calendar-outline' },
    { title: 'Grupos musculares', detail: `${groups} ${groups === 1 ? 'grupo registrado' : 'grupos registrados'} nos últimos 7 dias`, done: groups > 0, action: 'activity', icon: 'body-outline' },
    { title: 'Recuperação', detail: checkins ? `${checkins} ${checkins === 1 ? 'avaliação registrada' : 'avaliações registradas'} hoje` : 'Registre como você sente um grupo muscular hoje.', done: checkins > 0, action: 'recovery', icon: 'pulse-outline' },
    { title: 'Nutrição', detail: meals || water ? `${meals} ${meals === 1 ? 'refeição' : 'refeições'} · ${water} ml de água hoje` : 'Anote suas refeições e a água de hoje.', done: meals > 0 || water > 0, action: 'nutrition', icon: 'restaurant-outline' },
  ] as const;
  return <>
    <Section title="Missões de acompanhamento"/>
    <View style={s.card}>
      {items.map(item => <Pressable key={item.title} accessibilityRole="button" accessibilityLabel={`${item.title}. ${item.detail}`} onPress={() => onOpen(item.action)} style={s.campaignMission}>
        <View style={s.smallSeal}><Icon name={item.icon} size={19} color={item.done ? C.phosphor : C.gold}/></View>
        <View style={{ flex: 1 }}><Text style={s.cardTitle}>{item.title}</Text><Text style={s.bodyMuted}>{item.detail}</Text></View>
        <Icon name="chevron-forward" size={16}/>
      </Pressable>)}
    </View>
  </>;
}
