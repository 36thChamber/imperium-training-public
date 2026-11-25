import type { Exercise, Routine } from './domain';
import { legacyMusclesForExercise, resolveMuscleGroup, type MuscleGroup } from './muscles';

const movements = [
  ['goblet-squat', 'Agachamento goblet', 'Halter'],
  ['dumbbell-row', 'Remada com halter', 'Halter'],
  ['dumbbell-press', 'Supino com halteres', 'Halteres'],
  ['bench-press', 'Supino reto', 'Barra'],
  ['shoulder-press', 'Desenvolvimento', 'Halteres'],
  ['triceps-pushdown', 'Tríceps na polia', 'Polia'],
  ['squat', 'Agachamento', 'Barra'],
  ['leg-curl', 'Flexora sentada', 'Máquina'],
  ['leg-press', 'Leg press', 'Máquina'],
  ['lat-pulldown', 'Puxada frontal', 'Polia'],
  ['seated-row', 'Remada sentada', 'Polia'],
  ['biceps-curl', 'Rosca com halteres', 'Halteres'],
] as const;

/** Suggestions supply names and editable muscle labels. Repetitions start blank. */
export const EXERCISE_LIBRARY: Exercise[] = movements.map(([id, name, equipment]) => {
  const muscleGroups = legacyMusclesForExercise(id);
  return { id, name, equipment, muscleGroups, muscle: muscleGroups.join(', '), sets: 1, reps: 0 };
});

export function normalizeExerciseName(value: string): string {
  return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
}

export function exerciseIdForName(name: string): string {
  const key = normalizeExerciseName(name);
  return EXERCISE_LIBRARY.find(item => normalizeExerciseName(item.name) === key)?.id ?? `custom:${key}`;
}

function cleanLabel(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, limit) : '';
}

export function exerciseSnapshot(exerciseId: string, name: unknown, groups: unknown) {
  const exerciseName = cleanLabel(name, 80) || EXERCISE_LIBRARY.find(item => item.id === exerciseId)?.name || exerciseId;
  const muscleGroups = Array.isArray(groups)
    ? Array.from(new Set(groups.map(resolveMuscleGroup).filter((g): g is MuscleGroup => g !== null)))
    : legacyMusclesForExercise(exerciseId);
  return { exerciseName, muscleGroups };
}

function readExercise(raw: unknown): Exercise | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as Partial<Exercise>;
  const id = cleanLabel(v.id, 100);
  const name = cleanLabel(v.name, 80);
  if (!id || !name || !Number.isInteger(v.sets) || v.sets! < 1 || v.sets! > 100 ||
    !Number.isInteger(v.reps) || v.reps! < 0 || v.reps! > 1000) return null;
  const { muscleGroups } = exerciseSnapshot(id, name, v.muscleGroups);
  return { id, name, muscle: muscleGroups.join(', '), muscleGroups, equipment: cleanLabel(v.equipment, 60), sets: v.sets!, reps: v.reps! };
}

export function restoreRoutines(value: unknown): Routine[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(raw => {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.exercises)) return [];
    const id = cleanLabel(raw.id, 100), name = cleanLabel(raw.name, 80);
    const exercises = raw.exercises.map(readExercise).filter((exercise: Exercise | null): exercise is Exercise => exercise !== null);
    if (!id || !name || !exercises.length) return [];
    return [{ id, name, subtitle: cleanLabel(raw.subtitle, 100), minutes: Number.isFinite(raw.minutes) ? raw.minutes : 0, exercises }];
  });
}

export type DraftSet = {
  exerciseId: string; exerciseName: string; muscleGroups: MuscleGroup[]; reps: string; weight: string; completed: boolean;
};
export type WorkoutDraft = { id: string; routineId: string; routineName: string; startedAt: string; sets: DraftSet[] };

export function draftSet(exercise: Exercise): DraftSet {
  return { exerciseId: exercise.id, ...exerciseSnapshot(exercise.id, exercise.name, exercise.muscleGroups),
    reps: exercise.reps > 0 ? String(exercise.reps) : '', weight: '0', completed: false };
}

export function restoreWorkoutDraft(value: unknown): WorkoutDraft | null {
  if (!value || typeof value !== 'object') return null;
  const d = value as Partial<WorkoutDraft>;
  if (!cleanLabel(d.id, 100) || !cleanLabel(d.routineId, 100) || !cleanLabel(d.routineName, 100) ||
    typeof d.startedAt !== 'string' || !Number.isFinite(Date.parse(d.startedAt)) ||
    !Array.isArray(d.sets) || d.sets.length > 100) return null;
  const sets: DraftSet[] = [];
  for (const row of d.sets) {
    if (!row || !cleanLabel(row.exerciseId, 100) || typeof row.reps !== 'string' ||
      typeof row.weight !== 'string' || typeof row.completed !== 'boolean') return null;
    sets.push({ exerciseId: row.exerciseId, ...exerciseSnapshot(row.exerciseId, row.exerciseName, row.muscleGroups),
      reps: row.reps, weight: row.weight, completed: row.completed });
  }
  return { id: d.id!, routineId: d.routineId!, routineName: d.routineName!, startedAt: d.startedAt, sets };
}
