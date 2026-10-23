// Inspect the lens (markup; src/site/inspect-live.js plays it): a beat with
// one stage, a map and a caption beside it. As the page scrolls the camera
// glides from the whole lens to its five details, resting at each: live,
// the lens viewer in its inspect mode (src/app/viewer.js); otherwise the
// same views as stills, one over the next. Without JS the five stills
// stand in a row, each with its caption. Used on each lens page (that
// lens) and on Craft (Parvati, the drawing's lens).
//   inspectHTML({ id, k, lens, no })
// k: the model (0 to 2); lens: its content entry (name, band); no: the
// section number on a lens page.
import { esc, img } from './parts.js';
import { inspect as C } from '../content/inspect.js';
import { mapOf, MAP } from '../app/inspect.js';

export function inspectHTML({ id, k, lens, no = '' }) {
  const M = mapOf(k), c0 = M.cam(0);
  const all = [{ key: 'whole', ...C.whole, name: `${lens.name}, whole` }, ...C.stops];
  const shots = C.stops.map((s, i) => `
        <li class="insp__shot" data-stop="${i + 1}">
          <figure>
            ${img(`i-${k + 1}-${s.key}`)}
            <figcaption class="insp__shot-cap"><span class="insp__no">${s.no}</span> <span class="insp__name">${esc(s.name)}</span> <span class="insp__shot-t">${esc(s.text)}</span></figcaption>
          </figure>
        </li>`).join('');
  const btns = all.map((s, i) => `<li><button class="insp__btn" type="button" data-stop="${i}"${i ? '' : ' aria-current="true"'}><span class="insp__no">${s.no}</span> <span class="insp__name">${esc(i ? s.name : 'Whole')}</span></button></li>`).join('');
  const spots = M.spots.map((p, i) => `<g class="insp__spot" data-stop="${i + 1}" transform="translate(${p.x} ${p.y})"><circle r="9"/><text dy="0.35em">${i + 1}</text></g>`).join('');
  return `<section class="beat insp" id="${id}" data-beat="inspect" data-band="${lens.band}" data-model="${k}" aria-labelledby="${id}-t">
  <div class="beat__pin insp__pin wrap">
    <header class="insp__head">
      <p class="eyebrow">${no ? `<span class="lab__no">${no}</span> ` : ''}${esc(C.eyebrow)}</p>
      <h2 id="${id}-t">${esc(C.title)}</h2>
      <p class="insp__lead">${esc(C.lead)} <span class="note">${esc(C.sample)}</span></p>
    </header>
    <div class="insp__stage" id="${id}-stage" data-viewer="${k}" data-pose="inspect">
      ${img(`lens-${k + 1}`, { cls: 'insp__whole', alt: `${lens.name}, the whole lens.` })}
      <ol class="insp__shots" aria-label="Five details">${shots}
      </ol>
      <span class="insp__corners" aria-hidden="true"></span>
    </div>
    <div class="insp__side">
      <figure class="insp__map" aria-hidden="true">
        <svg viewBox="0 0 ${MAP.w} ${MAP.h}" focusable="false">
          <path class="insp__axis" d="${M.axis}"/>
          <path class="insp__body" d="${M.body}"/>
          <path class="insp__cone" d="${c0.cone}"/>
          ${spots}
          <circle class="insp__aim" cx="${c0.tx}" cy="${c0.ty}" r="3.4"/>
          <g class="insp__cam" transform="translate(${c0.x} ${c0.y}) rotate(${c0.deg})"><path d="M-9 -6.5h11v13h-11z"/><path d="M2 -3.5l7 -3.5v14l-7 -3.5z"/></g>
        </svg>
        <figcaption class="insp__map-cap">${esc(C.map)}</figcaption>
      </figure>
      <div class="insp__say" aria-live="polite">
        <p class="insp__k"><span class="insp__no">${all[0].no}</span> <span class="insp__name">${esc(all[0].name)}</span></p>
        <p class="insp__t">${esc(all[0].text)}</p>
      </div>
      <ol class="insp__list" aria-label="The whole lens and five details">${btns}</ol>
      <div class="insp__ctl ctl ctl--bare">
        <p class="ctl__say"><span class="ctl__cue">Try it</span> <span class="ctl__how">${esc(C.hint)}</span></p>
      </div>
    </div>
  </div>
</section>`;
}
