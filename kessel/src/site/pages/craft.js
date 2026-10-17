// Craft: how a lens is made. Five steps, each set like a frame of the film
// and each with its own layout: the glass in a circle bleeding off the left
// edge, the iris full bleed, the focus ring as a band, the exploded lens with
// its parts labelled (the page's moment) and the signature to close.
import { site, esc, paras, img, footer, route } from '../parts.js';
import { craft } from '../../content/craft.js';

const num = (s) => `<p class="cstep__no" aria-hidden="true">${s.no}</p>`;
const tag = (s) => `<p class="cstep__tag"><span>${s.no}</span> ${esc(s.tag)}</p>`;
const title = (s, cls = '') => `<h2${cls ? ` class="${cls}"` : ''}><span class="sr-only">Step ${Number(s.no)}: </span>${
  s.lines ? s.lines.map((l) => `<span class="cstep__line">${esc(l)}</span>`).join(' ') : esc(s.title)}</h2>`;
const text = (s, cls = '') => `<div class="cstep__text${cls ? ' ' + cls : ''}">${paras(s.body)}</div>`;

// 01 · The glass: a large circular crop rising behind the page title.
const glass = (s) => `<li class="cstep cstep--glass" id="craft-${s.no}">
    <figure class="cstep__fig">${img(s.image, { lazy: false })}</figure>
    <div class="cstep__in wrap">
      <div class="cstep__body">
        ${num(s)}
        ${tag(s)}
        ${title(s)}
        ${text(s)}
      </div>
    </div>
  </li>`;

// 02 · The iris: full bleed, numeral and title over the blades.
const iris = (s) => `<li class="cstep cstep--iris" id="craft-${s.no}">
    <div class="cstep__frame">
      <figure class="cstep__fig">${img(s.image)}</figure>
      ${num(s)}
      <div class="cstep__head wrap">
        ${tag(s)}
        ${title(s)}
      </div>
    </div>
    ${text(s, 'wrap')}
  </li>`;

// 03 · Barrel and focus ring: a full-width band, the copy set on it.
const knurl = (s) => `<li class="cstep cstep--knurl" id="craft-${s.no}">
    <div class="cstep__head wrap">
      ${num(s)}
      <div class="cstep__name">
        ${tag(s)}
        ${title(s)}
      </div>
    </div>
    <figure class="cstep__fig">${img(s.image)}</figure>
    ${text(s, 'wrap')}
  </li>`;

// 04 · Bringing it together: the exploded lens at full bleed, the headline
// across it and the five parts labelled where they sit.
const parts = (s) => {
  const labels = s.parts.map((p, i) => `<li style="--x:${p.x}"><span class="cparts__lab"><span class="cparts__no">0${i + 1}</span> <span class="cparts__name">${esc(p.name)}</span></span></li>`).join('');
  return `<li class="cstep cstep--parts" id="craft-${s.no}">
    <div class="cstep__stage">
      ${num(s)}
      <figure class="cstep__fig">
        ${img(s.image)}
        <figcaption><span class="sr-only">The five sections, left to right:</span><ol class="cparts">${labels}</ol></figcaption>
      </figure>
      <div class="cstep__head wrap">
        ${tag(s)}
        ${title(s, 'cstep__title')}
      </div>
    </div>
    ${text(s, 'wrap')}
  </li>`;
};

// 05 · Signed on the barrel: the signature, large, as the closing image.
const sign = (s) => `<li class="cstep cstep--sign" id="craft-${s.no}">
    <figure class="cstep__fig">${img(s.image)}</figure>
    <div class="cstep__in wrap">
      <div class="cstep__body">
        ${num(s)}
        ${tag(s)}
        ${title(s)}
        ${text(s)}
      </div>
    </div>
  </li>`;

const LAYOUTS = [glass, iris, knurl, parts, sign];

export function craftHTML() {
  const steps = craft.steps.map((s, i) => LAYOUTS[i](s)).join('\n  ');
  const index = craft.steps.map((s) => `<li><a href="#craft-${s.no}"><span class="craft-index__no">${s.no}</span><span class="craft-index__name">${esc(s.short)}</span></a></li>`).join('');
  return route('craft', `Craft · ${site.name}`, `
<header class="craft-head wrap">
  <p class="eyebrow">Craft · Five stages</p>
  <h1 id="craft-title" tabindex="-1">${esc(craft.title)}</h1>
  <div class="craft-head__side">
    <p class="lead">${esc(craft.lead)}</p>
    <nav class="craft-index" aria-label="The five stages"><ol>${index}</ol></nav>
  </div>
</header>
<ol class="csteps">
  ${steps}
</ol>
<nav class="craft-end wrap" aria-label="Next">
  <a href="#lenses"><span class="craft-end__k">Next</span><span class="craft-end__t">See the three <span class="craft-end__nw">lenses <span class="craft-end__go" aria-hidden="true">&rarr;</span></span></span></a>
  <a href="#workshop"><span class="craft-end__k">Then</span><span class="craft-end__t">About the <span class="craft-end__nw">workshop <span class="craft-end__go" aria-hidden="true">&rarr;</span></span></span></a>
</nav>
${footer('#craft')}`);
}
