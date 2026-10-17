// Build-time templates: turn the content files into the site's routes.
// Run by kessel/scripts/build.mjs in Node; nothing here ships to the page
// except the HTML it returns. Every route is a <section class="route">
// with an id that is also its address (#lenses, #lens-parvati, ...).
import { site } from '../content/site.js';
import { film } from '../content/film.js';
import { home } from '../content/home.js';
import { lenses } from '../content/lenses.js';
import { craft } from '../content/craft.js';
import { workshop } from '../content/workshop.js';
import { contact } from '../content/contact.js';
import { media } from '../content/media.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const paras = (list, cls = '') => list.map((p) => `<p${cls ? ` class="${cls}"` : ''}>${esc(p)}</p>`).join('\n');
const href = (route) => `#${route}`;
const lensRoute = (l) => `lens-${l.slug}`;

// An image is always one of the rendered stills; `%%STILL:name%%` is
// replaced with its data URI by the build.
function img(name, { lazy = true, cls = '', sizes = '' } = {}) {
  const m = media[name];
  if (!m) throw new Error(`no media entry for still "${name}"`);
  return `<img${cls ? ` class="${cls}"` : ''} src="%%STILL:${name}%%" width="${m.w}" height="${m.h}"${lazy ? ' loading="lazy" decoding="async"' : ''}${sizes ? ` sizes="${sizes}"` : ''} alt="${esc(m.alt)}">`;
}

const contactLines = (cls = '') => `
<dl class="clist${cls ? ' ' + cls : ''}">
  <div><dt>Email</dt><dd><span class="selectable">${esc(site.email)}</span> <button class="copy" type="button" data-copy="${esc(site.email)}" hidden>Copy</button></dd></div>
  <div><dt>Phone</dt><dd><span class="selectable">${esc(site.phone)}</span></dd></div>
  <div><dt>Studio</dt><dd>${esc(site.city)}</dd></div>
</dl>`;

const proposalTag = '<span class="tag">Proposal</span>';

// --------------------------------------------------------------- shell
export function header() {
  const links = site.nav.map((n) => `<a href="${href(n.route)}" data-nav="${n.route}">${esc(n.label)}</a>`).join('\n    ');
  return `<header class="masthead">
  <a class="masthead__mark" href="#home" aria-label="${esc(site.name)}, home">KESSEL<span> OPTICS</span></a>
  <nav class="masthead__nav" id="site-nav" aria-label="Main">
    ${links}
  </nav>
  <button class="masthead__menu" type="button" aria-expanded="false" aria-controls="site-nav" hidden>Menu</button>
</header>`;
}

function footer(topHref) {
  const links = site.nav.map((n) => `<li><a href="${href(n.route)}">${esc(n.label)}</a></li>`).join('');
  return `<footer class="foot">
  <div class="wrap foot__grid">
    <div class="foot__brand">
      <p class="foot__mark">KESSEL OPTICS</p>
      <p>${esc(site.footer.blurb)}</p>
    </div>
    <nav class="foot__nav" aria-label="Footer"><ul>${links}</ul></nav>
    <div class="foot__contact">
      <p><span class="selectable">${esc(site.email)}</span></p>
      <p><span class="selectable">${esc(site.phone)}</span></p>
      <p>${esc(site.city)}, India</p>
    </div>
  </div>
  <div class="wrap foot__base">
    <p>${esc(site.footer.disclaimer)}</p>
    <a href="${topHref}">Back to top</a>
  </div>
</footer>`;
}

const route = (id, title, body, extra = '') =>
  `<section class="route${extra ? ' ' + extra : ''}" id="${id}" data-title="${esc(title)}" aria-labelledby="${id}-title">\n${body}\n</section>`;

const pageHead = ({ id, eyebrow, title, lead, note }) => `
<header class="phead wrap">
  <p class="eyebrow">${esc(eyebrow)}</p>
  <h1 id="${id}-title" tabindex="-1">${esc(title)}</h1>
  ${lead ? `<p class="lead">${esc(lead)}</p>` : ''}
  ${note ? `<p class="note">${esc(note)}</p>` : ''}
</header>`;

// ---------------------------------------------------------------- home
// The film markup is unchanged from the single-page demo: live.js pins
// #aperture, #through, #exit and #focus, and the film ends after #focus.
function filmHTML() {
  const h = film.hero;
  const stages = film.stages.map((s) => `
  <section class="stagecopy" id="${s.id}" aria-labelledby="${s.id}-cap">
    <figure class="still">${img(s.still)}<figcaption>${esc(s.caption)}</figcaption></figure>
    <div class="cap">
      <p class="cap__num">${esc(s.num)}</p>
      <h2 id="${s.id}-cap">${esc(s.title)}</h2>
      <p>${esc(s.body)}</p>
    </div>
  </section>`).join('');
  return `<div class="film" id="film">
  <section class="hero" id="top" aria-labelledby="home-title">
    <figure class="still still--hero">${img('hero', { lazy: false })}<figcaption>${esc(h.caption)}</figcaption></figure>
    <div class="hero__copy">
      <h1 id="home-title" tabindex="-1"><span class="hero__name">${esc(h.name)}</span> <span class="hero__line">${esc(h.line)}</span></h1>
      <p class="hero__sub">${esc(h.sub)}</p>
      <a class="hero__cue" href="#aperture">${esc(h.cue)}</a>
    </div>
  </section>${stages}
</div>
<a class="skipfilm" href="#home-hero" data-jump>${esc(film.skip)} <span aria-hidden="true">&darr;</span></a>`;
}

function lensCard(l, { heading = 'h3', lazy = true } = {}) {
  return `<li class="lcard" data-band="${l.band}">
  <a class="lcard__link" href="#${lensRoute(l)}">
    <span class="lcard__img">${img(l.thumb, { lazy })}</span>
    <span class="lcard__body">
      <span class="lcard__role">${esc(l.role)} ${proposalTag}</span>
      <${heading} class="lcard__name">${esc(l.name)}</${heading}>
      <span class="lcard__line">${esc(l.line)}</span>
      <span class="lcard__more">View lens <span aria-hidden="true">&rarr;</span></span>
    </span>
  </a>
</li>`;
}

function homeHTML() {
  const H = home;
  const steps = craft.steps.map((s) => `<li><span class="band__no">${s.no}</span><span class="band__t">${esc(s.title)}</span></li>`).join('');
  return route('home', `${site.name} · ${film.hero.line.replace(/\.$/, '')}`, `
<noscript><p class="notice notice--static">JavaScript is off. The live lens needs it, so each stage below is a still frame with its caption.</p></noscript>
<p class="notice" id="notice" hidden></p>
${filmHTML()}
<div class="after" id="after">
  <section class="hhero" id="home-hero" aria-labelledby="home-hero-title">
    <div class="wrap hhero__grid">
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
      <figure class="hhero__img frame">${img(H.hero.image)}</figure>
    </div>
  </section>

  <section class="featured wrap" aria-labelledby="featured-title">
    <header class="shead">
      <p class="eyebrow">${esc(H.featured.eyebrow)}</p>
      <h2 id="featured-title">${esc(H.featured.title)}</h2>
      <p class="lead">${esc(H.featured.lead)}</p>
      <p class="note">${esc(site.proposalNote)}</p>
    </header>
    <ul class="lgrid">${lenses.map((l) => lensCard(l)).join('\n')}</ul>
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

  <section class="split wrap" aria-labelledby="home-ws-title">
    <figure class="split__img frame">${img(H.workshop.image)}</figure>
    <div class="split__copy">
      <p class="eyebrow">${esc(H.workshop.eyebrow)}</p>
      <h2 id="home-ws-title">${esc(H.workshop.title)}</h2>
      ${paras(H.workshop.body)}
      <a class="more" href="#workshop">${esc(H.workshop.link)} <span aria-hidden="true">&rarr;</span></a>
    </div>
  </section>

  <section class="cstrip wrap" aria-labelledby="home-ct-title">
    <div>
      <p class="eyebrow">${esc(H.contact.eyebrow)}</p>
      <h2 id="home-ct-title">${esc(H.contact.title)}</h2>
    </div>
    <div>
      ${contactLines('clist--big')}
      <a class="more" href="#contact">${esc(H.contact.link)} <span aria-hidden="true">&rarr;</span></a>
    </div>
  </section>
  ${footer('#top')}
</div>`, 'route--home');
}

// -------------------------------------------------------------- lenses
function specTable(l, caption) {
  const rows = l.specs.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');
  return `<table class="spec"><caption>${esc(caption)}</caption><tbody>${rows}</tbody></table>
<p class="spec-note">${esc(site.specNote)}</p>`;
}

function lensesHTML() {
  const heads = lenses.map((l) => `<th scope="col"><a href="#${lensRoute(l)}">${esc(l.name)}</a></th>`).join('');
  const rows = lenses[0].specs.map(([k], i) => `<tr><th scope="row">${esc(k)}</th>${lenses.map((l) => `<td>${esc(l.specs[i][1])}</td>`).join('')}</tr>`).join('');
  return route('lenses', `Lenses · ${site.name}`, `
${pageHead({ id: 'lenses', eyebrow: 'Lenses', title: 'Three lenses', lead: 'A wide, a standard and a long lens for cinema and photography. Each is assembled by one optician and signed on the barrel.', note: site.proposalNote })}
<div class="wrap">
  <ul class="lgrid lgrid--index">${lenses.map((l) => lensCard(l, { heading: 'h2', lazy: false })).join('\n')}</ul>
  <section class="compare" aria-labelledby="compare-title">
    <h2 id="compare-title">Side by side</h2>
    <div class="scroll-x" role="region" aria-labelledby="compare-title" tabindex="0">
      <table class="spec spec--compare"><caption>Sample specifications for the three proposal lenses</caption>
        <thead><tr><td></td>${heads}</tr></thead><tbody>${rows}</tbody></table>
    </div>
    <p class="spec-note">${esc(site.specNote)}</p>
  </section>
</div>
${footer('#lenses')}`);
}

function lensHTML(l, i) {
  const id = lensRoute(l);
  const prev = lenses[(i + lenses.length - 1) % lenses.length], next = lenses[(i + 1) % lenses.length];
  const pager = (x, dir) => `<a class="pager__link pager__link--${dir}" href="#${lensRoute(x)}" data-band="${x.band}">
      <span class="pager__dir">${dir === 'prev' ? '<span aria-hidden="true">&larr;</span> Previous lens' : 'Next lens <span aria-hidden="true">&rarr;</span>'}</span>
      <span class="pager__name">${esc(x.name)}</span><span class="pager__role">${esc(x.role)}</span></a>`;
  return route(id, `${l.name} (proposal) · ${site.name}`, `
<div class="wrap lens" data-band="${l.band}">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="#lenses">Lenses</a><span aria-hidden="true">/</span><span aria-current="page">${esc(l.name)}</span></nav>
  <div class="lens__top">
    <figure class="lens__img frame">${img(l.image, { lazy: false })}</figure>
    <div class="lens__copy">
      <p class="eyebrow">${esc(l.role)} lens ${proposalTag}</p>
      <h1 id="${id}-title" tabindex="-1">${esc(l.name)}</h1>
      <p class="lens__line">${esc(l.line)}</p>
      <details class="enquire">
        <summary class="btn btn--solid">Enquire about ${esc(l.name)}</summary>
        <div class="enquire__body">
          <p>Write or call the studio in ${esc(site.city)} and mention ${esc(l.name)}.</p>
          ${contactLines()}
        </div>
      </details>
      <p class="note">The name ${esc(l.name)} and its role are proposals for this concept.</p>
    </div>
  </div>
  <section class="lens__specs" aria-labelledby="${id}-specs">
    <h2 id="${id}-specs">Specifications</h2>
    <div>${specTable(l, `${l.name}: sample specifications`)}</div>
  </section>
  <nav class="pager" aria-label="Other lenses">
    ${pager(prev, 'prev')}
    ${pager(next, 'next')}
  </nav>
</div>
${footer('#' + id)}`, 'route--lens');
}

// --------------------------------------------------------------- craft
function craftHTML() {
  const steps = craft.steps.map((s) => `<li class="step${media[s.image].w > media[s.image].h ? ' step--wide' : ''}" id="craft-${s.no}">
    <figure class="step__img frame">${img(s.image)}</figure>
    <div class="step__copy">
      <div class="step__head">
        <p class="step__no" aria-hidden="true">${s.no}</p>
        <h2><span class="sr-only">Step ${Number(s.no)}: </span>${esc(s.title)}</h2>
      </div>
      <div class="step__text">${paras(s.body)}</div>
    </div>
  </li>`).join('\n');
  return route('craft', `Craft · ${site.name}`, `
${pageHead({ id: 'craft', eyebrow: 'Craft', title: craft.title, lead: craft.lead })}
<div class="wrap">
  <ol class="steps">
  ${steps}
  </ol>
  <p class="endcta"><a class="btn" href="#lenses">See the three lenses</a> <a class="btn" href="#workshop">About the workshop</a></p>
</div>
${footer('#craft')}`);
}

// ------------------------------------------------------------ workshop
function workshopHTML() {
  const W = workshop;
  const facts = W.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
  const secs = W.sections.map((s, i) => `<section class="wsec" aria-labelledby="ws-${i}">
    <p class="wsec__no" aria-hidden="true">0${i + 1}</p>
    <h2 id="ws-${i}">${esc(s.title)}</h2>
    ${paras(s.body)}
  </section>`).join('\n');
  return route('workshop', `Workshop · ${site.name}`, `
${pageHead({ id: 'workshop', eyebrow: 'The workshop', title: W.title, lead: W.lead })}
<div class="wrap">
  <div class="ws__top">
    <figure class="ws__img frame">${img('signed', { lazy: false })}<figcaption>The signature on the rear barrel, rendered from the lens model.</figcaption></figure>
    <dl class="facts">${facts}</dl>
  </div>
  <div class="wsecs">${secs}</div>
  <p class="endcta"><a class="btn btn--solid" href="#contact">Write to the studio</a> <a class="btn" href="#craft">How a lens is made</a></p>
</div>
${footer('#workshop')}`);
}

// ------------------------------------------------------------- contact
function contactHTML() {
  const C = contact;
  return route('contact', `Contact · ${site.name}`, `
${pageHead({ id: 'contact', eyebrow: 'Contact', title: C.title, lead: C.lead })}
<div class="wrap ct">
  <div class="ct__main">
    ${contactLines('clist--huge')}
    <section class="ct__help" aria-labelledby="ct-help">
      <h2 id="ct-help">${esc(C.helpTitle)}</h2>
      <ul>${C.help.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
    </section>
  </div>
  <figure class="ct__img frame">${img(C.image)}</figure>
</div>
${footer('#contact')}`);
}

// --------------------------------------------------------------- all
export function renderSite() {
  const routes = [homeHTML(), lensesHTML(), ...lenses.map(lensHTML), craftHTML(), workshopHTML(), contactHTML()];
  const html = routes.join('\n\n');
  // Every id on the site belongs to one route: the map lets the first
  // script in <head> pick the route from the address before first paint.
  const map = {};
  for (const r of routes) {
    const rid = r.match(/^<section class="route[^"]*" id="([^"]+)"/)[1];
    for (const m of r.matchAll(/\sid="([^"]+)"/g)) map[m[1]] = rid;
  }
  const ids = Object.values(map).filter((v, i, a) => a.indexOf(v) === i);
  return { html, header: header(), map, ids };
}
