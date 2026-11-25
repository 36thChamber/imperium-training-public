export const MUSCLE_GROUPS = [
  'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Antebraços',
  'Abdômen', 'Quadríceps', 'Posteriores de coxa', 'Glúteos', 'Panturrilhas',
] as const;

export type MuscleGroup = typeof MUSCLE_GROUPS[number];

function key(text: string) {
  return text.trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const muscleLabels = new Map(MUSCLE_GROUPS.map(label => [key(label), label]));
muscleLabels.set('posterior', 'Posteriores de coxa');
muscleLabels.set('posterior de coxa', 'Posteriores de coxa');
muscleLabels.set('core', 'Abdômen');

export function resolveMuscleGroup(value: unknown): MuscleGroup | null {
  return typeof value === 'string' ? muscleLabels.get(key(value)) ?? null : null;
}

// Old logs stored only an exercise ID. Only recover the principal group for
// known catalogue IDs; a generic/custom exercise has no inferable group.
const legacyMuscles = new Map<string, MuscleGroup>([
  ['goblet-squat', 'Quadríceps'], ['dumbbell-row', 'Costas'], ['dumbbell-press', 'Peito'],
  ['bench-press', 'Peito'], ['shoulder-press', 'Ombros'], ['triceps-pushdown', 'Tríceps'],
  ['squat', 'Quadríceps'], ['leg-curl', 'Posteriores de coxa'], ['leg-press', 'Quadríceps'],
  ['lat-pulldown', 'Costas'], ['seated-row', 'Costas'], ['biceps-curl', 'Bíceps'],
]);

export function legacyMusclesForExercise(id: string): MuscleGroup[] {
  const group = legacyMuscles.get(id);
  return group ? [group] : [];
}
