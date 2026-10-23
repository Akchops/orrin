// The scroll film's markup. The hero is its first frame. live.js pins
// #aperture, #through, #exit, #focus, #models and #teardown, and reads
// #film-workshop and #film-contact; the film ends when #film-contact fills
// the screen and the same move carries straight on into the teardown.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { esc, img } from './parts.js';
import { site } from '../content/site.js';
import { film } from '../content/film.js';
import { teardown } from '../content/teardown.js';
import { media } from '../content/media.js';

// Label positions on the teardown stills, measured by the still renderer
// (kessel/scripts/stills.mjs writes <name>.json next to the image).
const anchorsOf = (name) => {
  const p = fileURLToPath(new URL(`../../stills/${name}.json`, import.meta.url));
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
};

// The teardown section: live, a pinned stage with one caption at a time and
// labels that follow the parts (src/app/live.js places them); as stills,
// a labelled exploded view with every caption. Each caption carries a short
// line (phones, live) next to the full text (desktop and the stills).
function teardownHTML() {
  const D = teardown;
  const tags = D.parts.map((p) => `<div class="td-tag" data-part="${p.id}"><span class="td-tag__dot"></span><span class="td-tag__line"></span><span class="td-tag__text">${esc(p.label)}</span></div>`).join('');
  const caps = D.parts.map((p, i) => `
      <li class="td-cap" data-part="${p.id}">
        <p class="td-cap__no">${String(i + 1).padStart(2, '0')}</p>
        <h3>${esc(p.label)}</h3>
        <p class="td-cap__short">${esc(p.short)}</p>
        <p class="td-cap__long">${esc(p.body)}</p>
      </li>`).join('');
  const marks = (name) => {
    const a = anchorsOf(name);
    return D.parts.map((p, i) => {
      const q = a['td-' + p.id];
      return q && q[2] ? `<li style="left:${(q[0] * 100).toFixed(1)}%;top:${(q[1] * 100).toFixed(1)}%"><span>${i + 1}</span><span class="sr-only"> ${esc(p.label)}</span></li>` : '';
    }).join('');
  };
  return `
  <section class="teardown" id="teardown" aria-labelledby="teardown-title">
    <div class="td-tags" aria-hidden="true">${tags}</div>
    <figure class="still td-still td-still--wide">${img('td-apart')}<ol class="td-marks">${marks('td-apart')}</ol><figcaption>Still frame · the lens taken apart, parts numbered as below</figcaption></figure>
    <figure class="still td-still td-still--tall">${img('td-apart-tall')}<ol class="td-marks">${marks('td-apart-tall')}</ol><figcaption>Still frame · the lens taken apart, parts numbered as below</figcaption></figure>
    <div class="td-copy">
      <header class="td-intro">
        <p class="cap__num">${esc(D.num)}</p>
        <h2 id="teardown-title">${esc(D.title)}</h2>
        <p class="td-cap__short">${esc(D.leadShort)}</p>
        <p class="td-cap__long">${esc(D.lead)}</p>
      </header>
      <ol class="td-caps">${caps}
      </ol>
      <div class="td-outro">
        <h3>${esc(D.outro.title)}</h3>
        <p class="td-cap__short">${esc(D.outro.short)}</p>
        <p class="td-cap__long">${esc(D.outro.body)}</p>
      </div>
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
