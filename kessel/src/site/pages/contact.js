// Contact: email and phone, no form.
import { site, esc, paras, href, lensRoute, img, contactLines, proposalTag, footer, route, pageHead } from '../parts.js';
import { contact } from '../../content/contact.js';

export function contactHTML() {
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

