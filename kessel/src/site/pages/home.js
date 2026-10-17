// Home: the scroll film, then the site takes over.
import { site, esc, paras, href, lensRoute, img, contactLines, proposalTag, footer, route, pageHead } from '../parts.js';
import { home } from '../../content/home.js';
import { film } from '../../content/film.js';
import { craft } from '../../content/craft.js';
import { lenses } from '../../content/lenses.js';
import { filmHTML } from '../film.js';



export function homeHTML() {
  const H = home;
  // The craft band reads like the engraved distance scale: five marks.
  const steps = craft.steps.map((s) => `<li><span class="hband__no">${s.no}</span><span class="hband__t">${esc(s.title)}</span></li>`).join('');
  const range = lenses.map((l, i) => `<li><a class="hrange__link" href="#${lensRoute(l)}" data-band="${l.band}">
      <span class="hrange__idx" aria-hidden="true">0${i + 1}</span>
      <span class="hrange__name">${esc(l.name)}</span>
      <span class="hrange__meta"><span class="hrange__role">${esc(l.role)}</span> ${proposalTag}<span class="hrange__go" aria-hidden="true">&rarr;</span></span>
    </a></li>`).join('');
  return route('home', `${site.name} · ${film.hero.line.replace(/\.$/, '')}`, `
<noscript><p class="notice notice--static">JavaScript is off. The live lens needs it, so each stage below is a still frame with its caption.</p></noscript>
<p class="notice" id="notice" hidden></p>
${filmHTML()}
<div class="after" id="after">
  <section class="hhero" id="home-hero" aria-labelledby="home-hero-title">
    <figure class="hhero__lens">${img(H.hero.image, { lazy: false })}</figure>
    <div class="hhero__copy">
      <p class="eyebrow">${esc(H.hero.eyebrow)}</p>
      <h2 class="hhero__title" id="home-hero-title" tabindex="-1">${H.hero.title.map((t) => `<span>${esc(t)}</span>`).join(' ')}</h2>
      <div class="hhero__foot">
        <p class="hhero__lead">${esc(H.hero.lead)}</p>
        <p class="actions">
          <a class="btn btn--solid" href="${href(H.hero.primary.route)}">${esc(H.hero.primary.label)} <span aria-hidden="true">&rarr;</span></a>
          <a class="btn" href="${href(H.hero.secondary.route)}">${esc(H.hero.secondary.label)}</a>
        </p>
      </div>
      <a class="replay hhero__replay" href="#top"><span aria-hidden="true">&uarr;</span> Replay the film</a>
    </div>
  </section>

  <section class="hband" aria-labelledby="home-band-title">
    <figure class="hband__img">${img(H.craft.image)}</figure>
    <header class="hband__head">
      <p class="eyebrow">${esc(H.craft.eyebrow)}</p>
      <h2 id="home-band-title">${esc(H.craft.title)}</h2>
      <a class="more" href="#craft">${esc(H.craft.link)} <span aria-hidden="true">&rarr;</span></a>
    </header>
    <ol class="hband__scale">${steps}</ol>
  </section>

  <nav class="hrange" aria-labelledby="home-range-title">
    <div class="hrange__head">
      <p class="eyebrow" id="home-range-title">${esc(H.range.eyebrow)}</p>
      <a class="more" href="#lenses">${esc(H.range.link)} <span aria-hidden="true">&rarr;</span></a>
    </div>
    <ul class="hrange__list">${range}</ul>
  </nav>
  ${footer('#top')}
</div>`, 'route--home');
}
