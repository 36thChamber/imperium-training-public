/** Offline game rules. XP thresholds are game design, never canonical 40K ranks. */
import { localDateKey, validSet } from './trainingRecords';
import { createGoalBook, hydrateGoals, type GoalBook } from './goals';
import { emptyWellness, normalizeWellness, type WellnessState } from './wellness';
import {
  AQUILA_STYLES, BEARD_STYLES, BODY_TYPES, COMPLEXIONS, DEFAULT_BEARD_STYLE, DEFAULT_FACE_PRESET, EYE_SHAPES,
  FACE_PRESETS, FACE_SHAPES, HAIR_STYLES, MOUTH_SHAPES, MUSTACHE_STYLES, readChoice,
  type AquilaStyle, type BeardStyle, type BodyType, type Complexion, type EyeShape, type FacePreset, type FaceShape,
  type HairStyle, type MouthShape, type MustacheStyle,
} from './avatarOptions';
import { exerciseSnapshot } from './exercises';
export { localDateKey, validSet } from './trainingRecords';
export { EXERCISE_LIBRARY } from './exercises';

export type { BeardStyle, BodyType, Complexion, EyeShape, FacePreset, FaceShape, HairStyle, MouthShape, MustacheStyle } from './avatarOptions';

export type Faction = 'astartes' | 'sororitas';
export type Sex = 'masculino' | 'feminino';
export type AvatarConfig = {
  aquilaStyle: AquilaStyle;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  face: FaceShape;
  facePreset: FacePreset;
  bodyType: BodyType;
  eyeShape: EyeShape;
  mouthShape: MouthShape;
  complexion: Complexion;
  mustacheStyle: MustacheStyle;
  beardStyle: BeardStyle;
  beardColor: string;
  helmet: boolean;
  armourId: string;
};
export type Profile = { name: string; sex: Sex; faction: Faction; avatar: AvatarConfig };
export type Exercise = { id: string; name: string; muscle: string; muscleGroups?: string[]; equipment: string; sets: number; reps: number };
export type Routine = { id: string; name: string; subtitle: string; minutes: number; exercises: Exercise[] };
export type LoggedSet = { exerciseId: string; exerciseName?: string; muscleGroups?: string[]; reps: number; weight: number; completed: boolean };
export type Session = { id: string; routineId: string; routineName: string; startedAt: string; endedAt: string; sets: LoggedSet[]; xp: number };
export type AppState = {
  version: 1;
  equipmentTesting?: boolean;
  profile: Profile | null;
  xp: number;
  sessions: Session[];
  equipped: Record<Faction, string>;
  completedMissionIds: string[];
  water: number;
  waterDate: string;
  goals: GoalBook;
  wellness: WellnessState;
};
export type Rank = { id: string; name: string; xp: number; description: string };
export type Armour = {
  id: string;
  name: string;
  pattern: 'scout' | 'tacticus' | 'mk3' | 'terminator' | 'novice' | 'sororitas' | 'celestian';
  faction: Faction;
  requiredXp: number;
  requiredSessions: number;
  description: string;
  lore: string;
};

export const RANKS: Record<Faction, Rank[]> = {
  astartes: [
    { id: 'aspirant', name: 'Aspirante', xp: 0, description: 'O primeiro juramento. Construa sua constância.' },
    { id: 'neophyte', name: 'Neófito', xp: 300, description: 'Uma etapa de formação inspirada nos recrutas do Capítulo.' },
    { id: 'battle-brother', name: 'Irmão de Batalha', xp: 1000, description: 'Sua campanha concede acesso à armadura de batalha.' },
    { id: 'veteran', name: 'Veterano', xp: 3000, description: 'A experiência abre o caminho às honras da veterania.' },
    { id: 'veteran-sergeant', name: 'Sargento Veterano', xp: 6000, description: 'A constância transforma experiência em liderança.' },
  ],
  sororitas: [
    { id: 'novitiate', name: 'Noviça', xp: 0, description: 'O noviciado inicia sua jornada nas Ordens Militantes.' },
    { id: 'battle-sister', name: 'Irmã de Batalha', xp: 1000, description: 'Seu primeiro marco de campanha com power armour Sororitas.' },
    { id: 'sister-superior', name: 'Irmã Superior', xp: 3000, description: 'Um marco de liderança inspirado nas Sister Superiors.' },
    { id: 'canoness', name: 'Canoness', xp: 6000, description: 'O ápice desta campanha, inspirado no comando de uma Ordem.' },
  ],
};

export const ARMOURS: Armour[] = [
  { id: 'scout', name: 'Carapaça de neófito', pattern: 'scout', faction: 'astartes', requiredXp: 0, requiredSessions: 0,
    description: 'Peitoral rígido, ombreiras arredondadas e gola canelada sobre o uniforme de reconhecimento.',
    lore: 'Os Scouts dos Adeptus Astartes usam armadura de carapaça em missões de reconhecimento. Na campanha do app, o aspirante já recebe essa proteção ao começar.' },
  { id: 'mk2', name: 'Mk II · Crusade', pattern: 'mk3', faction: 'astartes', requiredXp: 2000, requiredSessions: 10,
    description: 'Placas sobrepostas e elmo de visor horizontal.',
    lore: 'A Crusade usa seções articuladas em anéis. A requisição de padrões históricos aos 2.000 XP e dez sessões é uma regra da campanha.' },
  { id: 'mk3', name: 'Mk III · Iron', pattern: 'mk3', faction: 'astartes', requiredXp: 2000, requiredSessions: 10,
    description: 'Requisite uma peça histórica do arsenal.',
    lore: 'Padrão antigo associado à proteção frontal e a combates de abordagem. Seu desbloqueio representa uma requisição de campanha, não uma promoção acima da Mk X.' },
  { id: 'mk4', name: 'Mk IV · Maximus', pattern: 'mk3', faction: 'astartes', requiredXp: 2000, requiredSessions: 10,
    description: 'Peitoral angular, cabos externos e elmo de respirador afilado.',
    lore: 'A Maximus introduziu cabos de energia protegidos no exterior do peitoral. Seu acesso no app representa uma requisição histórica.' },
  { id: 'mk5', name: 'Mk V · Heresy', pattern: 'mk3', faction: 'astartes', requiredXp: 2000, requiredSessions: 10,
    description: 'Cravos de fixação e cabos reforçados sobre o peitoral.',
    lore: 'A Heresy combina soluções de reparo e reforços com cravos de ligação. O nome identifica o padrão de equipamento.' },
  { id: 'mk6', name: 'Mk VI · Corvus', pattern: 'mk3', faction: 'astartes', requiredXp: 2000, requiredSessions: 10,
    description: 'Elmo de bico e ombreira reforçada com cravos.',
    lore: 'A Corvus é reconhecida pelo elmo de bico. Esta opção mantém sua silhueta histórica no Arsenal da campanha.' },
  { id: 'mk7', name: 'Mk VII · Aquila', pattern: 'tacticus', faction: 'astartes', requiredXp: 1000, requiredSessions: 0,
    description: 'Águia no peitoral e elmo com grade respiratória.',
    lore: 'A Aquila protege os cabos do torso e exibe o emblema imperial no peitoral. É uma alternativa de equipamento após o marco de Irmão de Batalha no app.' },
  { id: 'mk8', name: 'Mk VIII · Errant', pattern: 'tacticus', faction: 'astartes', requiredXp: 1000, requiredSessions: 0,
    description: 'Gorjal elevado e cabos cobertos por placas articuladas.',
    lore: 'A Errant adapta a Mk VII com proteção elevada para o selo do pescoço e cobertura adicional dos cabos do torso.' },
  { id: 'tacticus', name: 'Mk X · Tacticus', pattern: 'tacticus', faction: 'astartes', requiredXp: 1000, requiredSessions: 0,
    description: 'Power armour modular dos Space Marines.',
    lore: 'Tacticus é uma configuração da Mk X dos Primaris. Os padrões não formam uma escala canônica de patentes. Alternar Mk X e Mk III no mesmo avatar é uma simplificação visual do jogo.' },
  { id: 'gravis', name: 'Mk X · Gravis', pattern: 'tacticus', faction: 'astartes', requiredXp: 2000, requiredSessions: 10,
    description: 'Placas volumosas, ombreiras espessas e gola reforçada.',
    lore: 'A Gravis é uma configuração pesada da Mk X, usada por unidades como Heavy Intercessors. O requisito de dez sessões pertence à campanha do app.' },
  { id: 'phobos', name: 'Mk X · Phobos', pattern: 'tacticus', faction: 'astartes', requiredXp: 1000, requiredSessions: 0,
    description: 'Perfil leve, placas compactas e equipamento de infiltração.',
    lore: 'A Mk X Phobos é usada por Infiltrators e favorece operações atrás das linhas inimigas. Seu acesso usa o marco de Irmão de Batalha da campanha.' },
  { id: 'assault', name: 'Mk VII · Assalto', pattern: 'tacticus', faction: 'astartes', requiredXp: 1000, requiredSessions: 0,
    description: 'Aquila com propulsores de salto visíveis atrás dos ombros.',
    lore: 'Assault Marines empregam jump packs. Esta opção representa a combinação de Mk VII e propulsores mostrada na referência visual.' },
  { id: 'cataphractii', name: 'Terminator · Cataphractii', pattern: 'terminator', faction: 'astartes', requiredXp: 3000, requiredSessions: 20,
    description: 'Ombreiras em camadas e proteção pesada com pteruges.',
    lore: 'A Cataphractii é um padrão de Tactical Dreadnought Armour de placas espessas. A campanha exige Veterano e vinte sessões de mérito.' },
  { id: 'tartaros', name: 'Terminator · Tartaros', pattern: 'terminator', faction: 'astartes', requiredXp: 3000, requiredSessions: 20,
    description: 'Placas arredondadas e articulação compacta de veterania.',
    lore: 'A Tartaros é um padrão de Terminator associado a maior mobilidade que a Cataphractii. A campanha exige Veterano e vinte sessões de mérito.' },
  { id: 'terminator', name: 'Terminator · Indomitus', pattern: 'terminator', faction: 'astartes', requiredXp: 3000, requiredSessions: 20,
    description: 'Veterania e vinte sessões concedem a honra de campanha Crux Terminatus.',
    lore: 'Tactical Dreadnought Armour é associada a veteranos de excelência comprovada. A Crux Terminatus inspira este marco; XP e vinte sessões são regras do app.' },
  { id: 'novice', name: 'Hábito do noviciado', pattern: 'novice', faction: 'sororitas', requiredXp: 0, requiredSessions: 0,
    description: 'A primeira vestimenta de sua jornada.',
    lore: 'Novitiates ainda não conquistaram o direito de vestir power armour. O hábito e a proteção leve distinguem esta etapa.' },
  { id: 'sororitas', name: 'Power armour Sororitas', pattern: 'sororitas', faction: 'sororitas', requiredXp: 1000, requiredSessions: 0,
    description: 'Armadura das Irmãs de Batalha.',
    lore: 'As Battle Sisters são humanas e usam power armour própria. Não recebem implantes Astartes nem padrões Mk III ou Terminator nesta campanha.' },
  { id: 'celestian', name: 'Honras de Celestian', pattern: 'celestian', faction: 'sororitas', requiredXp: 3000, requiredSessions: 20,
    description: 'Ornamentos de veterania do seu arsenal.',
    lore: 'Celestians são veteranas de elite, não um padrão de armadura nem uma etapa obrigatória antes de Canoness. Aqui, suas honras inspiram uma opção visual.' },
  { id: 'canoness', name: 'Paramentos de Canoness', pattern: 'celestian', faction: 'sororitas', requiredXp: 6000, requiredSessions: 30,
    description: 'Manto e ornamentação de comando.',
    lore: 'Canoness é uma posição de comando. Estes paramentos são uma interpretação artística sobre power armour Sororitas; não são uma relíquia canônica nomeada.' },
];


export const INITIAL_STATE: AppState = {
  version: 1, profile: null, xp: 0, sessions: [], equipmentTesting: false, equipped: { astartes: 'scout', sororitas: 'novice' },
  completedMissionIds: [], water: 0, waterDate: localDateKey(),
  goals: createGoalBook(), wellness: emptyWellness(),
};

function freshState(): AppState {
  return { ...INITIAL_STATE, sessions: [], equipped: { ...INITIAL_STATE.equipped }, completedMissionIds: [], waterDate: localDateKey(), goals: createGoalBook(), wellness: emptyWellness() };
}

export function createProfile(name: string, sex: Sex): Profile {
  const female = sex === 'feminino';
  const hair = female ? '#E4DDD1' : '#44362F';
  return {
    name: cleanText(name, 32) || (female ? 'Irmã' : 'Recruta'), sex: female ? 'feminino' : 'masculino',
    faction: female ? 'sororitas' : 'astartes',
    avatar: {
      skin: '#C68D70', hair, hairStyle: female ? 'bob' : 'short', face: female ? 'oval' : 'square',
      facePreset: DEFAULT_FACE_PRESET, beardStyle: DEFAULT_BEARD_STYLE, beardColor: hair,
      bodyType: 'regular', eyeShape: 'almond', mouthShape: 'balanced', complexion: 'smooth', mustacheStyle: 'none',
      helmet: false, aquilaStyle: 'aquila', armourId: female ? 'novice' : 'scout',
    },
  };
}

// Previous beard sprites included the hair above the lip in these four cuts.
const LEGACY_MUSTACHES = new Map<unknown, MustacheStyle>([
  ['moustache', 'chevron'], ['short', 'chevron'], ['full', 'chevron'], ['goatee', 'pencil'],
]);

export function getRank(faction: Faction, xp: number): Rank {
  const ranks = RANKS[faction];
  return [...ranks].reverse().find(rank => rank.xp <= xp) ?? ranks[0];
}

export function getNextRank(faction: Faction, xp: number): Rank | undefined {
  return RANKS[faction].find(rank => rank.xp > xp);
}

export function canEquip(armour: Armour, state: AppState): boolean {
  const canonical = ARMOURS.find(item => item.id === armour.id);
  return !!canonical && canonical.faction === state.profile?.faction && (state.equipmentTesting === true ||
    (Number.isFinite(state.xp) && state.xp >= canonical.requiredXp
      && getMeritoriousSessions(state) >= canonical.requiredSessions));
}

/** The arsenal and progress UI use the same count; zero-XP logs still belong in history. */
export function getMeritoriousSessions(state: AppState): number {
  const ids = new Set<string>();
  for (const session of state.sessions) {
    if (!Number.isFinite(session.xp) || session.xp <= 0 || session.xp > 240) continue;
    const normalized = normalizedSession(session);
    if (normalized) ids.add(normalized.id);
  }
  return ids.size;
}

function cleanText(value: unknown, length: number): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, length) : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizedSession(value: unknown): Session | null {
  if (!isRecord(value) || !Array.isArray(value.sets)) return null;
  const id = cleanText(value.id, 100);
  const routineId = cleanText(value.routineId, 100);
  const routineName = cleanText(value.routineName, 100);
  const startedAt = typeof value.startedAt === 'string' ? value.startedAt : '';
  const endedAt = typeof value.endedAt === 'string' ? value.endedAt : '';
  const start = Date.parse(startedAt);
  const end = Date.parse(endedAt);
  if (!id || !routineId || !routineName || !Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start > 86_400_000) return null;
  const sets = value.sets.filter(validSet).slice(0, 100).map(set => ({
    exerciseId: set.exerciseId, ...exerciseSnapshot(set.exerciseId, set.exerciseName, set.muscleGroups),
    reps: set.reps, weight: set.weight, completed: true,
  }));
  if (!sets.length) return null;
  return { id, routineId, routineName, startedAt: new Date(start).toISOString(), endedAt: new Date(end).toISOString(), sets, xp: 0 };
}

/** Incomplete/invalid sets do not earn XP or volume. Repeated session IDs are ignored. */
export function completeSession(state: AppState, session: Session): AppState {
  if (!state.profile) return state;
  const cleaned = normalizedSession(session);
  if (!cleaned || state.sessions.some(previous => previous.id === cleaned.id)) return state;
  const day = localDateKey(cleaned.endedAt);
  const earnedToday = state.sessions.filter(previous => localDateKey(previous.endedAt) === day)
    .reduce((total, previous) => total + previous.xp, 0);
  const xp = Math.max(0, Math.min(120 + cleaned.sets.length * 10, 240 - earnedToday));
  const completedMissionIds = state.completedMissionIds.includes(cleaned.routineId)
    ? state.completedMissionIds : [...state.completedMissionIds, cleaned.routineId];
  return { ...state, xp: state.xp + xp, sessions: [...state.sessions, { ...cleaned, xp }], completedMissionIds };
}

/** Replays stored sessions to restore the same reward limits and discard malformed data. */
export function hydrateState(raw: string | null): AppState {
  const fallback = freshState();
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1 || !isRecord(parsed.profile)) return fallback;
    const storedProfile = parsed.profile;
    if (storedProfile.sex !== 'masculino' && storedProfile.sex !== 'feminino') return fallback;
    const profile = createProfile(cleanText(storedProfile.name, 32), storedProfile.sex);
    let state: AppState = { ...fallback, profile, equipmentTesting: parsed.equipmentTesting === true };
    if (Array.isArray(parsed.sessions)) {
      for (const value of parsed.sessions) {
        const session = normalizedSession(value);
        if (session) state = completeSession(state, session);
      }
    }
    const avatar = isRecord(storedProfile.avatar) ? storedProfile.avatar : {};
    const color = (value: unknown, backup: string) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : backup;
    const armourId = cleanText(avatar.armourId, 50);
    const equipped = isRecord(parsed.equipped) ? parsed.equipped : {};
    const preferredId = cleanText(equipped[profile.faction], 50) || armourId;
    const armour = ARMOURS.find(item => item.id === preferredId);
    const selectedId = armour && canEquip(armour, state) ? armour.id : profile.avatar.armourId;
    const hair = color(avatar.hair, profile.avatar.hair);
    profile.avatar = {
      ...profile.avatar,
      skin: color(avatar.skin, profile.avatar.skin), hair,
      hairStyle: readChoice(HAIR_STYLES, avatar.hairStyle, profile.avatar.hairStyle),
      face: readChoice(FACE_SHAPES, avatar.face, profile.avatar.face),
      facePreset: readChoice(FACE_PRESETS, avatar.facePreset, DEFAULT_FACE_PRESET),
      bodyType: readChoice(BODY_TYPES, avatar.bodyType, profile.avatar.bodyType),
      eyeShape: readChoice(EYE_SHAPES, avatar.eyeShape, profile.avatar.eyeShape),
      mouthShape: readChoice(MOUTH_SHAPES, avatar.mouthShape, profile.avatar.mouthShape),
      complexion: readChoice(COMPLEXIONS, avatar.complexion, profile.avatar.complexion),
      beardStyle: readChoice(BEARD_STYLES, avatar.beardStyle, DEFAULT_BEARD_STYLE),
      mustacheStyle: readChoice(MUSTACHE_STYLES,
        avatar.mustacheStyle === undefined ? LEGACY_MUSTACHES.get(avatar.beardStyle) : avatar.mustacheStyle, 'none'),
      beardColor: color(avatar.beardColor, hair),
      helmet: typeof avatar.helmet === 'boolean' ? avatar.helmet : profile.avatar.helmet,
      aquilaStyle: readChoice(AQUILA_STYLES, avatar.aquilaStyle, 'aquila'),
      armourId: selectedId,
    };
    state.equipped[profile.faction] = selectedId;
    const today = localDateKey();
    state.water = parsed.waterDate === today && typeof parsed.water === 'number' && Number.isFinite(parsed.water)
      ? Math.min(10000, Math.max(0, Math.round(parsed.water))) : 0;
    state.waterDate = today;
    state.goals = hydrateGoals(parsed.goals);
    state.wellness = normalizeWellness(parsed.wellness);
    return state;
  } catch {
    return fallback;
  }
}

export function getStats(state: Pick<AppState, 'sessions'>): { volume: number; totalMinutes: number; completedSets: number; workouts: number } {
  const countedIds = new Set<string>();
  return state.sessions.reduce((stats, session) => {
    const normalized = normalizedSession(session);
    if (!normalized || countedIds.has(normalized.id)) return stats;
    countedIds.add(normalized.id);
    stats.volume += normalized.sets.reduce((total, set) => total + set.weight * set.reps, 0);
    stats.totalMinutes += (Date.parse(normalized.endedAt) - Date.parse(normalized.startedAt)) / 60000;
    stats.completedSets += normalized.sets.length;
    stats.workouts += 1;
    return stats;
  }, { volume: 0, totalMinutes: 0, completedSets: 0, workouts: 0 });
}

export function getWeeklyActivity(state: Pick<AppState, 'sessions'>, now = new Date()): { label: string; count: number; date: string }[] {
  const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + index);
    const key = localDateKey(date);
    return { label: labels[date.getDay()], count: state.sessions.filter(session => localDateKey(session.endedAt) === key).length, date: key };
  });
}

export function getStreak(state: AppState): number {
  const dates = new Set(state.sessions.map(session => localDateKey(session.endedAt)));
  const cursor = new Date();
  // Yesterday remains current until the end of today; missed days never remove XP.
  if (!dates.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (dates.has(localDateKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
