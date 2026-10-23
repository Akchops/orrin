// One lens: the detail page for each proposal. It opens on the whole lens,
// turning, with its name and line beside it; then the street viewer set to
// this lens, the close-ups, the figures, and the way to the next lens.
import { site, esc, lensRoute, img, contactLines, proposalTag, footer, route, specTable, viewerTools } from '../parts.js';
import { fovHTML } from '../fov-svg.js';
import { focusBeat, apertureBeat } from '../lab-svg.js';
import { inspectHTML } from '../inspect-html.js';
import { LENSES } from '../../app/fov.js';
import { lenses } from '../../content/lenses.js';

// The large transparent shot for each lens (wide, standard, long).
const SHOT = { shaniwar: 'lens-1', parvati: 'lens-2', sinhagad: 'lens-3' };
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
  <div class="lens__hero">
    <div class="lens__bar">
      <nav class="crumbs lens__crumbs" aria-label="Breadcrumb"><a href="#lenses">Lenses</a><span aria-hidden="true">/</span><span aria-current="page">${esc(l.name)}</span></nav>
      <p class="eyebrow lens__eyebrow"><span>${two(i + 1)} &middot; ${esc(l.role)} lens</span>${proposalTag}</p>
    </div>
    <!-- The whole lens, turning slowly, with its name and line beside it
         (under it on phones); never cropped, never under the type. -->
    <div class="lens__stage">
      <div class="lens__shot" id="${id}-viewer" data-viewer="${i}">${img(shot, { lazy: false })}</div>
    </div>
    <div class="lens__foot">
      <h1 class="lens__name" id="${id}-title" tabindex="-1">${esc(l.name)}</h1>
      <p class="lens__mm">${figure(spec(l, 'Focal length'))} <span class="lens__mm-role">${esc(l.role)}</span></p>
      <p class="lens__line">${esc(l.line)}</p>
      <p class="lens__set">${esc(l.shape)}</p>
      ${viewerTools(`${id}-viewer`, { hint: 'Drag to turn the lens. Pinch, or use the buttons, to zoom.' })}
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

  <!-- The experiences: each a beat that holds while scroll plays it, then
       hands it over (src/site/lab.js, src/site/beats.js). -->
  ${focusBeat(l, i, id, `${id}-fov`)}
  ${apertureBeat(l, i, id, `${id}-fov`)}
  <section class="beat lab lab--sees" id="${id}-sees" data-beat="sees" data-lens="${i}" aria-labelledby="${id}-sees-t">
    <div class="beat__pin lab__pin">
      <header class="lab__head">
        <p class="eyebrow lab__eyebrow"><span class="lab__no">03</span> What it sees</p>
        <h2 class="lab__h" id="${id}-sees-t">${LENSES[i].deg}&deg; of the street</h2>
        <p class="lab__lead">${esc(l.use)}</p>
      </header>
      ${fovHTML({ id: `${id}-fov`, lens: l.slug, head: false, cue: `<div class="lab__ctl ctl ctl--bare">
        <p class="ctl__say"><span class="ctl__cue">Try it</span> <span class="ctl__how">Tap another lens, or drag the focal length.</span></p>
      </div>` })}
    </div>
  </section>

  ${inspectHTML({ id: `${id}-insp`, k: i, lens: l, no: '04' })}

  <section class="lens__specs" aria-labelledby="${id}-specs">
    <h2 class="lens__specs-h" id="${id}-specs"><span class="lab__no">05</span> <span>Specifications</span> <span class="tag tag--sample">Sample figures</span> ${proposalTag}</h2>
    <dl class="lens__key">${readout('Focal length', ' lens__read--main')}${readout('Maximum aperture')}${readout('Weight')}
    </dl>
    <div class="lens__table">${specTable(l, `${l.name}: sample specifications`)}</div>
    <div class="lens__enquire">
      <p class="lens__enquire-t">Like what ${esc(l.name)} does?</p>
      <details class="enquire lens__enq lens__enq--end">
        <summary class="btn btn--solid">Enquire about ${esc(l.name)}</summary>
        <div class="enquire__body">
          <p>Write or call the studio in ${esc(site.city)} and mention ${esc(l.name)}.</p>
          ${contactLines()}
        </div>
      </details>
    </div>
  </section>

  <nav class="lens__pager" aria-label="Other lenses">
    ${pager(prev, 'prev')}
    ${pager(next, 'next')}
  </nav>
</div>
${footer('#' + id)}`, 'route--lens');
}
