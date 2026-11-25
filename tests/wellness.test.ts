import assert from 'node:assert/strict';
import test from 'node:test';
import type { LoggedSet, Session } from '../src/domain';
import { emptyWellness, normalizeWellness, recordFeeling, recordMeal, summarizeMuscles } from '../src/wellness';

const instant = (day: number, hour = 12) => new Date(2026, 10, day, hour);
const series = (id: string, groups?: string[]): LoggedSet =>
  ({ exerciseId: id, muscleGroups: groups, completed: true, reps: 8, weight: 0 });
function session(id: string, ended: Date, sets: LoggedSet[]): Session {
  return { id, routineId: id, routineName: id, startedAt: new Date(ended.getTime() - 600_000).toISOString(), endedAt: ended.toISOString(), xp: 0, sets };
}

test('map counts assigned muscle groups once per completed set across seven local dates', () => {
  const today = session('now', instant(8, 8), [
    series('livre', ['Peito', 'Peito', 'Tríceps']), series('livre', ['não definido']),
    { ...series('skip', ['Peito']), completed: false }, { ...series('skip', ['Peito']), reps: 0 },
    { ...series('skip', ['Peito']), weight: -1 },
  ]);
  const rows = summarizeMuscles([
    session('old', instant(1, 23), [series('livre', ['Peito', 'Glúteos'])]),
    session('boundary', instant(2, 0), [series('livre', ['Peito'])]),
    today, today,
    session('future', instant(8, 15), [series('livre', ['Costas'])]),
  ], instant(8));
  const group = (name: string) => rows.find(row => row.group === name)!;
  assert.equal(group('Peito').weekSets, 2);
  assert.equal(group('Peito').lastAt, today.endedAt);
  assert.equal(group('Tríceps').weekSets, 1);
  assert.equal(group('Costas').daysAgo, null);
  assert.equal(group('Glúteos').daysAgo, 7);
  assert.equal(group('Glúteos').weekSets, 0);
});

test('legacy logs recover known groups while an explicit empty assignment remains empty', () => {
  const rows = summarizeMuscles([session('one', instant(8, 9), [
    series('bench-press'), series('bench-press', []), series('bench-press', ['Costas']),
    series('leg-curl'), series('movimento-sem-descrição'),
  ])], instant(8));
  assert.deepEqual(rows.filter(row => row.weekSets).map(row => [row.group, row.weekSets]),
    [['Peito', 1], ['Costas', 1], ['Posteriores de coxa', 1]]);
});

test('recovery preserves different groups and days and replaces just the same-day report', () => {
  let state = recordFeeling(emptyWellness(), 'Peito', 'tired', instant(7));
  state = recordFeeling(state, 'Peito', 'sensitive', instant(8, 8));
  state = recordFeeling(state, 'Costas', 'rested', instant(8, 9));
  state = recordFeeling(state, 'Peito', 'rested', instant(8, 12));
  assert.equal(state.recovery.length, 3);
  assert.equal(state.recovery[0].feeling, 'rested');
  assert.equal(state.recovery[0].group, 'Peito');
  const restored = normalizeWellness({ recovery: [...state.recovery,
    { at: instant(8, 10).toISOString(), group: 'Peito', feeling: 'sensitive' },
    { at: instant(8).toISOString(), group: 'Ombros', feeling: 'toString' },
    { at: 'bad', group: 'Peito', feeling: 'rested' }] });
  assert.deepEqual(restored, state);
});

test('meals distinguish unreported nutrition from zero and keep one record after a retried save', () => {
  const first = { name: 'Desjejum', id: 'one', at: instant(7).toISOString() };
  const second = { name: 'Chá', id: 'two', at: instant(8).toISOString(), calories: 0 };
  let state = recordMeal(emptyWellness(), first);
  state = recordMeal(state, second);
  assert.strictEqual(recordMeal(state, second), state);
  assert.equal(state.meals[0].calories, 0);
  assert.equal(state.meals[1].calories, undefined);
  const recovered = normalizeWellness({ meals: [...state.meals, { ...first, protein: -1 }, { at: '', id: '', name: '' }] });
  assert.deepEqual(recovered, state);
  assert.deepEqual(normalizeWellness(undefined), emptyWellness());
});
