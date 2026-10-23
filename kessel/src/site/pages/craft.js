// Craft: the five stages of building a lens. The page opens on one
// drawing, the lens on the bench, that builds up stage by stage
// (src/site/craft-svg.js); five stage buttons and a slider step through
// it, with a short caption. Without JS the drawing shows the finished
// lens and the five captions stand as a list under it. Then the lens up
// close (src/site/inspect-html.js), and the way on.
import { site, esc, footer, route } from '../parts.js';
import { craft } from '../../content/craft.js';
import { craftSVG, sealedSVG } from '../craft-svg.js';
import { inspectHTML } from '../inspect-html.js';
import { lenses } from '../../content/lenses.js';

const C = craft;
const N = C.stages.length;
const total = String(N).padStart(2, '0');
const last = C.stages[N - 1];

const step = (s, i) => `<button class="ckx__step" type="button" data-n="${i + 1}" aria-pressed="false">
        <span class="ckx__no">${s.no}</span>
        <span class="ckx__name">${esc(s.name)}${s.more ? `<span class="ckx__more">${esc(s.more)}</span>` : ''}</span>
      </button>`;

const item = (s) => `<li class="ckx__li" id="craft-${s.key}">
      <p class="ckx__li-k"><span>${s.no}</span> ${esc(s.name + s.more)}</p>
      <p class="ckx__li-t">${esc(s.text)}</p>
    </li>`;

export function craftHTML() {
  const first = C.stages[0];
  const next = C.next.map((n) => `<a href="#${n.route}"><span class="craft-end__k">${esc(n.label)}</span><span class="craft-end__t">${esc(n.text)} <span class="craft-end__nw">${esc(n.last)} <span class="craft-end__go" aria-hidden="true">&rarr;</span></span></span></a>`).join('\n  ');
  return route('craft', `Craft · ${site.name}`, `
<div class="beat beat--open" data-beat="build">
<div class="ckx beat__pin" id="craft-build" data-stage="${N}">
  <header class="ckx__head">
    <p class="eyebrow">${esc(C.eyebrow)}</p>
    <h1 id="craft-title" tabindex="-1">${esc(C.title)}</h1>
    <p class="note">${esc(C.sample)}</p>
  </header>
  <div class="ckx__fig">
    ${craftSVG({ id: 'craft-svg', title: C.figTitle, desc: C.figDesc })}
    <div class="ckx__hud" aria-hidden="true">
      <span class="ckx__corners"></span>
      <p class="ckx__sealed" data-text="${esc(C.sealed.text)}" data-hint="${esc(C.sealed.hint)}">${esc(C.sealed.name)}</p>
      <p class="ckx__read"><span class="ckx__read-name">${esc(last.name)}</span> <span class="ckx__read-no">${last.no}</span><small>/ ${total}</small></p>
    </div>
    <button class="ckx__inside" type="button" aria-pressed="false" hidden>${esc(C.sealed.inside)}</button>
  </div>
  <p class="ckx__cap">${esc(C.sealed.capInside)}</p>
  <div class="ckx__ctl" hidden>
    <label class="ckx__dl" for="craft-range"><span class="turn" aria-hidden="true">Your turn &middot; Drag me</span><span class="ckx__dl-t">${esc(C.control)}</span> <span>&middot; ${esc(C.controlHint)}</span></label>
    <div class="ckx__steps" role="group" aria-label="The five stages">
      ${C.stages.map(step).join('\n      ')}
    </div>
    <input class="ckx__range" id="craft-range" type="range" min="1" max="${N}" step="1" value="1" aria-valuetext="Stage 1 of ${N}: ${esc(first.name)}">
  </div>
  <div class="ckx__say" aria-live="polite" aria-atomic="true" hidden>
    <p class="ckx__say-k">Stage <span class="ckx__say-no">${first.no}</span> / ${total} <span class="ckx__say-name">${esc(first.name + first.more)}</span></p>
    <p class="ckx__say-t">${esc(first.text)}</p>
  </div>
  <ol class="ckx__list" aria-label="The five stages">
    ${C.stages.map(item).join('\n    ')}
  </ol>
  <figure class="ckx__still2">
    <div class="ckx__still2-fig">${sealedSVG({ id: 'craft-sealed', title: C.sealed.figTitle })}</div>
    <figcaption class="ckx__cap">${esc(C.sealed.capSealed)}</figcaption>
  </figure>
</div>
</div>
${inspectHTML({ id: 'craft-insp', k: 1, lens: lenses[1] })}
<nav class="craft-end wrap" aria-label="Next">
  ${next}
</nav>
${footer('#craft')}`);
}
