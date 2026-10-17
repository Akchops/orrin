// Lenses: the three proposal lenses.
import { site, esc, paras, href, lensRoute, img, contactLines, proposalTag, footer, route, pageHead } from '../parts.js';
import { lenses } from '../../content/lenses.js';

function lensCard(l, { heading = 'h3', lazy = true } = {}) {
  return `<li class="lcard" data-band="${l.band}">
  <a class="lcard__link" href="#${lensRoute(l)}">
    <span class="lcard__img">${img(l.thumb, { lazy })}</span>
    <span class="lcard__body">
      <span class="lcard__role">${esc(l.role)} ${proposalTag}</span>
      <${heading} class="lcard__name">${esc(l.name)}</${heading}>
      <span class="lcard__line">${esc(l.line)}</span>
      <span class="lcard__more">View lens <span aria-hidden="true">&rarr;</span></span>
    </span>
  </a>
</li>`;
}

export function lensesHTML() {
  const heads = lenses.map((l) => `<th scope="col"><a href="#${lensRoute(l)}">${esc(l.name)}</a></th>`).join('');
  const rows = lenses[0].specs.map(([k], i) => `<tr><th scope="row">${esc(k)}</th>${lenses.map((l) => `<td>${esc(l.specs[i][1])}</td>`).join('')}</tr>`).join('');
  return route('lenses', `Lenses · ${site.name}`, `
${pageHead({ id: 'lenses', eyebrow: 'Lenses', title: 'Three lenses', lead: 'A wide, a standard and a long lens for cinema and photography. Each is assembled by one optician and signed on the barrel.', note: site.proposalNote })}
<div class="wrap">
  <ul class="lgrid lgrid--index">${lenses.map((l) => lensCard(l, { heading: 'h2', lazy: false })).join('\n')}</ul>
  <section class="compare" aria-labelledby="compare-title">
    <h2 id="compare-title">Side by side</h2>
    <div class="scroll-x" role="region" aria-labelledby="compare-title" tabindex="0">
      <table class="spec spec--compare"><caption>Sample specifications for the three proposal lenses</caption>
        <thead><tr><td></td>${heads}</tr></thead><tbody>${rows}</tbody></table>
    </div>
    <p class="spec-note">${esc(site.specNote)}</p>
  </section>
</div>
${footer('#lenses')}`);
}

