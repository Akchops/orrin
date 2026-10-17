// Workshop: the workshop in Pune.
import { site, esc, paras, href, lensRoute, img, contactLines, proposalTag, footer, route, pageHead } from '../parts.js';
import { workshop } from '../../content/workshop.js';

export function workshopHTML() {
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

