/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { exerciseIdForName, restoreRoutines, restoreWorkoutDraft } from '../src/exercises';
import { ARMOURS, INITIAL_STATE, canEquip, completeSession, createProfile, getMeritoriousSessions, getNextRank, getRank, getStats, getStreak, getWeeklyActivity, hydrateState, localDateKey, type AppState, type Session } from '../src/domain';
import {
  AQUILA_STYLES, BEARD_STYLES, BODY_TYPES, COMPLEXIONS, EYE_SHAPES, FACE_PRESETS, FACE_SHAPES, MOUTH_SHAPES, MUSTACHE_STYLES,
} from '../src/avatarOptions';

function state(sex: 'masculino' | 'feminino' = 'masculino'): AppState {
  return { ...INITIAL_STATE, profile: createProfile('Artur', sex), sessions: [], completedMissionIds: [], equipped: { ...INITIAL_STATE.equipped } };
}

test('chest insignia migrates, persists across outfits and campaigns, and rejects unknown styles', () => {
  for (const sex of ['masculino', 'feminino'] as const) {
    const current = state(sex);
    current.equipmentTesting = true;
    const legacy = JSON.parse(JSON.stringify(current));
    delete legacy.profile.avatar.aquilaStyle;
    assert.equal(hydrateState(JSON.stringify(legacy)).profile!.avatar.aquilaStyle, 'aquila');
    for (const style of AQUILA_STYLES) {
      current.profile!.avatar.aquilaStyle = style.id;
      for (const armour of ARMOURS.filter(a => a.faction === current.profile!.faction)) {
        current.profile!.avatar.armourId = armour.id;
        current.equipped[current.profile!.faction] = armour.id;
        const restored = hydrateState(JSON.stringify(current));
        assert.equal(restored.profile!.avatar.aquilaStyle, style.id);
        assert.equal(restored.profile!.avatar.armourId, armour.id);
        assert.equal(restored.xp, 0);
        assert.deepEqual(restored.sessions, []);
      }
    }
    legacy.profile.avatar.aquilaStyle = 'invalid';
    assert.equal(hydrateState(JSON.stringify(legacy)).profile!.avatar.aquilaStyle, 'aquila');
  }
});

function workout(id = 'session-1', date = new Date()): Session {
  const start = new Date(date.getTime() - 30 * 60000);
  return {
    id, routineId: 'initiation', routineName: 'Rito de iniciação', startedAt: start.toISOString(), endedAt: date.toISOString(), xp: 999999,
    sets: [{ exerciseId: 'goblet-squat', reps: 10, weight: 12.5, completed: true }],
  };
}

test('equipment testing persists without rewards and ending it restores an earned outfit', () => {
  for (const sex of ['masculino', 'feminino'] as const) {
    const current = state(sex);
    current.equipmentTesting = true;
    for (const armour of ARMOURS) assert.equal(canEquip(armour, current), armour.faction === current.profile!.faction);
    const last = ARMOURS.filter(a => a.faction === current.profile!.faction).at(-1)!;
    current.equipped[current.profile!.faction] = last.id;
    current.profile!.avatar.armourId = last.id;
    const restored = hydrateState(JSON.stringify(current));
    assert.equal(restored.profile!.avatar.armourId, last.id);
    assert.equal(restored.xp, 0);
    assert.deepEqual(restored.sessions, []);
    const ended = hydrateState(JSON.stringify({ ...restored, equipmentTesting: false }));
    assert.equal(ended.profile!.avatar.armourId, sex === 'masculino' ? 'scout' : 'novice');
    assert.equal(canEquip(last, ended), false);
    assert.equal(hydrateState(JSON.stringify({ ...current, equipmentTesting: 'true' })).equipmentTesting, false);
  }
});

test('sex determines the requested campaign and its starting equipment', () => {
  const male = createProfile('  Artur  ', 'masculino');
  const female = createProfile('Maria', 'feminino');
  assert.equal(male.faction, 'astartes');
  assert.equal(male.avatar.armourId, 'scout');
  assert.equal(male.name, 'Artur');
  assert.equal(female.faction, 'sororitas');
  assert.equal(female.avatar.armourId, 'novice');
});

test('rank boundaries and the final rank are exact', () => {
  assert.equal(getRank('astartes', 999).id, 'neophyte');
  assert.equal(getRank('astartes', 1000).id, 'battle-brother');
  assert.equal(getNextRank('astartes', 1000)?.id, 'veteran');
  assert.equal(getNextRank('sororitas', 6000), undefined);
  assert.equal(getRank('sororitas', 999).id, 'novitiate');
});

test('armour requires its faction, exact XP and rewarded session count', () => {
  const terminator = ARMOURS.find(armour => armour.id === 'terminator')!;
  const eligible = state();
  eligible.xp = 3000;
  eligible.sessions = Array.from({ length: 20 }, (_, i) => ({ ...workout(`s-${i}`), xp: 130 }));
  assert.equal(canEquip(terminator, eligible), true);
  assert.equal(canEquip(terminator, { ...eligible, xp: 2999 }), false);
  assert.equal(canEquip(terminator, { ...eligible, sessions: eligible.sessions.slice(1) }), false);
  assert.equal(canEquip(terminator, { ...eligible, profile: createProfile('Maria', 'feminino') }), false);
  assert.equal(canEquip({ ...terminator, requiredXp: 0, requiredSessions: 0 }, state()), false);
  assert.equal(canEquip(terminator, { ...eligible, sessions: eligible.sessions.map(session => ({ ...session, xp: 0 })) }), false);
});

test('completion ignores caller XP, is idempotent and computes actual volume', () => {
  const session = workout();
  const initial = state();
  const completed = completeSession(initial, session);
  assert.equal(completed.xp, 130);
  assert.equal(completed.sessions[0].xp, 130);
  assert.deepEqual(completed.completedMissionIds, ['initiation']);
  assert.equal(completeSession(completed, session), completed);
  assert.equal(initial.sessions.length, 0);
  assert.deepEqual(getStats(completed), { volume: 125, totalMinutes: 30, completedSets: 1, workouts: 1 });
});

test('daily XP is capped without discarding subsequent workout logs', () => {
  const today = new Date();
  let current = completeSession(state(), workout('a', today));
  current = completeSession(current, workout('b', today));
  current = completeSession(current, workout('c', today));
  assert.equal(current.xp, 240);
  assert.deepEqual(current.sessions.map(session => session.xp), [130, 110, 0]);
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 12);
  current = completeSession(current, workout('d', tomorrow));
  assert.equal(current.xp, 370);
  assert.equal(current.sessions.length, 4);
});

test('unfinished and invalid sets do not earn XP, but valid completed work is kept', () => {
  const initial = state();
  const base = workout();
  const invalidSets = [
    { ...base.sets[0], completed: false }, { ...base.sets[0], reps: 0 },
    { ...base.sets[0], reps: 1.5 }, { ...base.sets[0], weight: -5 },
    { ...base.sets[0], weight: Number.NaN }, { ...base.sets[0], weight: Infinity },
  ];
  assert.equal(completeSession(initial, { ...base, sets: invalidSets }), initial);
  const partial = completeSession(initial, { ...base, sets: [...invalidSets, base.sets[0]] });
  assert.equal(partial.sessions[0].sets.length, 1);
  assert.equal(partial.xp, 130);
  assert.equal(completeSession(initial, { ...base, endedAt: 'not-a-date' }), initial);
  assert.equal(completeSession(initial, { ...base, endedAt: '2000-01-01T00:00:00Z' }), initial);
});

test('bodyweight sets may use zero added weight', () => {
  const session = workout();
  const result = completeSession(state(), { ...session, sets: [{ ...session.sets[0], weight: 0 }] });
  assert.equal(result.xp, 130);
  assert.equal(getStats(result).volume, 0);
});

test('free exercises retain user-selected muscles and names on replay, including unclassified sets', () => {
  const initial = state();
  const base = workout();
  const custom = { ...base.sets[0], exerciseId: exerciseIdForName('Puxada unilateral'),
    exerciseName: 'Puxada unilateral', muscleGroups: ['Costas', 'Bíceps', 'Costas', 'Inexistente'] };
  const session = { ...base, sets: [custom, { ...base.sets[0], muscleGroups: [] }, base.sets[0]] };
  const saved = completeSession(initial, session);
  const restored = hydrateState(JSON.stringify(saved));
  assert.deepEqual(restored.sessions, saved.sessions);
  assert.equal(restored.sessions[0].sets[0].exerciseName, 'Puxada unilateral');
  assert.equal(exerciseIdForName(' PUXADA   UNILATERAL '), custom.exerciseId);
  assert.deepEqual(restored.sessions[0].sets.map(set => set.muscleGroups), [['Costas', 'Bíceps'], [], ['Quadríceps']]);
  assert.equal(restored.sessions[0].sets[2].exerciseName, 'Agachamento goblet');
  assert.equal(completeSession(restored, session), restored);
});

test('old and custom active sets and routines restore even when the optional catalogue does not contain the movement', () => {
  const base = workout();
  const old = { exerciseId: 'goblet-squat', reps: '9', weight: '12,5', completed: true };
  const custom = { exerciseId: 'custom:meu movimento', exerciseName: 'Meu movimento', muscleGroups: ['Abdômen'], reps: '', weight: '0', completed: false };
  const draft = restoreWorkoutDraft({ ...base, sets: [old, custom] });
  assert.equal(draft?.sets[0].weight, '12,5');
  assert.deepEqual(draft?.sets[0].muscleGroups, ['Quadríceps']);
  assert.deepEqual(draft?.sets[1], custom);
  assert.deepEqual(restoreWorkoutDraft({ ...base, sets: [] })?.sets, []);
  const [routine] = restoreRoutines([{ id: 'mine', name: 'Minha rotina', minutes: 25, exercises: [
    { id: old.exerciseId, name: 'Agachamento goblet', muscle: 'Pernas', sets: 3, reps: 10 },
    { id: custom.exerciseId, name: custom.exerciseName, muscleGroups: custom.muscleGroups, sets: 2, reps: 0 },
  ] }]);
  assert.equal(routine.exercises[0].reps, 10);
  assert.equal(routine.exercises[1].name, 'Meu movimento');
  assert.deepEqual(routine.exercises[1].muscleGroups, ['Abdômen']);
});

test('hydration rejects corrupt data, replays XP and repairs illegal armour', () => {
  for (const corrupt of [null, '', '{', '{}', '{"version":2}', 'null']) assert.equal(hydrateState(corrupt).profile, null);
  const original = completeSession(state('feminino'), workout());
  original.xp = 999999;
  original.profile!.faction = 'astartes';
  original.profile!.avatar.armourId = 'terminator';
  original.profile!.avatar.skin = 'url(unsafe)';
  original.equipped.sororitas = 'terminator';
  original.sessions.push(original.sessions[0]);
  original.water = -100;
  const restored = hydrateState(JSON.stringify(original));
  assert.equal(restored.profile!.faction, 'sororitas');
  assert.equal(restored.profile!.avatar.armourId, 'novice');
  assert.equal(restored.profile!.avatar.skin, '#C68D70');
  assert.equal(restored.sessions.length, 1);
  assert.equal(restored.xp, 130);
  assert.equal(restored.water, 0);
  assert.equal(hydrateState(JSON.stringify({ ...original, water: 750, waterDate: '2000-01-01' })).water, 0);
});

test('weekly activity and streak use local calendar dates', () => {
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 12);
  let current = completeSession(state(), workout('yesterday', yesterday));
  assert.equal(getStreak(current), 1);
  current = completeSession(current, workout('today', today));
  assert.equal(getStreak(current), 2);
  const activity = getWeeklyActivity(current);
  assert.equal(activity.length, 7);
  assert.equal(activity[6].date, localDateKey(today));
  assert.equal(activity[6].count, 1);
  assert.equal(activity[5].count, 1);
});

test('both veteran arsenals unlock at the exact XP and merit boundary', () => {
  for (const [sex, itemId] of [['masculino', 'terminator'], ['masculino', 'cataphractii'], ['masculino', 'tartaros'], ['feminino', 'celestian']] as const) {
    const armour = ARMOURS.find(item => item.id === itemId)!;
    const before = state(sex);
    before.xp = 3000;
    before.sessions = Array.from({ length: 19 }, (_, index) => ({ ...workout(`merit-${index}`), xp: 130 }));
    assert.equal(canEquip(armour, before), false);
    const zeroXp = { ...workout('unrewarded'), xp: 0 };
    before.sessions.push(zeroXp);
    assert.equal(getMeritoriousSessions(before), 19);
    assert.equal(canEquip(armour, before), false);
    before.sessions.push({ ...workout('last-merit'), xp: 1 });
    assert.equal(getMeritoriousSessions(before), 20);
    assert.equal(canEquip(armour, before), true);
    assert.equal(canEquip(armour, { ...before, xp: 2999 }), false);
    assert.equal(canEquip(armour, { ...before, xp: Infinity }), false);
    for (const foreign of ARMOURS.filter(item => item.faction !== before.profile!.faction)) {
      assert.equal(canEquip(foreign, before), false);
    }
  }
});

test('merit ignores invalid, duplicated and impossible reward logs', () => {
  const current = state();
  const valid = { ...workout('valid'), xp: 130 };
  current.sessions = [
    valid, valid, { ...valid, id: 'empty', sets: [] }, { ...valid, id: 'no-reward', xp: 0 },
    { ...valid, id: 'infinity', xp: Infinity }, { ...valid, id: 'too-much', xp: 241 },
    { ...valid, id: 'bad-date', endedAt: 'invalid' }, { ...valid, id: 'negative', xp: -1 },
  ];
  assert.equal(getMeritoriousSessions(current), 1);
});

test('the daily allowance resets at local midnight, attributing cross-midnight logs to their end date', () => {
  const beforeMidnight = new Date(2026, 10, 6, 23, 59, 59);
  const afterMidnight = new Date(2026, 10, 7, 0, 0, 1);
  let current = completeSession(state(), workout('before-a', beforeMidnight));
  current = completeSession(current, workout('before-b', beforeMidnight));
  assert.equal(current.xp, 240);
  current = completeSession(current, workout('cross-midnight', afterMidnight));
  assert.equal(current.sessions[2].xp, 130);
  assert.equal(current.xp, 370);
  assert.equal(localDateKey(current.sessions[2].startedAt), '2026-11-06');
  assert.equal(localDateKey(current.sessions[2].endedAt), '2026-11-07');
});

test('hydration recalculates malicious per-session XP and retains legitimate armour', () => {
  let current = state('feminino');
  for (let index = 0; index < 8; index += 1) {
    current = completeSession(current, workout(`earned-${index}`, new Date(2026, 9, 1 + index, 12)));
  }
  assert.equal(current.xp, 1040);
  current.profile!.avatar.armourId = 'sororitas';
  current.equipped.sororitas = 'sororitas';
  const saved = JSON.stringify({
    ...current, xp: -500,
    sessions: current.sessions.map((session, index) => ({ ...session, xp: index % 2 ? -999 : 999999 })),
  });
  const restored = hydrateState(saved);
  assert.equal(restored.xp, 1040);
  assert.equal(getMeritoriousSessions(restored), 8);
  assert.equal(restored.profile!.avatar.armourId, 'sororitas');
  assert.equal(restored.equipped.sororitas, 'sororitas');
  assert.equal(restored.equipped.astartes, 'scout');
  const overEquipped = { ...current, equipped: { ...current.equipped, sororitas: 'canoness' } };
  assert.equal(hydrateState(JSON.stringify(overEquipped)).equipped.sororitas, 'novice');
});

test('legacy avatar migration keeps appearance, earned equipment and workout history', () => {
  let current = state('feminino');
  for (let index = 0; index < 8; index += 1) {
    current = completeSession(current, workout(`legacy-${index}`, new Date(2026, 9, 1 + index, 12)));
  }
  current.equipped.sororitas = 'sororitas';
  const legacy = {
    ...current,
    profile: {
      ...current.profile!,
      avatar: { skin: '#78513B', hair: '#23364B', hairStyle: 'shaved', face: 'square', helmet: true, armourId: 'sororitas' },
    },
  };
  const restored = hydrateState(JSON.stringify(legacy));
  assert.deepEqual(restored.sessions, current.sessions);
  assert.equal(restored.xp, 1040);
  assert.deepEqual(restored.completedMissionIds, current.completedMissionIds);
  assert.deepEqual(restored.equipped, current.equipped);
  assert.deepEqual(restored.profile!.avatar, {
    ...legacy.profile.avatar, aquilaStyle: 'aquila', facePreset: 'european', beardStyle: 'none', beardColor: '#23364B',
    bodyType: 'regular', eyeShape: 'almond', mouthShape: 'balanced', complexion: 'smooth', mustacheStyle: 'none',
  });
  assert.deepEqual(hydrateState(JSON.stringify(restored)), restored);
});

test('all comic choices persist independently of skin tone and campaign', () => {
  for (const sex of ['masculino', 'feminino'] as const) {
    for (let index = 0; index < FACE_PRESETS.length; index += 1) {
      const current = completeSession(state(sex), workout(`appearance-${index}`));
      current.profile!.avatar = {
        ...current.profile!.avatar,
        facePreset: FACE_PRESETS[index].id,
        face: FACE_SHAPES[index % FACE_SHAPES.length].id,
        bodyType: BODY_TYPES[index % BODY_TYPES.length].id,
        eyeShape: EYE_SHAPES[index % EYE_SHAPES.length].id,
        mouthShape: MOUTH_SHAPES[index % MOUTH_SHAPES.length].id,
        complexion: COMPLEXIONS[index % COMPLEXIONS.length].id,
        mustacheStyle: MUSTACHE_STYLES[index % MUSTACHE_STYLES.length].id,
        skin: '#4A2F22', hair: '#101010', hairStyle: 'curly',
        beardStyle: BEARD_STYLES[index % BEARD_STYLES.length].id, beardColor: '#D4AF83',
      };
      const restored = hydrateState(JSON.stringify(current));
      assert.deepEqual(restored.profile, current.profile);
      assert.equal(restored.xp, current.xp);
      assert.deepEqual(restored.sessions, current.sessions);
      assert.equal(canEquip(ARMOURS.find(item => item.id === 'terminator')!, restored), false);
    }
  }
});

test('unknown appearance values fall back without resetting progress or bypassing faction gates', () => {
  const current = completeSession(state('feminino'), workout());
  for (const invalid of [null, 42, [], {}, 'not-an-option', '__proto__']) {
    const restored = hydrateState(JSON.stringify({
      ...current,
      equipped: { astartes: 'scout', sororitas: 'terminator' },
      profile: {
        ...current.profile,
        avatar: {
          ...current.profile!.avatar, facePreset: invalid, face: invalid,
          bodyType: invalid, eyeShape: invalid, mouthShape: invalid, complexion: invalid, mustacheStyle: invalid,
          beardStyle: invalid, hairStyle: invalid, armourId: 'terminator',
        },
      },
    }));
    assert.equal(restored.profile!.avatar.facePreset, 'european');
    assert.equal(restored.profile!.avatar.face, 'oval');
    assert.equal(restored.profile!.avatar.bodyType, 'regular');
    assert.equal(restored.profile!.avatar.eyeShape, 'almond');
    assert.equal(restored.profile!.avatar.mouthShape, 'balanced');
    assert.equal(restored.profile!.avatar.complexion, 'smooth');
    assert.equal(restored.profile!.avatar.mustacheStyle, 'none');
    assert.equal(restored.profile!.avatar.beardStyle, 'none');
    assert.equal(restored.profile!.avatar.hairStyle, 'bob');
    assert.equal(restored.profile!.avatar.armourId, 'novice');
    assert.equal(restored.profile!.faction, 'sororitas');
    assert.equal(restored.xp, 130);
    assert.deepEqual(restored.sessions, current.sessions);
  }
});

test('legacy moustache-only and combined beard sprites migrate once and respect explicit new choices', () => {
  const original = completeSession(state(), workout());
  for (const [legacy, beard, mustache] of [
    ['moustache', 'none', 'chevron'], ['full', 'full', 'chevron'], ['goatee', 'goatee', 'pencil'],
  ]) {
    const stored = { ...original, profile: { ...original.profile, avatar: {
      ...original.profile!.avatar, beardStyle: legacy, beardColor: '#A47F67', mustacheStyle: undefined,
    } } };
    const restored = hydrateState(JSON.stringify(stored));
    assert.equal(restored.profile!.avatar.beardStyle, beard);
    assert.equal(restored.profile!.avatar.mustacheStyle, mustache);
    assert.equal(restored.profile!.avatar.beardColor, '#A47F67');
    assert.deepEqual(restored.sessions, original.sessions);
    assert.deepEqual(hydrateState(JSON.stringify(restored)), restored);
    restored.profile!.avatar.mustacheStyle = 'none';
    assert.deepEqual(hydrateState(JSON.stringify(restored)), restored);
  }
});

test('invalid beard colors use validated hair color while valid colors remain independent', () => {
  const current = completeSession(state(), workout());
  for (const invalidColor of ['#abc', '#11223344', '#GG2233', 'rgb(1, 2, 3)', 123, null, {}]) {
    for (const hair of ['#aBc123', 'invalid-hair']) {
      const restored = hydrateState(JSON.stringify({
        ...current,
        profile: { ...current.profile, avatar: { ...current.profile!.avatar, hair, beardColor: invalidColor, beardStyle: 'full' } },
      }));
      const expected = hair === 'invalid-hair' ? '#44362F' : hair;
      assert.equal(restored.profile!.avatar.hair, expected);
      assert.equal(restored.profile!.avatar.beardColor, expected);
      assert.equal(restored.profile!.avatar.beardStyle, 'full');
      assert.equal(restored.xp, 130);
    }
  }
});

test('statistics count valid logged work even when XP is capped, and exclude invalid or duplicate records', () => {
  const first = { ...workout('first'), xp: 240 };
  const second = { ...workout('second'), xp: 0, sets: [
    { exerciseId: 'squat', reps: 8, weight: 40.5, completed: true },
    { exerciseId: 'squat', reps: 8, weight: 40.5, completed: false },
  ] };
  const current = state();
  current.sessions = [first, second, first, { ...first, id: 'invalid', endedAt: 'invalid' }];
  assert.deepEqual(getStats(current), { volume: 449, totalMinutes: 60, completedSets: 2, workouts: 2 });
});

test('an abandoned session over 24 hours does not silently consume its ID or add progress', () => {
  const current = state();
  const end = new Date(2026, 10, 6, 12);
  const abandoned = { ...workout('abandoned', end), startedAt: new Date(end.getTime() - 86_400_001).toISOString() };
  assert.equal(completeSession(current, abandoned), current);
  assert.equal(completeSession(current, workout('abandoned', end)).sessions.length, 1);
});
