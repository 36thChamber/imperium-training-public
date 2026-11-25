import type { LoggedSet } from './domain';

export function localDateKey(value: Date | string = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function validSet(value: unknown): value is LoggedSet {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const set = value as Record<string, unknown>;
  return typeof set.exerciseId === 'string' && set.exerciseId.trim().length > 0 && set.exerciseId.length <= 100
    && set.completed === true && typeof set.reps === 'number' && Number.isInteger(set.reps) && set.reps >= 1 && set.reps <= 1000
    && typeof set.weight === 'number' && Number.isFinite(set.weight) && set.weight >= 0 && set.weight <= 2000;
}
