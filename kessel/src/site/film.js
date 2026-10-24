// The scroll film's markup. The hero is its first frame. live.js pins
// #aperture, #through, #exit, #focus and #models, and reads #film-workshop
// and #film-contact; the film ends when #film-contact fills the screen and
// the same move carries straight on into the teardown (#teardown, stepped
// by scroll on its own: src/site/td-steps.js).
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { esc, img } from './parts.js';
import { site } from '../content/site.js';
import { film } from '../content/film.js';
import { teardown } from '../content/teardown.js';
import { media } from '../content/media.js';
import { TD_STOPS, TD_MAP, tdMap, camShape } from '../app/td-stops.js';

// Label positions on the teardown stills, measured by the still renderer
// (kessel/scripts/stills.mjs writes <name>.json next to the image).
const anchorsOf = (name) => {
  const p = fileURLToPath(new URL(`../../stills/${name}.json`, import.meta.url));
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
};

// The teardown section. With JavaScript: one tall section, a screen of
// scroll per stop, with a sticky stage of one screen; each stop has an
// invisible anchor a screen tall that the page snaps to, and carries its
// caption (src/site/td-steps.js shows it beside the stage). The stage box
// holds the live lens (src/app/live.js) or, in the stills tier, the still
// of each stop. Without JavaScript: the exploded view and the eight parts
// as captioned stills, then the lens back together.
function teardownHTML() {
  const D = teardown, N = TD_STOPS.length;
  const M = tdMap(), c0 = camShape(M.cam(0));
  const no = (i) => String(i).padStart(2, '0');
  const stops = [
    { name: D.apart.title, text: D.apart.body, short: D.apart.short },
    ...D.parts.map((p, i) => ({ no: no(i + 1), name: p.label, text: p.body, short: p.short })),
    { name: D.outro.title, text: D.outro.body, short: D.outro.short },
  ];
  const marks = (name) => {
    const a = anchorsOf(name);
    return D.parts.map((p, i) => {
      const q = a['td-' + p.id];
      return q && q[2] ? `<li style="left:${(q[0] * 100).toFixed(1)}%;top:${(q[1] * 100).toFixed(1)}%"><span>${i + 1}</span><span class="sr-only"> ${esc(p.label)}</span></li>` : '';
    }).join('');
  };
  const cap = (s) => `<figcaption class="td-shot__cap">${s.no ? `<span class="td-shot__no">${s.no}</span> ` : ''}<span class="td-shot__name">${esc(s.name)}</span> <span class="td-shot__t">${esc(s.text)}</span></figcaption>`;
  const shots = [
    `
        <li class="td-shot td-shot--apart is-on"><figure>${img('td-apart', { cls: 'td-img--wide' })}${img('td-apart-tall', { cls: 'td-img--tall' })}<ol class="td-marks td-marks--wide">${marks('td-apart')}</ol><ol class="td-marks td-marks--tall">${marks('td-apart-tall')}</ol><figcaption class="td-shot__cap"><span class="td-shot__name">Still frame</span> <span class="td-shot__t">The lens taken apart, parts numbered front to back.</span></figcaption></figure></li>`,
    ...D.parts.map((p, i) => `
        <li class="td-shot"><figure>${img('tdc-' + p.id)}${cap(stops[i + 1])}</figure></li>`),
    `
        <li class="td-shot td-shot--whole"><figure>${img('tdc-whole')}${cap(stops[N - 1])}</figure></li>`,
  ].join('');
  const tags = D.parts.map((p, i) => `<span class="td-tag" data-part="${p.id}" data-stop="${i + 1}">${i + 1}</span>`).join('');
  const spots = M.spots.map((s, i) => `<g class="td-spot" data-stop="${i + 1}"><circle cx="${s.x}" cy="${s.y}" r="7.5"/><text x="${s.x}" y="${s.y + 3.2}">${i + 1}</text></g>`).join('');
  const btns = D.parts.map((p, i) => `
          <li><button type="button" class="td-btn" data-stop="${i + 1}"><span class="td-btn__no">${no(i + 1)}</span> <span class="td-btn__name">${esc(p.label)}</span></button></li>`).join('');
  const steps = stops.map((s, i) => `
      <span class="td-step" style="--i:${i}" data-stop="${i}"${s.no ? ` data-no="${s.no}"` : ''} data-name="${esc(s.name)}" data-text="${esc(s.text)}" data-short="${esc(s.short)}"></span>`).join('');
  const s0 = stops[0];
  return `
  <section class="teardown" id="teardown" aria-labelledby="teardown-title" data-stop="-1" style="--stops:${N}">
    <div class="td-pin">
      <div class="td-frame">
      <div class="td-view">
        <ol class="td-shots" aria-label="The lens taken apart, part by part">${shots}
        </ol>
        <span class="td-corners" aria-hidden="true"></span>
      </div>
      <div class="td-side">
        <header class="td-head">
          <p class="cap__num">${esc(D.num)}</p>
          <h2 id="teardown-title">${esc(D.title)}</h2>
          <p class="td-lead">${esc(D.stillLead)}</p>
        </header>
        <div class="td-say" aria-live="polite">
          <p class="td-k"><span class="td-no"></span> <span class="td-name">${esc(s0.name)}</span></p>
          <p class="td-t"><span class="td-t__long">${esc(s0.text)}</span><span class="td-t__short">${esc(s0.short)}</span></p>
          <p class="td-cue" data-live="${esc(D.cue)}" data-still="${esc(D.cueStill)}">${esc(D.cueStill)}</p>
        </div>
        <figure class="td-map" aria-hidden="true">
          <svg viewBox="0 0 ${TD_MAP.w} ${TD_MAP.h}" focusable="false">
            <path class="td-map__axis" d="${M.axis}"/>
            <path class="td-map__body" d="${M.body}"/>
            <path class="td-map__cone" d="${c0.cone}"/>
            ${spots}
            <circle class="td-map__aim" cx="${c0.aim[0]}" cy="${c0.aim[1]}" r="3"/>
            <g class="td-map__cam" transform="${c0.transform}"><path d="M-9 -6.5h11v13h-11z"/><path d="M2 -3.5l7 -3.5v14l-7 -3.5z"/></g>
          </svg>
          <figcaption class="td-map__cap">${esc(D.map)}</figcaption>
        </figure>
        <ol class="td-list" aria-label="${esc(D.list)}">${btns}
        </ol>
      </div>
      </div>
      <div class="td-tags" aria-hidden="true">${tags}</div>
    </div>
    <div class="td-steps" aria-hidden="true">${steps}
    </div>
  </section>`;
}

export function filmHTML() {
  const h = film.hero, M = film.models, W = film.workshop, C = film.contact;
  const stages = film.stages.map((s) => `
  <section class="stagecopy" id="${s.id}" aria-labelledby="${s.id}-cap">
    <figure class="still">${img(s.still)}<figcaption>${esc(s.caption)}</figcaption></figure>
    <div class="cap">
      <p class="cap__num">${esc(s.num)}</p>
      <h2 id="${s.id}-cap">${esc(s.title)}</h2>
      <p class="cap__short">${esc(s.short)}</p>
      <p class="cap__long">${esc(s.body)}</p>
    </div>
  </section>`).join('');
  const models = M.list.map((m, i) => `
      <li class="model" data-model="${i}">
        <figure class="still">${img(m.still, { alt: m.alt })}<figcaption>Still frame</figcaption></figure>
        <h3>${esc(m.name)} <span>proposal</span></h3>
        <p class="cap__short">${esc(m.short)}</p>
        <p class="cap__long">${esc(m.body)}</p>
      </li>`).join('');
  return `<div class="film" id="film">
  <section class="hero" id="home-hero" aria-labelledby="home-title">
    <!-- The lens's own box (the shared lens stage): live, the film fits the
         lens's bounding sphere inside it (src/app/fit.js); otherwise the
         still of the same frame fills it. Nothing else sits on it. -->
    <figure class="hero__stage lstage" data-lstage>
      <img src="%%STILL:hero-stage%%" width="${media['hero-stage'].w}" height="${media['hero-stage'].h}" alt="${esc(h.alt)}">
    </figure>
    <div class="hero__copy">
      <p class="hero__brand">${esc(h.brand)}</p>
      <h1 class="hero__title" id="home-title" tabindex="-1">${esc(h.title)}</h1>
      <p class="hero__actions">
        <a class="btn btn--solid" href="${h.primary.href}">${esc(h.primary.label)}</a>
        <a class="btn" href="${h.secondary.href}">${esc(h.secondary.label)}</a>
      </p>
      <a class="hero__cue" href="#aperture"><span aria-hidden="true" class="hero__cue-line"></span>${esc(h.cue)}</a>
    </div>
  </section>${stages}

  <section class="models" id="models" aria-labelledby="models-title">
    <!-- The lens's own box in this chapter: the film fits each shape inside
         it, clear of the heading and the list (src/app/fit.js). -->
    <div class="models__stage" aria-hidden="true"></div>
    <header class="models__head">
      <p class="cap__num">${esc(M.num)}</p>
      <h2 id="models-title">${esc(M.title)}</h2>
      <p class="models__note">${esc(M.note)}</p>
    </header>
    <ol class="model-list">${models}
    </ol>
  </section>

  <section class="workshop" id="film-workshop" aria-labelledby="film-ws-title">
    <figure class="still">${img(W.still)}<figcaption>${esc(W.caption)}</figcaption></figure>
    <div class="cap">
      <p class="cap__num">${esc(W.num)}</p>
      <h2 id="film-ws-title">${esc(W.title)}</h2>
      ${W.body.map((p) => `<p>${esc(p)}</p>`).join('\n      ')}
      <dl class="facts">
        ${W.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('\n        ')}
      </dl>
    </div>
  </section>

  <section class="contact" id="film-contact" aria-labelledby="film-ct-title">
    <div class="cap">
      <p class="cap__num">${esc(C.num)}</p>
      <h2 id="film-ct-title">${esc(C.title)}</h2>
      <dl class="contact__list">
        <div><dt>Email</dt><dd><span class="selectable">${esc(site.email)}</span> <button class="copy" type="button" data-copy="${esc(site.email)}" hidden>Copy</button></dd></div>
        <div><dt>Phone</dt><dd><span class="selectable">${esc(site.phone)}</span></dd></div>
        <div><dt>Studio</dt><dd>${esc(site.city)}</dd></div>
      </dl>
    </div>
  </section>
${teardownHTML()}
</div>`;
}
