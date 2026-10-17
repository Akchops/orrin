// One lens: the detail page for each proposal. The lens itself is the page:
// a full-bleed shot with the name set enormous behind it, a strip of tight
// crops on the parts, the figures as readouts, then the way to the next lens.
import { site, esc, lensRoute, img, contactLines, proposalTag, footer, route, specTable } from '../parts.js';
import { lenses } from '../../content/lenses.js';

// The large transparent shot for each lens (wide, standard, long).
const SHOT = { shaniwar: 'lens-1', parvati: 'lens-2', sinhagad: 'lens-3' };
// Width of each name in em, set in Saira at the hero's weight and stretch,
// so the name can be sized to run edge to edge. Unknown names fall back to
// an estimate from their length.
const EM = { shaniwar: 5.06, parvati: 3.74, sinhagad: 5.1 };
// Where the top of the barrel sits in each shot, as a share of its height,
// so the barrel crosses the name at the same place on every page.
const SIL = { 'lens-1': 0.053, 'lens-2': 0.091, 'lens-3': 0.119 };
const spec = (l, key) => (l.specs.find(([k]) => k === key) || [key, ''])[1];
// "50 mm" -> 50 with a small unit; "f/1.8" and "PL" stay as they are.
function figure(v) {
  const m = String(v).match(/^([\d.]+)\s+(.+)$/);
  return m ? `${esc(m[1])}<span class="lens__unit">${esc(m[2])}</span>` : esc(v);
}
const two = (n) => String(n).padStart(2, '0');

export function lensHTML(l, i) {
  const id = lensRoute(l);
  const prev = lenses[(i + lenses.length - 1) % lenses.length], next = lenses[(i + 1) % lenses.length];
  const shot = SHOT[l.slug] || `lens-${i + 1}`;
  const em = EM[l.slug] || +(l.name.length * 0.65).toFixed(2);

  const tile = (kind, still, key, label) => `
    <figure class="lens__tile lens__tile--${kind}">
      <div class="lens__crop">${img(still)}</div>
      <figcaption class="lens__cap">
        <span class="lens__cap-k">${esc(key)}</span>
        <span class="lens__cap-v">${figure(spec(l, key))}</span>
        <span class="lens__cap-d">${esc(label)}</span>
      </figcaption>
    </figure>`;

  const readout = (key, cls = '') => `
        <div class="lens__read${cls}"><dt>${esc(key)}</dt><dd>${figure(spec(l, key))}</dd></div>`;

  const pager = (x, dir) => `<a class="lens__pg lens__pg--${dir}" href="#${lensRoute(x)}" data-band="${x.band}">
      <span class="pager__dir lens__pg-dir">${dir === 'prev' ? '<span aria-hidden="true">&larr;</span> Previous lens' : 'Next lens <span aria-hidden="true">&rarr;</span>'}</span>
      <span class="lens__pg-fig" aria-hidden="true">${esc(String(spec(x, 'Focal length')).replace(/\s*mm$/, ''))}</span>
      <span class="lens__pg-name">${esc(x.name)}</span>
      <span class="lens__pg-role">${esc(x.role)} &middot; ${esc(spec(x, 'Focal length'))} ${proposalTag}</span>
    </a>`;

  return route(id, `${l.name} (proposal) · ${site.name}`, `
<div class="lens" data-band="${l.band}">
  <div class="lens__hero" style="--em: ${em}; --sil: ${SIL[shot] ?? 0.09}">
    <div class="lens__bar">
      <nav class="crumbs lens__crumbs" aria-label="Breadcrumb"><a href="#lenses">Lenses</a><span aria-hidden="true">/</span><span aria-current="page">${esc(l.name)}</span></nav>
      <p class="eyebrow lens__eyebrow"><span>${two(i + 1)} &middot; ${esc(l.role)} lens</span>${proposalTag}</p>
    </div>
    <div class="lens__title">
      <h1 class="lens__name" id="${id}-title" tabindex="-1">${esc(l.name)}</h1>
      <div class="lens__shot">${img(shot, { lazy: false })}</div>
      <p class="lens__name lens__name--ghost" aria-hidden="true">${esc(l.name)}</p>
    </div>
    <div class="lens__foot">
      <p class="lens__line">${esc(l.line)}</p>
      <details class="enquire lens__enq">
        <summary class="btn btn--solid">Enquire about ${esc(l.name)}</summary>
        <div class="enquire__body">
          <p>Write or call the studio in ${esc(site.city)} and mention ${esc(l.name)}.</p>
          ${contactLines()}
        </div>
      </details>
      <p class="note">The name ${esc(l.name)} and its role are proposals for this concept.</p>
    </div>
  </div>

  <section class="lens__detail" aria-labelledby="${id}-detail">
    <h2 class="sr-only" id="${id}-detail">${esc(l.name)} up close</h2>
    ${tile('glass', 'd-glass', 'Front diameter', 'Coated front element')}
    ${tile('scale', 'd-scale', 'Close focus', 'Engraved distance scale')}
    ${tile('mount', 'd-mount', 'Mount', 'Stainless mount, rear element')}
  </section>

  <section class="lens__specs" aria-labelledby="${id}-specs">
    <h2 class="lens__specs-h" id="${id}-specs"><span>Specifications</span> ${proposalTag}</h2>
    <dl class="lens__key">${readout('Focal length', ' lens__read--main')}${readout('Maximum aperture')}${readout('Weight')}
    </dl>
    <div class="lens__table">${specTable(l, `${l.name}: sample specifications`)}</div>
  </section>

  <nav class="lens__pager" aria-label="Other lenses">
    ${pager(prev, 'prev')}
    ${pager(next, 'next')}
  </nav>
</div>
${footer('#' + id)}`, 'route--lens');
}
