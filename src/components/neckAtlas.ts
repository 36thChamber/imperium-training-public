// All coordinates are portrait units. PNGs are printed at 1.5 pixels per unit.
export const neckTop = 120;
export const neckHeight = 98;
export const neckSourceY = { regular: neckTop, slender: 394, broad: 492 } as const;
export const portraitSheetHeight = neckSourceY.broad + neckHeight;
