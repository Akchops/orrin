// Lenses: the three proposal lenses. One frame of the lineup with the title
// set behind the glass, then a section per lens, each composed differently
// (bleeding right, bleeding left, a tight crop across the whole width), and
// the side-by-side table set like an engraved scale.
import { site, esc, lensRoute, img, proposalTag, footer, route, viewerTools } from '../parts.js';
import { fovHTML } from '../fov-svg.js';
import { lenses, matchedSet } from '../../content/lenses.js';

const spec = (l, key) => (l.specs.find(([k]) => k === key) || [key, ''])[1];
// "28 mm" -> ["28", "mm"], so the number can be set large and the unit small.
const split = (v) => { const m = String(v).match(/^([\d.]+)\s*(.*)$/); return m ? [m[1], m[2]] : [v, '']; };
const kinds = ['a', 'b', 'c'];

function heroLabel(l) {
  const [mm, unit] = split(spec(l, 'Focal length'));
  return `<li class="lx-hero__label" data-band="${l.band}">
      <a href="#${lensRoute(l)}">
        <span class="lx-hero__mm">${esc(mm)}<small>${esc(unit)}</small></span>
        <span class="lx-hero__role">${esc(l.role)}</span>
        <span class="lx-hero__name">${esc(l.name)} <span aria-hidden="true">&rarr;</span></span>
      </a>
    </li>`;
}

function lensSection(l, i) {
  const id = `lenses-${l.slug}`;
  const [mm, unit] = split(spec(l, 'Focal length'));
  const no = String(i + 1).padStart(2, '0');
  return `<article class="lx-lens lx-lens--${kinds[i % 3]}" data-band="${l.band}" id="${id}" aria-labelledby="${id}-name">
  <div class="lx-lens__fig">${img(`lens-${i + 1}`)}</div>
  <p class="lx-lens__mm" aria-hidden="true">${esc(mm)}<small>${esc(unit)}</small></p>
  <div class="lx-lens__copy">
    <p class="lx-lens__kicker"><span class="lx-lens__no">${no}</span> <span>${esc(l.role)} &middot; ${esc(spec(l, 'Focal length'))} &middot; ${esc(spec(l, 'Maximum aperture'))}</span> ${proposalTag}</p>
    <h2 class="lx-lens__name" id="${id}-name">${esc(l.name)}</h2>
    <p class="lx-lens__line">${esc(l.line)}</p>
    <a class="lx-lens__more" href="#${lensRoute(l)}">View lens<span class="sr-only">: ${esc(l.name)}</span> <span class="lx-lens__arrow" aria-hidden="true">&rarr;</span></a>
  </div>
</article>`;
}

export function lensesHTML() {
  const heads = lenses.map((l) => `<th scope="col" data-band="${l.band}"><a href="#${lensRoute(l)}">${esc(l.name)}</a><span>${esc(l.role)}</span></th>`).join('');
  const rows = lenses[0].specs.map(([k], i) => `<tr${i === 0 ? ' class="lx-spec__lead"' : ''}><th scope="row">${esc(k)}</th>${lenses.map((l) => `<td>${esc(l.specs[i][1])}</td>`).join('')}</tr>`).join('');
  return route('lenses', `Lenses · ${site.name}`, `
<div class="lx">
  <header class="lx-hero">
    <div class="lx-hero__head wrap">
      <p class="eyebrow lx-hero__eyebrow">Lenses <span>&middot; 01&ndash;03</span></p>
      <h1 id="lenses-title" tabindex="-1" class="lx-hero__title"><span>Three</span> <span>lenses</span></h1>
      <div class="lx-hero__aside">
        <p class="lx-hero__lead">A wide, a standard and a long lens for cinema and photography: a matched set, one body, each assembled by one optician and signed on the barrel.</p>
        <p class="note">${esc(site.proposalNote)}</p>
      </div>
    </div>
    <div class="lx-hero__stage">
      <div class="lx-hero__fig" id="lenses-viewer" data-viewer="lineup">${img('lineup', { lazy: false })}</div>
      <ol class="lx-hero__labels">
    ${lenses.map(heroLabel).join('\n    ')}
      </ol>
      ${viewerTools('lenses-viewer', { hint: 'Drag to turn the three lenses. Tap one to open it.', buttons: false })}
    </div>
  </header>

  <div class="lx-fov wrap">
    ${fovHTML({ id: 'lenses-fov', lens: 'shaniwar' })}
  </div>

  ${lenses.map(lensSection).join('\n\n  ')}

  <section class="lx-compare" aria-labelledby="lenses-compare-title">
    <div class="lx-compare__scale">${img('d-scale')}</div>
    <div class="lx-compare__inner wrap">
      <div class="lx-compare__head">
        <p class="eyebrow">Sample specifications</p>
        <h2 id="lenses-compare-title">Side by side</h2>
      </div>
      <div class="lx-compare__body">
        <table class="spec lx-spec"><caption>Sample specifications for the three proposal lenses</caption>
          <thead><tr><td></td>${heads}</tr></thead><tbody>${rows}</tbody></table>
        <p class="spec-note">${esc(site.specNote)}</p>
        <p class="lx-set"><strong>${esc(matchedSet.title)}.</strong> ${esc(matchedSet.line)} ${esc(matchedSet.differ)}</p>
      </div>
    </div>
  </section>
</div>
${footer('#lenses')}`);
}
