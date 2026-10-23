// Company: who Kessel is, drawn more than told. The page opens on the
// workshop bench at dusk (src/site/bench-svg.js), four tools on it to tap;
// then a timeline scrubbed along a scale engraved like a lens's distance
// scale, the facts set large, the six checks lighting a drawn lens, the
// questions, and contact. Everything reads without JS (markers keyed to a
// numbered list, every year listed, real checkboxes, native <details>);
// src/site/company.js only adds the interactions. Each section with
// invented content carries the sample tag.
import { site, esc, footer, route } from '../parts.js';
import { company } from '../../content/company.js';
import { benchSVG, checksSVG, iconSVG, SPOTS, BENCH } from '../bench-svg.js';

const C = company;
const sample = `<p class="co-sample">${esc(C.sample)}</p>`;
const pct = (v, of) => +(v / of * 100).toFixed(2);
const pad = (i) => String(i).padStart(2, '0');

// Section head: number and kicker, the heading, the sample tag.
const head = (s, extra = '') => `<div class="co-head">
    <p class="co-kicker"><span>${esc(s.no)}</span> ${esc(s.kicker)}</p>
    <h2 id="${s.id}-title">${esc(s.title)}</h2>
    ${sample}${extra}
  </div>`;

// ------------------------------------------------------------- bench
// #workshop, the old Workshop page, lands here (its id resolves to this
// route, and the router focuses the h1 inside it). The copy comes first in
// the markup, so the heading leads for screen readers; the drawing comes
// first on screen.
function bench() {
  const H = C.hero;
  const spots = SPOTS.map((s, i) => `<a class="bn__spot" href="#company-note-${i + 1}" data-i="${i}" data-side="${s.side}" style="left:${pct(s.x, BENCH.w)}%;top:${pct(s.y, BENCH.h)}%"><span class="bn__num" aria-hidden="true">${i + 1}</span><span class="bn__lbl"><span class="sr-only">${i + 1}. </span>${esc(H.notes[i].title)}</span></a>`).join('');
  const notes = H.notes.map((nt, i) => `<li class="bn__note" id="company-note-${i + 1}" data-i="${i}" tabindex="-1" aria-labelledby="company-note-${i + 1}-t">
      <span class="bn__note-no" aria-hidden="true">${i + 1}</span>
      <div class="bn__note-body">
        <h2 class="bn__note-t" id="company-note-${i + 1}-t">${esc(nt.title)}</h2>
        <p class="bn__note-role">${esc(nt.role)}</p>
        <p class="bn__note-p">${esc(nt.body)}</p>
      </div>
    </li>`).join('\n    ');
  return `<div class="beat beat--open" data-beat="bench">
<header class="bn beat__pin" id="workshop" data-bench>
  <div class="bn__copy">
    <div class="bn__meta"><p class="eyebrow">${esc(H.eyebrow)}</p>${sample}</div>
    <h1 id="company-title" tabindex="-1">${H.title.map((l) => `<span class="bn__l">${esc(l)}</span>`).join(' ')}</h1>
    <p class="bn__lead">${esc(H.lead)}</p>
    <p class="bn__hint"><span class="turn" aria-hidden="true">Your turn &middot; Try it</span><span class="bn__hint-js">${esc(H.hintJs)}</span><span class="bn__hint-nojs">${esc(H.hintNoJs)}</span></p>
  </div>
  <div class="bn__stage" data-crop="scene">
    <div class="bn__world">
      ${benchSVG('company-bench', H.alt)}
      <div class="bn__spots" role="group" aria-label="On the bench">${spots}</div>
    </div>
  </div>
  <ol class="bn__notes" aria-label="Notes on the bench">
    ${notes}
  </ol>
</header>
</div>`;
}

// ---------------------------------------------------------- timeline
// The scale runs from the first year to the last, ticked like a distance
// scale, with a drawing standing at each entry. Without JS: the scale as a
// picture and every entry listed. With JS: a range input over the scale
// scrubs it (pointer, touch, arrow keys), snapping to the entries, and
// only the current entry shows beside it.
function timeline() {
  const T = C.timeline, E = T.entries;
  const y0 = E[0].year, y1 = E[E.length - 1].year;
  const at = (y) => +((y - y0) / (y1 - y0)).toFixed(4);
  const years = [];
  for (let y = y0; y <= y1; y++) {
    const e = E.find((x) => x.year === y);
    years.push(`<span class="tl__y${e ? ' is-entry' : ''}" style="--p:${at(y)}"${e ? ` data-i="${E.indexOf(e)}"` : ''}>${y}</span>`);
  }
  // Ticks every quarter year, longer at each year, like a distance scale.
  const ticks = [];
  for (let q = 0; q <= (y1 - y0) * 4; q++) ticks.push(`<i${q % 4 ? '' : ' class="is-year"'} style="--p:${+(q / ((y1 - y0) * 4)).toFixed(4)}"></i>`);
  const icons = E.map((e, i) => `<li class="tl__ico" style="--p:${at(e.year)}" data-i="${i}">${iconSVG(e.icon)}</li>`).join('');
  const feet = E.map((e, i) => `<span style="--p:${at(e.year)}" data-i="${i}">${esc(e.short)}</span>`).join('');
  const items = E.map((e, i) => `<li class="tl__entry" data-i="${i}" data-at="${at(e.year)}">
        <p class="tl__year">${e.year}</p>
        <div class="tl__txt">
          <h3 class="tl__title">${esc(e.title)}</h3>
          <p class="tl__line">${esc(e.line)}</p>
          <p class="tl__tag">${i === 0 ? 'Founding year' : 'Sample date'}</p>
        </div>
      </li>`).join('\n      ');
  return `<div class="beat co-beat" data-beat="timeline">
<section class="co-sec tl wrap beat__pin" id="${T.id}" aria-labelledby="${T.id}-title" data-tl>
  ${head(T, `\n    <p class="co-note">${esc(T.note)}</p>`)}
  <div class="tl__body">
    <div class="tl__scale" style="--at:0">
      <ol class="tl__icons" aria-hidden="true">${icons}</ol>
      <div class="tl__band" aria-hidden="true">
        <span class="tl__ticks">${ticks.join('')}</span>
        ${years.join('')}
      </div>
      <div class="tl__feet" aria-hidden="true">${feet}</div>
      <span class="tl__index" aria-hidden="true"></span>
      <label class="sr-only" for="${T.id}-in">Year on the timeline</label>
      <input class="tl__in" id="${T.id}-in" type="range" min="0" max="1000" step="1" value="0" hidden>
    </div>
    <div class="tl__read">
      <p class="tl__help" hidden><span class="turn" aria-hidden="true">Your turn &middot; Drag me</span>${esc(T.help)}</p>
      <ol class="tl__list">
      ${items}
      </ol>
    </div>
    <p class="sr-only tl__live" aria-live="polite"></p>
  </div>
</section>
</div>`;
}

// ------------------------------------------------------------- facts
function facts() {
  const items = C.facts.map((f, i) => `${i ? '<span class="cf__dot" aria-hidden="true"></span>' : ''}<div class="cf__item"><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('');
  return `<section class="cf" aria-label="Kessel in three facts">
  <dl class="cf__row wrap">${items}</dl>
</section>`;
}

// ------------------------------------------------------------ checks
// Real checkboxes, so ticking works without JS too: CSS lights each check's
// mark on the drawn lens, fills the gauge, counts the passes and draws the
// signature once all of them are ticked. JS adds the button that runs them.
function checks() {
  const K = C.checks;
  const tiles = K.list.map((c, i) => `<li class="ck-tile" data-n="${i + 1}">
        <label>
          <input class="ck-tile__box" type="checkbox" name="company-check" value="${esc(c.name)}">
          <span class="ck-tile__no" aria-hidden="true">${pad(i + 1)}</span>
          <svg class="ck-tile__tick" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path pathLength="1" d="M5 12.5l4.5 4.5L19 7.5"/></svg>
          <span class="ck-tile__name">${esc(c.name)}</span>
          <span class="ck-tile__line">${esc(c.line)}</span>
        </label>
      </li>`).join('\n      ');
  const gauge = K.list.map(() => '<li></li>').join('');
  return `<div class="beat co-beat" data-beat="checks">
<section class="co-sec ck wrap beat__pin" id="${K.id}" aria-labelledby="${K.id}-title">
  ${head(K)}
  <div class="ck__panel" data-co-checks>
    <figure class="ck__fig">
      ${checksSVG('company-ck')}
      <figcaption class="ck__state"><span class="ck__wait">${esc(K.waiting)}</span><span class="ck__done">${esc(K.signed)}</span></figcaption>
    </figure>
    <div class="ck__side">
      <div class="ck__top">
        <p class="ck__help"><span class="turn" aria-hidden="true">Your turn &middot; Try it</span><span class="ck__help-t">${esc(K.help)}</span></p>
        <button class="ck__run btn" type="button" data-run="${esc(K.run)}" data-busy="${esc(K.busy)}" data-again="${esc(K.again)}" hidden>${esc(K.run)}</button>
      </div>
      <ol class="ck__list" aria-labelledby="${K.id}-title">
      ${tiles}
      </ol>
      <p class="ck__say" aria-hidden="true"><span class="ck__say-no"></span> <span class="ck__say-name"></span> <span class="ck__say-t"></span></p>
      <div class="ck__foot">
        <ol class="ck__gauge" aria-hidden="true">${gauge}</ol>
        <p class="ck__count" aria-live="polite"><span class="ck__n"></span> of ${K.list.length} checks passed</p>
      </div>
    </div>
  </div>
</section>
</div>`;
}

// --------------------------------------------------------------- faq
function faq() {
  const F = C.faq;
  const items = F.items.map((it, i) => `<details class="co-q">
      <summary><span class="co-q__no" aria-hidden="true">${pad(i + 1)}</span><span class="co-q__q">${esc(it.q)}</span><span class="co-q__icon" aria-hidden="true"></span></summary>
      <div class="co-q__a">
        <p>${esc(it.a)}</p>
        ${it.link ? `<a class="more" href="#${it.link.route}">${esc(it.link.label)} <span aria-hidden="true">&rarr;</span></a>` : ''}
      </div>
    </details>`).join('\n    ');
  return `<section class="co-sec co-faq wrap" id="${F.id}" aria-labelledby="${F.id}-title">
  ${head(F)}
  <div class="co-faq__list">
    ${items}
  </div>
</section>`;
}

// -------------------------------------------------------------- next
function next() {
  const N = C.next;
  const more = N.more.map((m) => `<a class="co-next__more" href="#${m.route}"><span class="co-next__k">${esc(m.label)}</span> <span class="co-next__m">${esc(m.text)} <span aria-hidden="true">&rarr;</span></span></a>`).join('\n    ');
  return `<nav class="co-next wrap" aria-label="Where next">
  <a class="co-next__main" href="#${N.contact.route}">
    <span class="co-next__k">${esc(N.contact.label)}</span>
    <span class="co-next__t">${esc(N.contact.text)} <span class="co-next__go" aria-hidden="true">&rarr;</span></span>
  </a>
  <div class="co-next__row">
    ${more}
  </div>
</nav>`;
}

export function companyHTML() {
  return route('company', `Company · ${site.name}`, `
${bench()}
${timeline()}
${facts()}
${checks()}
${faq()}
${next()}
${footer('#company')}`);
}
