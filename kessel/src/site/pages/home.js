// Home: the scroll film, then the site takes over.
import { site, esc, paras, href, lensRoute, img, contactLines, proposalTag, footer, route, pageHead } from '../parts.js';
import { home } from '../../content/home.js';
import { film } from '../../content/film.js';
import { craft } from '../../content/craft.js';
import { lenses } from '../../content/lenses.js';
import { filmHTML } from '../film.js';



export function homeHTML() {
  const H = home;
  const steps = craft.steps.map((s) => `<li><span class="band__no">${s.no}</span><span class="band__t">${esc(s.title)}</span></li>`).join('');
  const range = lenses.map((l) => `<li><a href="#${lensRoute(l)}" data-band="${l.band}"><span class="range__name">${esc(l.name)}</span> <span class="range__role">${esc(l.role)}</span> ${proposalTag}</a></li>`).join('');
  return route('home', `${site.name} · ${film.hero.line.replace(/\.$/, '')}`, `
<noscript><p class="notice notice--static">JavaScript is off. The live lens needs it, so each stage below is a still frame with its caption.</p></noscript>
<p class="notice" id="notice" hidden></p>
${filmHTML()}
<div class="after" id="after">
  <section class="hhero" id="home-hero" aria-labelledby="home-hero-title">
    <div class="hhero__copy">
      <p class="eyebrow">${esc(H.hero.eyebrow)}</p>
      <h2 class="display" id="home-hero-title" tabindex="-1">${esc(H.hero.title)}</h2>
      <p class="lead">${esc(H.hero.lead)}</p>
      <p class="actions">
        <a class="btn btn--solid" href="${href(H.hero.primary.route)}">${esc(H.hero.primary.label)}</a>
        <a class="btn" href="${href(H.hero.secondary.route)}">${esc(H.hero.secondary.label)}</a>
      </p>
      <a class="replay" href="#top">Replay the film <span aria-hidden="true">&uarr;</span></a>
    </div>
    <figure class="hhero__img">${img(H.hero.image)}</figure>
  </section>

  <section class="band" aria-labelledby="band-title">
    <div class="wrap band__grid">
      <header class="shead">
        <p class="eyebrow">${esc(H.craft.eyebrow)}</p>
        <h2 id="band-title">${esc(H.craft.title)}</h2>
        <p class="lead">${esc(craft.lead)}</p>
        <a class="more" href="#craft">${esc(H.craft.link)} <span aria-hidden="true">&rarr;</span></a>
      </header>
      <ol class="band__steps">${steps}</ol>
    </div>
  </section>

  <nav class="range wrap" aria-label="${esc(H.range.eyebrow)}">
    <p class="eyebrow">${esc(H.range.eyebrow)}</p>
    <ul>${range}</ul>
    <a class="more" href="#lenses">${esc(H.range.link)} <span aria-hidden="true">&rarr;</span></a>
  </nav>
  ${footer('#top')}
</div>`, 'route--home');
}
