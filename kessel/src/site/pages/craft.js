// Craft: the five stages of building a lens. The exploded lens at full
// bleed under the headline, then a stepper: a rail of the five
// stages beside (wide screens) or above (phones) one large close-up and its
// text. Without JS the rail is an index and the five stages stand one
// under the other; src/site/craft.js turns it into tabs, with a crossfade,
// a progress line, arrow keys and swipe.
import { site, esc, img, footer, route } from '../parts.js';
import { craft } from '../../content/craft.js';

const C = craft;
const total = String(C.steps.length).padStart(2, '0');

// The rail: an index of links that the script turns into a tablist.
const rail = () => C.steps.map((s, i) => `<li><a class="cst__tab${i ? '' : ' is-on'}" id="craft-tab-${s.key}" href="#craft-${s.key}">
        <span class="cst__no">${s.no}</span>
        <span class="cst__name">${esc(s.name)}</span>
      </a></li>`).join('\n      ');

// One stage: the close-up in its frame, the stage number read out in the
// corner like the film's readout, and the text.
const panel = (s, i) => `<li class="cst__panel cst__panel--${s.key}${i ? '' : ' is-on'}" id="craft-${s.key}" aria-labelledby="craft-${s.key}-title">
      <figure class="cst__fig">
        ${img(s.image, { lazy: false })}
        <span class="cst__read" aria-hidden="true"><span>${s.no}</span> / ${total}</span>
      </figure>
      <div class="cst__text">
        <p class="cst__tag"><span>Stage ${s.no}</span> ${esc(s.tag)}</p>
        <h3 id="craft-${s.key}-title">${esc(s.title)}</h3>
        <p class="cst__body">${esc(s.body)}</p>
        <p class="note cst__note">${esc(C.sample)}</p>
      </div>
    </li>`;

export function craftHTML() {
  const next = C.next.map((n) => `<a href="#${n.route}"><span class="craft-end__k">${esc(n.label)}</span><span class="craft-end__t">${esc(n.text)} <span class="craft-end__nw">${esc(n.last)} <span class="craft-end__go" aria-hidden="true">&rarr;</span></span></span></a>`).join('\n  ');
  return route('craft', `Craft · ${site.name}`, `
<header class="craft-hero">
  <div class="craft-hero__head wrap">
    <p class="eyebrow">${esc(C.eyebrow)}</p>
    <h1 id="craft-title" tabindex="-1">${C.title.map((l) => `<span class="craft-hero__l">${esc(l)}</span>`).join(' ')}</h1>
  </div>
  <figure class="craft-hero__fig">${img('exploded-wide', { lazy: false })}</figure>
  <div class="craft-hero__foot wrap">
    <p class="craft-hero__lead">${esc(C.lead)}</p>
    <p class="note">${esc(C.sample)}</p>
    <a class="more craft-hero__cue" href="#craft-stages">${esc(C.cue)} <span aria-hidden="true">&darr;</span></a>
  </div>
</header>
<section class="cst" id="craft-stages" aria-labelledby="craft-stages-title">
  <div class="cst__rig wrap">
    <div class="cst__side">
      <h2 class="cst__title" id="craft-stages-title">${esc(C.stagesTitle)}</h2>
      <ol class="cst__rail" aria-label="The five stages">
      ${rail()}
      </ol>
      <div class="cst__prog" aria-hidden="true"><span class="cst__fill"></span></div>
      <p class="cst__hint" aria-hidden="true"><span class="cst__hint--touch">${esc(C.hint.touch)}</span><span class="cst__hint--keys">${esc(C.hint.keys)}</span></p>
    </div>
    <ol class="cst__panels">
    ${C.steps.map(panel).join('\n    ')}
    </ol>
    <div class="cst__ctrl">
      <button class="cst__step" type="button" data-dir="-1"><span aria-hidden="true">&larr;</span> <span class="cst__step-l">Previous</span></button>
      <button class="cst__step" type="button" data-dir="1"><span class="cst__step-l">Next</span> <span aria-hidden="true">&rarr;</span></button>
    </div>
  </div>
</section>
<nav class="craft-end wrap" aria-label="Next">
  ${next}
</nav>
${footer('#craft')}`);
}
