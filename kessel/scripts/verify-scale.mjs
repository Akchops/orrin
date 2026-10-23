// The engraved distance scale's rules, checked on every build (build.mjs
// runs this and fails if anything breaks): for each lens's layout
// (src/app/textures.js scaleLayout) every numeral lies inside the band with
// its margin, no numeral's extent along the axis reaches the tick band, two
// labels in a row are never closer than a numeral height, and the film's
// readout ends on the film lens's closest mark.
//   node kessel/scripts/verify-scale.mjs
import { scaleLayout, emWidth, SCALES, FILM_SCALE, distanceLabel } from '../src/app/textures.js';

const MARGIN = 0.6 - 1e-6;
const errors = [];
for (const k of [0, 1, 2]) {
  const L = scaleLayout(k);
  const name = ['Shaniwar', 'Parvati', 'Sinhagad'][k];
  const rows = [
    { list: [...L.metres, { t: 'm' }], h: L.hm, extent: (x) => [L.mEnd - emWidth(x.t) * L.hm, L.mEnd] },
    { list: [...L.feet, { t: 'ft' }], h: L.hf, extent: (x) => [L.fStart, L.fStart + emWidth(x.t) * L.hf] },
  ];
  for (const r of rows) {
    for (const x of r.list) {
      const [a, b] = r.extent(x);
      if (a < MARGIN) errors.push(`${name} "${x.t}" starts ${a.toFixed(2)} mm from the band's front edge (margin ${MARGIN.toFixed(1)})`);
      if (b > L.len - MARGIN) errors.push(`${name} "${x.t}" ends ${(L.len - b).toFixed(2)} mm from the rear edge`);
      if (b > L.t0 - 0.3 && a < L.t1 + 0.3) errors.push(`${name} "${x.t}" (${a.toFixed(2)}-${b.toFixed(2)} mm) reaches the tick band (${L.t0.toFixed(2)}-${L.t1.toFixed(2)} mm)`);
    }
    const marks = r.list.filter((x) => x.p !== undefined);
    for (let i = 1; i < marks.length; i++) {
      const gap = (marks[i].p - marks[i - 1].p) * L.arc;
      if (gap < 1.3 * r.h - 1e-6) errors.push(`${name} "${marks[i - 1].t}" and "${marks[i].t}" are ${gap.toFixed(2)} mm apart (numeral ${r.h.toFixed(2)} mm)`);
    }
  }
  const close = SCALES[k].m[SCALES[k].m.length - 1];
  if (L.metres[L.metres.length - 1].t !== String(close)) errors.push(`${name}'s closest mark ${close} was dropped`);
}
const end = distanceLabel(1, FILM_SCALE);
if (end !== `${SCALES[FILM_SCALE].close} m`) errors.push(`the film readout ends on "${end}", not the closest mark ${SCALES[FILM_SCALE].close} m`);

if (errors.length) {
  console.error('scale check failed:\n  ' + errors.join('\n  '));
  process.exit(1);
}
console.log('scale check: 3 lenses, every numeral inside its band and clear of the ticks; film readout ends on ' + end);
