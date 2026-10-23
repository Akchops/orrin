// The three lenses' proportions, as multiples of the standard lens
// (Parvati, 99 mm long, 80 mm across the front): Shaniwar short and wide,
// Sinhagad long and narrow. src/app/lens.js scales the model by them;
// src/app/textures.js draws each lens's engraving to suit, so the
// numerals keep their shape on every lens.
export const LEN_K = [0.72, 1, 1.45];
export const FRONT_K = [1.2, 1, 0.86];
