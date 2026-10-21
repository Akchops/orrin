// Company: who Kessel is and how a lens is made, all of it sample content
// for this concept (each section carries the tag). The lens close up at
// full height with the headline beside it opens the page; then the story,
// the timeline (a year scrubber on wide screens, a vertical stepper on
// phones), the checks a lens passes before the optician signs it, the
// workshop in figures, the questions and the people by role. Contact ends
// it. Everything reads without JS: src/site/company.js only adds the
// interactions.
import { site, esc, paras, img, footer, route } from '../parts.js';
import { company } from '../../content/company.js';

const C = company;
const sample = `<p class="co-sample">${esc(C.sample)}</p>`;

// Section head: number and kicker, the heading, the sample tag.
const head = (s, extra = '') => `<div class="co-head">
    <p class="co-kicker"><span>${esc(s.no)}</span> ${esc(s.kicker)}</p>
    <h2 id="${s.id}-title">${esc(s.title)}</h2>
    ${sample}${extra}
  </div>`;

// The optician's signature as an SVG stroke: the same deterministic pen
// path that src/app/textures.js engraves on the rear barrel, so the page
// signs with the hand that is on the lens.
function signature() {
  const pts = [[30, 300]];
  for (let i = 0; i < 220; i++) {
    const t = i / 220;
    pts.push([30 + t * 240 + Math.sin(t * 29) * 12 + Math.sin(t * 7.3) * 7,
      300 + Math.sin(t * 21 + 1.2) * 34 * (1 - t * 0.5) + Math.cos(t * 9.1) * 9 - t * 14]);
  }
  const d = 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L');
  return `<svg class="co-sign" viewBox="12 250 276 126" aria-hidden="true" focusable="false">
        <path class="co-sign__pen" pathLength="1" d="${d}"/>
        <path class="co-sign__rule" pathLength="1" d="M24 362C100 374 190 352 276 360"/>
      </svg>`;
}

// ------------------------------------------------------------- hero
function hero() {
  const H = C.hero;
  const sections = [C.story, C.timeline, C.work, C.workshop, C.faq, C.roles];
  const index = sections.map((s) => `<li><a href="#${s.id}"><span class="co-index__no">${esc(s.no)}</span><span class="co-index__name">${esc(s.short)}</span></a></li>`).join('');
  // #workshop, the old Workshop page, lands here (its id resolves to this
  // route, and the router focuses the h1 inside it).
  return `<header class="co-hero" id="workshop">
  <div class="co-hero__fig">
    <svg class="co-hero__ring" viewBox="0 0 1000 1000" aria-hidden="true" focusable="false">
      <defs><path id="company-ring" d="M500,500 m-440,0 a440,440 0 1,1 880,0 a440,440 0 1,1 -880,0"/></defs>
      <circle cx="500" cy="500" r="472"/>
      <text><textPath href="#company-ring">${esc(H.ring.repeat(2))}</textPath></text>
    </svg>
    <figure>${img(H.image, { lazy: false })}</figure>
  </div>
  <div class="co-hero__copy wrap">
    <div class="co-hero__meta">
      <p class="eyebrow">${esc(H.eyebrow)}</p>
      ${sample}
    </div>
    <h1 id="company-title" tabindex="-1">${H.title.map((l) => `<span class="co-hero__l">${esc(l)}</span>`).join(' ')}</h1>
    <p class="co-hero__lead">${esc(H.lead)}</p>
    <nav class="co-index" aria-label="On this page"><ol>${index}</ol></nav>
  </div>
</header>`;
}

// ------------------------------------------------------------ story
function story() {
  const S = C.story;
  return `<section class="co-sec co-story wrap" id="${S.id}" aria-labelledby="${S.id}-title">
  ${head(S)}
  <div class="co-story__text">
    <p class="co-story__line">${esc(S.line)}</p>
    <div class="co-story__body">${paras(S.body)}</div>
  </div>
</section>`;
}

// --------------------------------------------------------- timeline
// One list of entries. Without JS it is all of them, in order. With JS,
// wide screens get the scrubber above it (a tab per year on a ruler from
// the first year to the last) and show one entry at a time; phones get a
// vertical stepper, one entry open at a time.
function timeline() {
  const T = C.timeline, E = T.entries;
  const y0 = E[0].year, y1 = E[E.length - 1].year;
  const at = (y) => ((y - y0) / (y1 - y0)).toFixed(4);
  const label = (e) => `${e.year}, ${e.title}`;
  const tabs = E.map((e) => `<button class="co-tl__tab" type="button" role="tab" id="company-tab-${e.year}" aria-controls="company-y${e.year}" aria-selected="false" tabindex="-1" style="--p:${at(e.year)}"><span class="co-tl__tab-y">${e.year}</span><span class="co-tl__tab-t">${esc(e.short)}</span></button>`).join('');
  // The years between the entries, marked on the ruler.
  const years = [];
  for (let y = y0 + 1; y < y1; y++) if (!E.some((e) => e.year === y)) years.push(`<span style="--p:${at(y)}">${y}</span>`);
  const items = E.map((e, i) => {
    const prev = E[i - 1], next = E[i + 1];
    return `<li class="co-tl__item">
      <div class="co-tl__panel" id="company-y${e.year}">
        <h3 class="co-tl__head"><span class="co-tl__year">${e.year}</span> <span class="co-tl__title">${esc(e.title)}</span></h3>
        <div class="co-tl__body" id="company-y${e.year}-body">
          <div class="co-tl__inner">
            <figure class="co-tl__fig" data-still="${e.image}">${img(e.image)}</figure>
            <div class="co-tl__copy">
              <p>${esc(e.body)}</p>
              <p class="co-tl__tag">${i === 0 ? 'Founding year' : 'Sample year'}</p>
              <div class="co-tl__go" hidden>
                ${prev ? `<button type="button" data-go="-1" aria-label="Earlier: ${esc(label(prev))}"><span aria-hidden="true">&larr;</span> ${prev.year}</button>` : ''}
                ${next ? `<button type="button" data-go="1" aria-label="Later: ${esc(label(next))}">${next.year} <span aria-hidden="true">&rarr;</span></button>` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>`;
  }).join('\n    ');
  return `<section class="co-sec co-tl wrap" id="${T.id}" aria-labelledby="${T.id}-title" data-co-tl>
  ${head(T, `\n    <p class="co-note">${esc(T.note)}</p>`)}
  <div class="co-tl__scrub" hidden>
    <div class="co-tl__track">
      <div class="co-tl__ruler" aria-hidden="true">${years.join('')}</div>
      <span class="co-tl__index" aria-hidden="true"></span>
      <div class="co-tl__tabs" role="tablist" aria-label="Years">${tabs}</div>
    </div>
  </div>
  <ol class="co-tl__list">
    ${items}
  </ol>
</section>`;
}

// ------------------------------------------------------------ checks
// Real checkboxes, so ticking works without JS too: CSS lights the gauge,
// counts the passes and draws the signature once all of them are ticked.
// JS adds the button that runs them in order.
function work() {
  const W = C.work;
  const points = W.points.map((p) => `<div class="co-work__point">
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.body)}</p>
    </div>`).join('\n    ');
  const checks = W.checks.map((c, i) => `<li class="co-check">
        <label>
          <span class="co-check__no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <input class="co-check__box" type="checkbox" name="company-check" value="${esc(c.name)}">
          <svg class="co-check__tick" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path pathLength="1" d="M5 12.5l4.5 4.5L19 7.5"/></svg>
          <span class="co-check__text"><span class="co-check__name">${esc(c.name)}</span> <span class="co-check__line">${esc(c.line)}</span></span>
        </label>
      </li>`).join('\n      ');
  const gauge = W.checks.map(() => '<li></li>').join('');
  return `<section class="co-sec co-work wrap" id="${W.id}" aria-labelledby="${W.id}-title">
  ${head(W)}
  <div class="co-work__points">
    ${points}
  </div>
  <div class="co-checks" data-co-checks>
    <div class="co-checks__top">
      <h3 id="company-checks-title">${esc(W.checksTitle)}</h3>
      <p class="co-checks__help">${esc(W.checksHelp)}</p>
      <button class="co-checks__run btn" type="button" data-run="${esc(W.run)}" data-busy="${esc(W.busy)}" data-again="${esc(W.again)}" hidden>${esc(W.run)}</button>
    </div>
    <ol class="co-checks__list" aria-labelledby="company-checks-title">
      ${checks}
    </ol>
    <div class="co-checks__foot">
      <ol class="co-checks__gauge" aria-hidden="true">${gauge}</ol>
      <p class="co-checks__count" aria-live="polite"><span class="co-checks__n"></span> of ${W.checks.length} checks passed</p>
    </div>
    <div class="co-checks__sign">
      ${signature()}
      <p class="co-checks__state"><span class="co-checks__wait">${esc(W.waiting)}</span><span class="co-checks__done">${esc(W.signed)}</span></p>
    </div>
  </div>
</section>`;
}

// ---------------------------------------------------------- workshop
function workshop() {
  const W = C.workshop;
  const facts = W.facts.map((f) => `<div class="co-facts__item">
      <dt>${esc(f.label)}</dt>
      <dd><span class="co-facts__value">${esc(f.value)}</span> <span class="co-facts__note">${esc(f.note)}</span></dd>
    </div>`).join('\n    ');
  const values = W.values.map((v, i) => `<li class="co-value">
      <span class="co-value__no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
      <h3>${esc(v.title)}</h3>
      <p>${esc(v.body)}</p>
    </li>`).join('\n    ');
  return `<section class="co-sec co-shop wrap" id="${W.id}" aria-labelledby="${W.id}-title">
  ${head(W)}
  <dl class="co-facts">
    ${facts}
  </dl>
  <ol class="co-values">
    ${values}
  </ol>
</section>`;
}

// --------------------------------------------------------------- faq
function faq() {
  const F = C.faq;
  const items = F.items.map((it) => `<details class="co-q">
      <summary><span class="co-q__q">${esc(it.q)}</span><span class="co-q__icon" aria-hidden="true"></span></summary>
      <div class="co-q__a">
        <p class="co-q__tag">${esc(F.answerTag)}</p>
        <p>${esc(it.a)}</p>
        ${it.link ? `<a class="more" href="#${it.link.route}">${esc(it.link.label)} <span aria-hidden="true">&rarr;</span></a>` : ''}
      </div>
    </details>`).join('\n    ');
  return `<section class="co-sec co-faq wrap" id="${F.id}" aria-labelledby="${F.id}-title">
  ${head(F)}
  <div class="co-faq__list">
    ${items}
  </div>
</section>`;
}

// ------------------------------------------------------------- roles
// Each card's heading becomes a button with JS (the description shows on
// hover, focus or a tap); without JS every description is shown.
function roles() {
  const R = C.roles;
  const cards = R.list.map((r, i) => `<li class="co-role">
      <figure class="co-role__fig">${img(r.image, { alt: '' })}</figure>
      <span class="co-role__no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
      <div class="co-role__copy">
        <h3 class="co-role__head"><span class="co-role__name">${esc(r.name)}</span> <span class="co-role__does">${esc(r.does)}</span></h3>
        <div class="co-role__desc" id="company-role-${i + 1}"><p>${esc(r.body)}</p></div>
      </div>
    </li>`).join('\n    ');
  return `<section class="co-sec co-people wrap" id="${R.id}" aria-labelledby="${R.id}-title">
  ${head(R, `\n    <p class="co-note">${esc(R.note)}</p>`)}
  <ul class="co-roles">
    ${cards}
  </ul>
</section>`;
}

// -------------------------------------------------------------- next
function next() {
  const N = C.next;
  const more = N.more.map((n) => `<a class="co-next__more" href="#${n.route}"><span class="co-next__k">${esc(n.label)}</span> <span class="co-next__m">${esc(n.text)} <span aria-hidden="true">&rarr;</span></span></a>`).join('\n    ');
  return `<nav class="co-next wrap" aria-label="Where next">
  <a class="co-next__main" href="#${N.contact.route}">
    <span class="co-next__k">${esc(N.contact.label)}</span>
    <span class="co-next__t">${esc(N.contact.text)} <span class="co-next__go" aria-hidden="true">&rarr;</span></span>
  </a>
  <div class="co-next__row">
    ${more}
  </div>
</nav>`;
}

export function companyHTML() {
  return route('company', `Company · ${site.name}`, `
${hero()}
${story()}
${timeline()}
${work()}
${workshop()}
${faq()}
${roles()}
${next()}
${footer('#company')}`);
}
