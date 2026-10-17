// The scroll film's markup. live.js pins #aperture, #through, #exit,
// #focus and #models, and reads #film-workshop and #film-contact; the
// film ends when #film-contact fills the screen. Do not restyle or
// reorder: this is the film exactly as the single-page demo had it.
import { esc, img } from './parts.js';
import { site } from '../content/site.js';
import { film } from '../content/film.js';

export function filmHTML() {
  const h = film.hero, M = film.models, W = film.workshop, C = film.contact;
  const stages = film.stages.map((s) => `
  <section class="stagecopy" id="${s.id}" aria-labelledby="${s.id}-cap">
    <figure class="still">${img(s.still)}<figcaption>${esc(s.caption)}</figcaption></figure>
    <div class="cap">
      <p class="cap__num">${esc(s.num)}</p>
      <h2 id="${s.id}-cap">${esc(s.title)}</h2>
      <p>${esc(s.body)}</p>
    </div>
  </section>`).join('');
  const models = M.list.map((m, i) => `
      <li class="model" data-model="${i}">
        <figure class="still">${img(m.still, { alt: m.alt })}<figcaption>Still frame</figcaption></figure>
        <h3>${esc(m.name)} <span>proposal</span></h3>
        <p>${esc(m.body)}</p>
      </li>`).join('');
  return `<div class="film" id="film">
  <section class="hero" id="top" aria-labelledby="home-title">
    <figure class="still still--hero">${img('hero', { lazy: false })}<figcaption>${esc(h.caption)}</figcaption></figure>
    <div class="hero__copy">
      <h1 id="home-title" tabindex="-1"><span class="hero__name">${esc(h.name)}</span> <span class="hero__line">${esc(h.line)}</span></h1>
      <p class="hero__sub">${esc(h.sub)}</p>
      <a class="hero__cue" href="#aperture">${esc(h.cue)}</a>
    </div>
  </section>${stages}

  <section class="models" id="models" aria-labelledby="models-title">
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
</div>
<a class="skipfilm" href="#home-hero" data-jump>${esc(film.skip)} <span aria-hidden="true">&darr;</span></a>`;
}
