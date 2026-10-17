// Craft: how a lens is made.
import { site, esc, paras, href, lensRoute, img, contactLines, proposalTag, footer, route, pageHead } from '../parts.js';
import { craft } from '../../content/craft.js';
import { media } from '../../content/media.js';

export function craftHTML() {
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

