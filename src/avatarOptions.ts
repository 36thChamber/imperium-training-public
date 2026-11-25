/** Stored portrait IDs keep earlier characters' artwork when their appearance is edited. */
export const FACE_PRESETS = [
  { id: 'european' },
  { id: 'eastAsian' },
  { id: 'african' },
  { id: 'southAsian' },
  { id: 'middleEastern' },
  { id: 'indigenousAmerican' },
] as const;

export const FACE_SHAPES = [
  { id: 'square', label: 'Angular' },
  { id: 'oval', label: 'Oval' },
  { id: 'round', label: 'Arredondado' },
] as const;

export const BODY_TYPES = [
  { id: 'slender', label: 'Esguio' },
  { id: 'regular', label: 'Médio' },
  { id: 'broad', label: 'Robusto' },
] as const;

export const EYE_SHAPES = [
  { id: 'almond', label: 'Amendoados' },
  { id: 'round', label: 'Arredondados' },
  { id: 'hooded', label: 'Pálpebras encobertas' },
] as const;

export const MOUTH_SHAPES = [
  { id: 'balanced', label: 'Médios' },
  { id: 'thin', label: 'Finos' },
  { id: 'full', label: 'Volumosos' },
] as const;

export const COMPLEXIONS = [
  { id: 'smooth', label: 'Lisa' },
  { id: 'freckles', label: 'Com sardas' },
  { id: 'weathered', label: 'Com marcas de expressão' },
] as const;

export const HAIR_STYLES = [
  { id: 'short', label: 'Curto' },
  { id: 'shaved', label: 'Raspado' },
  { id: 'bob', label: 'Chanel' },
  { id: 'curly', label: 'Crespo ou cacheado' },
] as const;

export const BEARD_STYLES = [
  { id: 'none', label: 'Sem barba' },
  { id: 'stubble', label: 'Por fazer' },
  { id: 'short', label: 'Curta' },
  { id: 'full', label: 'Cheia' },
  { id: 'goatee', label: 'Cavanhaque' },
] as const;

export const MUSTACHE_STYLES = [
  { id: 'none', label: 'Sem bigode' },
  { id: 'pencil', label: 'Lápis' },
  { id: 'chevron', label: 'Chevron' },
  { id: 'horseshoe', label: 'Ferradura' },
] as const;

export const AQUILA_STYLES = [
  { id: 'aquila', label: 'Áquila imperial' },
  { id: 'imperialis', label: 'Caveira alada' },
  { id: 'ornate', label: 'Áquila ornamentada' },
] as const;

export type AquilaStyle = typeof AQUILA_STYLES[number]['id'];

export type FacePreset = typeof FACE_PRESETS[number]['id'];
export type FaceShape = typeof FACE_SHAPES[number]['id'];
export type HairStyle = typeof HAIR_STYLES[number]['id'];
export type BeardStyle = typeof BEARD_STYLES[number]['id'];
export type BodyType = typeof BODY_TYPES[number]['id'];
export type EyeShape = typeof EYE_SHAPES[number]['id'];
export type MouthShape = typeof MOUTH_SHAPES[number]['id'];
export type Complexion = typeof COMPLEXIONS[number]['id'];
export type MustacheStyle = typeof MUSTACHE_STYLES[number]['id'];

// The original portraits remain the migration default, not a preferred identity.
export const DEFAULT_FACE_PRESET: FacePreset = 'european';
export const DEFAULT_BEARD_STYLE: BeardStyle = 'none';

export function readChoice<Id extends string>(options: readonly { id: Id }[], value: unknown, fallback: Id): Id {
  return options.find(option => option.id === value)?.id ?? fallback;
}
