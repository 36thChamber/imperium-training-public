import type { Session } from './domain';
import { MUSCLE_GROUPS, legacyMusclesForExercise, resolveMuscleGroup, type MuscleGroup } from './muscles';

export const FEELINGS = {
  rested: 'Descansado',
  sensitive: 'Sensível',
  tired: 'Cansado',
} as const;
export type Feeling = keyof typeof FEELINGS;
export type RecoveryEntry = { at: string; group: MuscleGroup; feeling: Feeling };
export type MealEntry = { at: string; id: string; name: string; protein?: number; calories?: number };
export type WellnessState = { meals: MealEntry[]; recovery: RecoveryEntry[] };
export const emptyWellness = (): WellnessState => ({ meals: [], recovery: [] });

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function timestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

function text(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().replace(/[\u0000-\u001F\u007F]/g, ' ').slice(0, max) : '';
}

// Calendar distance measures local dates, including across daylight-saving changes.
function dayNumber(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

function nutrient(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 99_999 ? value : undefined;
}

function readMeal(value: unknown): MealEntry | null {
  if (!record(value)) return null;
  const at = timestamp(value.at);
  const name = text(value.name, 120);
  const id = text(value.id, 100);
  if (!at || !id || !name) return null;
  const protein = nutrient(value.protein);
  const calories = nutrient(value.calories);
  return { id, name, at, ...(protein !== undefined && { protein }), ...(calories !== undefined && { calories }) };
}

function readRecovery(value: unknown): RecoveryEntry | null {
  if (!record(value)) return null;
  const at = timestamp(value.at);
  const group = resolveMuscleGroup(value.group);
  const feeling = value.feeling;
  if (!at || !group || typeof feeling !== 'string' || !Object.hasOwn(FEELINGS, feeling)) return null;
  return { at, group, feeling: feeling as Feeling };
}

export function normalizeWellness(value: unknown): WellnessState {
  const result = emptyWellness();
  if (!record(value)) return result;
  const mealIds = new Set<string>();
  if (Array.isArray(value.meals)) {
    for (const item of value.meals) {
      const meal = readMeal(item);
      if (meal && !mealIds.has(meal.id)) {
        result.meals.push(meal);
        mealIds.add(meal.id);
      }
    }
  }
  if (Array.isArray(value.recovery)) {
    const checkIns = new Map<string, RecoveryEntry>();
    for (const item of value.recovery) {
      const entry = readRecovery(item);
      if (!entry) continue;
      const key = entry.group + '/' + dayNumber(new Date(entry.at));
      const prior = checkIns.get(key);
      if (!prior || entry.at > prior.at) checkIns.set(key, entry);
    }
    result.recovery = [...checkIns.values()];
  }
  result.meals.sort((a, b) => b.at.localeCompare(a.at));
  result.recovery.sort((a, b) => b.at.localeCompare(a.at));
  return result;
}

export function recordMeal(state: WellnessState, input: MealEntry): WellnessState {
  const meal = readMeal(input);
  if (!meal || state.meals.some(item => item.id === meal.id)) return state;
  return { ...state, meals: [meal, ...state.meals].sort((a, b) => b.at.localeCompare(a.at)) };
}

export function recordFeeling(state: WellnessState, group: MuscleGroup, feeling: Feeling, date = new Date()): WellnessState {
  const at = date.toISOString();
  const day = dayNumber(date);
  const rest = state.recovery.filter(entry => entry.group !== group || dayNumber(new Date(entry.at)) !== day);
  return { ...state, recovery: [{ group, feeling, at }, ...rest].sort((a, b) => b.at.localeCompare(a.at)) };
}

export type MuscleActivity = { group: MuscleGroup; weekSets: number; lastAt: string | null; daysAgo: number | null };

export function summarizeMuscles(sessions: readonly Session[], now = new Date()): MuscleActivity[] {
  const muscles: MuscleActivity[] = MUSCLE_GROUPS.map(group => ({ group, weekSets: 0, lastAt: null, daysAgo: null }));
  const byGroup = new Map(muscles.map(row => [row.group, row]));
  const counted = new Set<string>();
  const today = dayNumber(now);
  for (const session of sessions) {
    const end = new Date(session.endedAt);
    if (!Number.isFinite(end.getTime()) || end > now || counted.has(session.id)) continue;
    counted.add(session.id);
    const age = today - dayNumber(end);
    const at = end.toISOString();
    for (const set of session.sets) {
      if (!set.completed || !Number.isInteger(set.reps) || set.reps < 1 || set.reps > 1000
        || !Number.isFinite(set.weight) || set.weight < 0 || set.weight > 2000) continue;
      const assigned = set.muscleGroups ?? legacyMusclesForExercise(set.exerciseId);
      for (const group of new Set(assigned.map(resolveMuscleGroup))) {
        const row = group ? byGroup.get(group) : undefined;
        if (!row) continue;
        if (age < 7) row.weekSets++;
        if (!row.lastAt || row.lastAt < at) {
          row.lastAt = at;
          row.daysAgo = age;
        }
      }
    }
  }
  return muscles;
}
