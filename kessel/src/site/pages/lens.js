// One lens: the detail page for each proposal.
import { site, esc, paras, href, lensRoute, img, contactLines, proposalTag, footer, route, pageHead, specTable } from '../parts.js';
import { lenses } from '../../content/lenses.js';



export function lensHTML(l, i) {
  const id = lensRoute(l);
  const prev = lenses[(i + lenses.length - 1) % lenses.length], next = lenses[(i + 1) % lenses.length];
  const pager = (x, dir) => `<a class="pager__link pager__link--${dir}" href="#${lensRoute(x)}" data-band="${x.band}">
      <span class="pager__dir">${dir === 'prev' ? '<span aria-hidden="true">&larr;</span> Previous lens' : 'Next lens <span aria-hidden="true">&rarr;</span>'}</span>
      <span class="pager__name">${esc(x.name)}</span><span class="pager__role">${esc(x.role)}</span></a>`;
  return route(id, `${l.name} (proposal) · ${site.name}`, `
<div class="wrap lens" data-band="${l.band}">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="#lenses">Lenses</a><span aria-hidden="true">/</span><span aria-current="page">${esc(l.name)}</span></nav>
  <div class="lens__top">
    <figure class="lens__img frame">${img(l.image, { lazy: false })}</figure>
    <div class="lens__copy">
      <p class="eyebrow">${esc(l.role)} lens ${proposalTag}</p>
      <h1 id="${id}-title" tabindex="-1">${esc(l.name)}</h1>
      <p class="lens__line">${esc(l.line)}</p>
      <details class="enquire">
        <summary class="btn btn--solid">Enquire about ${esc(l.name)}</summary>
        <div class="enquire__body">
          <p>Write or call the studio in ${esc(site.city)} and mention ${esc(l.name)}.</p>
          ${contactLines()}
        </div>
      </details>
      <p class="note">The name ${esc(l.name)} and its role are proposals for this concept.</p>
    </div>
  </div>
  <section class="lens__specs" aria-labelledby="${id}-specs">
    <h2 id="${id}-specs">Specifications</h2>
    <div>${specTable(l, `${l.name}: sample specifications`)}</div>
  </section>
  <nav class="pager" aria-label="Other lenses">
    ${pager(prev, 'prev')}
    ${pager(next, 'next')}
  </nav>
</div>
${footer('#' + id)}`, 'route--lens');
}

