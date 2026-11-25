import type { Session } from './domain';
import { localDateKey, validSet } from './trainingRecords';

export type StrengthGoal = { exerciseId: string; exerciseName: string; targetKg: number };
export type BodyweightGoal = { startKg: number; targetKg: number };
export type WeightReading = { day: string; kg: number };
export type GoalBook = {
  strength: StrengthGoal[];
  bodyweight: BodyweightGoal | null;
  weeklyDays: number | null;
  weights: WeightReading[];
};

export function createGoalBook(): GoalBook {
  return { strength: [], bodyweight: null, weeklyDays: null, weights: [] };
}

export function validGoalKg(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 2000;
}

function validWeeklyDays(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 7;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validDay(day: unknown): day is string {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(day + 'T12:00:00');
  return Number.isFinite(date.getTime()) && localDateKey(date) === day;
}

function cleanLabel(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 100) : '';
}

/** A single target per exercise and a single scale reading per local calendar day. */
export function hydrateGoals(raw: unknown): GoalBook {
  const book = createGoalBook();
  if (!isRecord(raw)) return book;
  const strength = new Map<string, StrengthGoal>();
  for (const item of Array.isArray(raw.strength) ? raw.strength : []) {
    if (!isRecord(item) || !validGoalKg(item.targetKg)) continue;
    const exerciseId = cleanLabel(item.exerciseId), exerciseName = cleanLabel(item.exerciseName);
    if (exerciseId && exerciseName) strength.set(exerciseId, { exerciseId, exerciseName, targetKg: item.targetKg });
  }
  book.strength = [...strength.values()];
  if (isRecord(raw.bodyweight)) {
    const { startKg, targetKg } = raw.bodyweight;
    if (validGoalKg(startKg) && validGoalKg(targetKg) && startKg !== targetKg) book.bodyweight = { startKg, targetKg };
  }
  if (validWeeklyDays(raw.weeklyDays)) book.weeklyDays = raw.weeklyDays;
  const weights = new Map<string, WeightReading>();
  for (const item of Array.isArray(raw.weights) ? raw.weights : []) {
    if (isRecord(item) && validDay(item.day) && validGoalKg(item.kg)) weights.set(item.day, { day: item.day, kg: item.kg });
  }
  book.weights = [...weights.values()].sort((a, b) => a.day.localeCompare(b.day));
  return book;
}

export function setStrengthGoal(book: GoalBook, goal: StrengthGoal): GoalBook {
  if (!validGoalKg(goal.targetKg) || !goal.exerciseId.trim() || !goal.exerciseName.trim()) return book;
  const index = book.strength.findIndex(item => item.exerciseId === goal.exerciseId);
  const strength = [...book.strength];
  if (index < 0) strength.push(goal);
  else strength[index] = goal;
  return { ...book, strength };
}

export function recordWeight(book: GoalBook, kg: number, today = new Date()): GoalBook {
  if (!validGoalKg(kg) || !Number.isFinite(today.getTime())) return book;
  const day = localDateKey(today);
  const weights = [...book.weights.filter(reading => reading.day !== day), { day, kg }];
  weights.sort((a, b) => a.day.localeCompare(b.day));
  return { ...book, weights };
}

/** Uses external load from the best completed set, including sessions with capped XP. */
export function bestLoad(sessions: Session[], exerciseId: string): number | null {
  let best: number | null = null;
  for (const session of sessions) {
    for (const set of session.sets) {
      if (set.exerciseId === exerciseId && validSet(set)) best = Math.max(best ?? 0, set.weight);
    }
  }
  return best;
}

export function weeklyTrainingDays(sessions: Session[], today = new Date()): Set<string> {
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  const days = new Set<string>();
  for (const session of sessions) {
    const time = Date.parse(session.endedAt);
    if (time >= monday.getTime() && time <= today.getTime() && session.sets.some(validSet)) days.add(localDateKey(session.endedAt));
  }
  return days;
}

export function bodyweightProgress(goal: BodyweightGoal, kg: number): number {
  if (goal.targetKg === goal.startKg) return kg === goal.targetKg ? 1 : 0;
  const proportion = (kg - goal.startKg) / (goal.targetKg - goal.startKg);
  return Math.min(1, Math.max(0, proportion));
}
