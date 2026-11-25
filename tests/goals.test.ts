/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import type { Session } from '../src/domain';
import { bestLoad, bodyweightProgress, createGoalBook, hydrateGoals, recordWeight, setStrengthGoal, weeklyTrainingDays } from '../src/goals';

function session(endedAt: Date, weight = 25): Session {
  const timestamp = endedAt.toISOString();
  return { id: timestamp, routineId: 'free', routineName: 'Treino livre', startedAt: timestamp, endedAt: timestamp, xp: 0,
    sets: [{ exerciseId: 'squat', weight, reps: 5, completed: true }] };
}

test('strength uses the best completed external load for the chosen movement, regardless of XP', () => {
  const log = session(new Date());
  log.sets.push(
    { exerciseId: 'squat', weight: 60, reps: 6, completed: false },
    { exerciseId: 'squat', weight: 55, reps: 0, completed: true },
    { exerciseId: 'goblet-squat', weight: 80, reps: 5, completed: true },
    { exerciseId: 'squat', weight: 27.5, reps: 2, completed: true });
  assert.equal(bestLoad([log], 'squat'), 27.5);
  assert.equal(bestLoad([log], 'bench-press'), null);
  const goal = { exerciseId: 'squat', exerciseName: 'Agachamento', targetKg: 40 };
  const initial = setStrengthGoal(createGoalBook(), goal);
  const updated = setStrengthGoal(initial, { ...goal, targetKg: 50 });
  assert.deepEqual(updated.strength, [{ ...goal, targetKg: 50 }]);
  assert.deepEqual(initial.strength, [goal]);
});

test('weekly consistency counts local days once, starts on Monday and excludes future sessions', () => {
  // Local Sunday through Monday across the turn of the year.
  const now = new Date(2027, 0, 3, 12);
  const logs = [new Date(2026, 11, 27, 23, 59), new Date(2026, 11, 28, 0, 1), new Date(2026, 11, 28, 21),
    new Date(2027, 0, 2, 19), new Date(2027, 0, 3, 11), new Date(2027, 0, 3, 14), new Date(2027, 0, 4)].map(d => session(d));
  const invalid = session(new Date(2026, 11, 31)); invalid.sets[0].completed = false;
  assert.deepEqual([...weeklyTrainingDays([...logs, invalid], now)], ['2026-12-28', '2027-01-02', '2027-01-03']);
  assert.deepEqual([...weeklyTrainingDays(logs, new Date(2027, 0, 4, 12))], ['2027-01-04']);
});

test('bodyweight tracks increases and decreases against the initial measurement and replaces corrections on the same day', () => {
  const first = new Date(2027, 0, 2), next = new Date(2027, 0, 3);
  const empty = createGoalBook();
  const initial = recordWeight(empty, 77, first);
  const book = recordWeight(recordWeight(initial, 75, next), 74.5, next);
  assert.deepEqual(book.weights, [{ day: '2027-01-02', kg: 77 }, { day: '2027-01-03', kg: 74.5 }]);
  assert.deepEqual(initial.weights, [{ day: '2027-01-02', kg: 77 }]);
  assert.equal(bodyweightProgress({ startKg: 77, targetKg: 72 }, 74.5), 0.5);
  assert.equal(bodyweightProgress({ startKg: 72, targetKg: 77 }, 74.5), 0.5);
  assert.equal(bodyweightProgress({ startKg: 77, targetKg: 72 }, 71), 1);
  assert.equal(bodyweightProgress({ startKg: 77, targetKg: 72 }, 78), 0);
});

test('goal hydration preserves valid records independently and filters malformed or duplicate readings', () => {
  assert.deepEqual(hydrateGoals(undefined), createGoalBook());
  const book = hydrateGoals({ strength: [{ exerciseId: 'squat', exerciseName: 'Agachamento', targetKg: 40 }, { targetKg: -50 }],
    bodyweight: { startKg: 60, targetKg: 65 }, weeklyDays: 8, weights: [
      { day: '2028-02-29', kg: 60.5 }, { day: '2028-02-29', kg: 61.5 }, { day: '2027-02-29', kg: 62 }, { day: '2028-03-01', kg: 0 }] });
  assert.equal(book.strength.length, 1);
  assert.deepEqual(book.bodyweight, { startKg: 60, targetKg: 65 });
  assert.equal(book.weeklyDays, null);
  assert.deepEqual(book.weights, [{ day: '2028-02-29', kg: 61.5 }]);
  assert.deepEqual(hydrateGoals(JSON.parse(JSON.stringify(book))), book);
});
