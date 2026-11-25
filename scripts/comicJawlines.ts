import type { FacePreset, FaceShape } from '../src/avatarOptions';
import type { Faction } from '../src/domain';

type JawWidths = readonly [
  sideburnLeft: number, sideburnRight: number, cheekLeft: number, cheekRight: number,
  angleLeft: number, angleRight: number, lowerLeft: number, lowerRight: number, chinY: number,
];

type FaceRegistration = {
  mouth: readonly [centerX: number, halfWidth: number, lowerLipY: number];
  square: JawWidths;
  oval: JawWidths;
  round: JawWidths;
};

// Coordinates in the same 200 × 218 space as the printed portrait. Left and
// right are the viewer's left and right. At y=92 the root sits on the cheek
// side of the ear. The two rows at y=127 and y=140 follow the opaque skin edge
// below the earlobe; its alpha edge above those rows would include the ear.
// The final row follows the ink boundary between chin and neck, rather than
// tracing the neck silhouette. Each atlas column has different measurements.
const jawlines = {
  astartes: {
    european: {
      mouth: [103, 26, 130],
      square: [39, 157, 37, 160, 37, 161, 59, 139, 157],
      oval: [40, 156, 49, 150, 49, 150, 62, 136, 157],
      round: [35, 161, 35, 164, 36, 162, 57, 146, 152],
    },
    eastAsian: {
      mouth: [102, 23, 132],
      square: [45, 158, 43, 159, 43, 158, 65, 136, 157],
      oval: [46, 157, 53, 148, 54, 147, 68, 133, 157],
      round: [41, 162, 40, 162, 42, 159, 61, 139, 153],
    },
    african: {
      mouth: [103, 28, 133],
      square: [41, 161, 38, 162, 37, 161, 60, 125, 157],
      oval: [42, 160, 49, 150, 49, 150, 63, 123, 157],
      round: [37, 165, 35, 164, 36, 163, 57, 128, 153],
    },
    southAsian: {
      mouth: [103, 25, 132],
      square: [43, 157, 42, 158, 43, 157, 65, 134, 158],
      oval: [44, 156, 53, 148, 53, 146, 67, 127, 158],
      round: [39, 161, 39, 161, 42, 158, 57, 140, 152],
    },
    middleEastern: {
      mouth: [104, 25, 132],
      square: [40, 158, 38, 159, 38, 158, 68, 127, 159],
      oval: [41, 157, 49, 148, 49, 147, 70, 127, 159],
      round: [36, 162, 35, 162, 36, 160, 60, 129, 154],
    },
    indigenousAmerican: {
      mouth: [104, 26, 130],
      square: [40, 162, 40, 162, 42, 159, 66, 136, 160],
      oval: [41, 161, 51, 150, 53, 148, 66, 135, 160],
      round: [36, 166, 37, 164, 41, 160, 59, 142, 155],
    },
  },
  sororitas: {
    european: {
      mouth: [102, 23, 131],
      square: [46, 154, 46, 154, 49, 152, 64, 134, 159],
      oval: [47, 153, 56, 144, 59, 142, 65, 132, 159],
      round: [42, 158, 43, 157, 49, 152, 62, 138, 155],
    },
    eastAsian: {
      mouth: [102, 23, 132],
      square: [44, 155, 45, 154, 49, 150, 65, 134, 159],
      oval: [45, 154, 55, 144, 59, 140, 67, 132, 159],
      round: [40, 159, 43, 156, 49, 150, 61, 137, 154],
    },
    african: {
      mouth: [103, 27, 133],
      square: [46, 154, 46, 154, 49, 151, 63, 124, 158],
      oval: [47, 153, 55, 144, 59, 142, 65, 134, 158],
      round: [42, 158, 43, 157, 49, 152, 62, 139, 155],
    },
    southAsian: {
      mouth: [103, 24, 132],
      square: [46, 154, 46, 154, 49, 151, 66, 133, 160],
      oval: [47, 153, 55, 144, 59, 142, 67, 132, 160],
      round: [42, 158, 43, 157, 49, 152, 61, 139, 155],
    },
    middleEastern: {
      mouth: [101, 24, 132],
      square: [47, 153, 47, 153, 50, 150, 65, 133, 159],
      oval: [48, 152, 56, 144, 59, 141, 67, 132, 159],
      round: [43, 157, 44, 156, 49, 151, 55, 136, 155],
    },
    indigenousAmerican: {
      mouth: [104, 26, 132],
      square: [44, 158, 44, 159, 47, 157, 62, 139, 159],
      oval: [45, 157, 54, 148, 56, 146, 63, 137, 159],
      round: [40, 162, 41, 162, 46, 158, 58, 145, 154],
    },
  },
} as const satisfies Record<Faction, Record<FacePreset, FaceRegistration>>;

export function getComicJawline(faction: Faction, preset: FacePreset, face: FaceShape) {
  const registration = jawlines[faction][preset];
  const [rootL, rootR, cheekL, cheekR, angleL, angleR, lowerL, lowerR, chinY] = registration[face];
  const [mouthX, halfWidth, lowerLipY] = registration.mouth;
  return {
    sideburn: { left: rootL, right: rootR, y: 92 },
    cheek: { left: cheekL, right: cheekR, y: 127 },
    angle: { left: angleL, right: angleR, y: 140 },
    lowerJaw: { left: lowerL, right: lowerR, y: chinY - 9 },
    chin: { x: mouthX, y: chinY },
    mouth: { x: mouthX, y: 121, halfWidth, lowerLipY },
  };
}

