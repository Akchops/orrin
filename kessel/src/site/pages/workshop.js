// Workshop: the maker in Pune. Set like frames of the film: the signature
// on the rear barrel at full bleed with the headline across it (the page's
// moment), the facts read out in giant thin numerals, then three short
// sections, each with its own layout: the distance scale bleeding off the
// right edge, the back of the lens bleeding off the left, and the engraved
// maker's mark centred with the closing line under it (the hero shows only
// the signature, so the engraving appears once). Links to Contact and Craft
// end it.
import { site, esc, paras, img, footer, route } from '../parts.js';
import { workshop } from '../../content/workshop.js';

const tag = (s) => `<p class="ws-tag"><span>${esc(s.no)}</span> ${esc(s.tag)}</p>`;
const h2 = (s, i) => `<h2 id="workshop-s${i + 1}">${esc(s.title)}</h2>`;
const line = (s) => `<p class="ws-line">${esc(s.line)}</p>`;
const body = (s) => `<div class="ws-body">${paras(s.body)}</div>`;

// 01 · The range: the engraved distance scale as a band off the right edge.
const range = (s, i) => `<section class="ws-sec ws-sec--range" aria-labelledby="workshop-s${i + 1}">
  <figure class="ws-sec__fig">${img('d-scale')}</figure>
  <div class="ws-sec__in wrap">
    <div class="ws-sec__head">
      ${tag(s)}
      ${h2(s, i)}
    </div>
    ${line(s)}
    ${body(s)}
  </div>
</section>`;

// 02 · The same pair of hands: the back of the lens off the left edge, the
// line set across it.
const hands = (s, i) => `<section class="ws-sec ws-sec--hands" aria-labelledby="workshop-s${i + 1}">
  <figure class="ws-sec__fig">${img('d-mount')}</figure>
  <div class="ws-sec__in wrap">
    <div class="ws-sec__head">
      ${tag(s)}
      ${h2(s, i)}
    </div>
    ${line(s)}
    ${body(s)}
  </div>
</section>`;

// 03 · Signed on the barrel: the engraving alone, centred, the type centred
// under it and the closing line set large.
const signed = (s, i) => `<section class="ws-sec ws-sec--signed" aria-labelledby="workshop-s${i + 1}">
  <figure class="ws-sec__fig">${img('d-sign')}</figure>
  <div class="ws-sec__in wrap">
    <div class="ws-sec__head">
      ${tag(s)}
      ${h2(s, i)}
    </div>
    ${body(s)}
    ${line(s)}
  </div>
</section>`;

export function workshopHTML() {
  const W = workshop;
  const facts = W.facts.map((f) => `<div class="ws-read__item">
      <dt>${esc(f.label)}</dt>
      <dd><span class="ws-read__value">${esc(f.value)}</span> <span class="ws-read__note">${esc(f.note)}</span></dd>
    </div>`).join('\n    ');
  const [s1, s2, s3] = W.sections;
  const next = W.next.map((n) => `<li><a class="ws-next__link" href="#${n.route}">
      <span class="ws-next__label">${esc(n.label)}</span>
      <span class="ws-next__text">${esc(n.text)}</span>
      <span class="ws-next__arrow" aria-hidden="true">&rarr;</span>
    </a></li>`).join('\n    ');
  return route('workshop', `Workshop · ${site.name}`, `
<header class="ws-hero">
  <figure class="ws-hero__fig">${img('d-sign', { lazy: false })}</figure>
  <div class="ws-hero__copy wrap">
    <p class="eyebrow">${esc(W.eyebrow)}</p>
    <h1 id="workshop-title" tabindex="-1">${W.title.map((l) => `<span class="ws-hero__l">${esc(l)}</span>`).join(' ')}</h1>
    <p class="ws-hero__lead">${esc(W.lead)}</p>
  </div>
</header>
<div class="ws-read">
  <dl class="ws-read__list wrap">
    ${facts}
  </dl>
</div>
<div class="ws-secs">
${range(s1, 0)}
${hands(s2, 1)}
${signed(s3, 2)}
</div>
<nav class="ws-next" aria-label="Where next">
  <ul class="ws-next__list wrap">
    ${next}
  </ul>
</nav>
${footer('#workshop')}`);
}
