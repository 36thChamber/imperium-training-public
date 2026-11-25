import type { ImageSourcePropType } from 'react-native';
import type { FacePreset } from '../avatarOptions';
import type { Faction } from '../domain';

// Each portrait contains three jaw silhouettes, plus interchangeable eye and
// mouth strips sampled from the same ink drawing at their registered landmarks.
export const PORTRAITS = {
  astartes: {
    european: require('../../assets/avatar-comic/heads/astartes-european.png'),
    eastAsian: require('../../assets/avatar-comic/heads/astartes-eastAsian.png'),
    african: require('../../assets/avatar-comic/heads/astartes-african.png'),
    southAsian: require('../../assets/avatar-comic/heads/astartes-southAsian.png'),
    middleEastern: require('../../assets/avatar-comic/heads/astartes-middleEastern.png'),
    indigenousAmerican: require('../../assets/avatar-comic/heads/astartes-indigenousAmerican.png'),
  },
  sororitas: {
    european: require('../../assets/avatar-comic/heads/sororitas-european.png'),
    eastAsian: require('../../assets/avatar-comic/heads/sororitas-eastAsian.png'),
    african: require('../../assets/avatar-comic/heads/sororitas-african.png'),
    southAsian: require('../../assets/avatar-comic/heads/sororitas-southAsian.png'),
    middleEastern: require('../../assets/avatar-comic/heads/sororitas-middleEastern.png'),
    indigenousAmerican: require('../../assets/avatar-comic/heads/sororitas-indigenousAmerican.png'),
  },
} satisfies Record<Faction, Record<FacePreset, ImageSourcePropType>>;

// The four rows are stubble, short, full and goatee. Each column is fitted
// to the same jaw as the corresponding column of PORTRAITS.
export const BEARDS = {
  astartes: {
    european: require('../../assets/avatar-comic/beards/astartes-european.png'),
    eastAsian: require('../../assets/avatar-comic/beards/astartes-eastAsian.png'),
    african: require('../../assets/avatar-comic/beards/astartes-african.png'),
    southAsian: require('../../assets/avatar-comic/beards/astartes-southAsian.png'),
    middleEastern: require('../../assets/avatar-comic/beards/astartes-middleEastern.png'),
    indigenousAmerican: require('../../assets/avatar-comic/beards/astartes-indigenousAmerican.png'),
  },
  sororitas: {
    european: require('../../assets/avatar-comic/beards/sororitas-european.png'),
    eastAsian: require('../../assets/avatar-comic/beards/sororitas-eastAsian.png'),
    african: require('../../assets/avatar-comic/beards/sororitas-african.png'),
    southAsian: require('../../assets/avatar-comic/beards/sororitas-southAsian.png'),
    middleEastern: require('../../assets/avatar-comic/beards/sororitas-middleEastern.png'),
    indigenousAmerican: require('../../assets/avatar-comic/beards/sororitas-indigenousAmerican.png'),
  },
} satisfies Record<Faction, Record<FacePreset, ImageSourcePropType>>;

export const GROOMING = {
  'crop': require('../../assets/avatar-comic/heads/crop.png'),
  'pixie': require('../../assets/avatar-comic/heads/pixie.png'),
  'bob': require('../../assets/avatar-comic/heads/bob.png'),
  'curly': require('../../assets/avatar-comic/heads/curly.png'),
  pencil: require('../../assets/avatar-comic/heads/pencil.png'),
  chevron: require('../../assets/avatar-comic/heads/chevron.png'),
  horseshoe: require('../../assets/avatar-comic/heads/horseshoe.png'),
} satisfies Record<string, ImageSourcePropType>;

