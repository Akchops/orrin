// Contact: email and phone only, no form. Three frames, each laid out its
// own way: the email set enormous across the coated front element at full
// bleed (the page's moment), the phone beside the signed rear barrel, and
// what helps us answer, set like graduations beside the engraved distance
// scale.
import { site, esc, img, footer, route } from '../parts.js';
import { contact } from '../../content/contact.js';

// The address may only break after the @, never mid-word.
const mail = (s) => esc(s).replace('@', '@<wbr>');
const tel = (s) => s.replace(/[^\d+]/g, '');

export function contactHTML() {
  const C = contact;
  const help = C.help.map((h, i) => `
        <li><span class="ct-help__no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><p>${esc(h)}</p></li>`).join('');
  return route('contact', `Contact · ${site.name}`, `
<div class="ct-stage">
  <figure class="ct-stage__img">${img(C.image, { lazy: false })}</figure>
  <div class="ct-stage__in wrap">
    <header class="ct-head">
      <p class="eyebrow">${esc(C.eyebrow)}</p>
      <h1 id="contact-title" tabindex="-1">${esc(C.title)}</h1>
      <p class="lead">${esc(C.lead)}</p>
    </header>
    <dl class="ct-mail">
      <dt>${esc(C.labels.email)}</dt>
      <dd>
        <a class="ct-mail__link" href="mailto:${esc(site.email)}"><span class="selectable">${mail(site.email)}</span></a>
        <button class="copy" type="button" data-copy="${esc(site.email)}" hidden>Copy</button>
      </dd>
    </dl>
  </div>
</div>

<div class="ct-studio">
  <figure class="ct-studio__img">${img(C.studioImage)}</figure>
  <dl class="ct-studio__in wrap">
    <div class="ct-phone">
      <dt>${esc(C.labels.phone)}</dt>
      <dd><a class="ct-phone__link" href="tel:${tel(site.phone)}"><span class="selectable">${esc(site.phone)}</span><span class="ct-phone__go" aria-hidden="true">${esc(C.callCta)} <span>&rarr;</span></span></a></dd>
    </div>
  </dl>
</div>

<section class="ct-help" aria-labelledby="contact-help-title">
  <figure class="ct-help__img">${img(C.helpImage)}</figure>
  <div class="ct-help__in wrap">
    <h2 id="contact-help-title">${esc(C.helpTitle)}</h2>
    <ol class="ct-help__list">${help}
    </ol>
  </div>
</section>
${footer('#contact')}`);
}
