// Contact: email and phone only, no form. Three frames, each laid out its
// own way: the email set enormous across the coated front element at full
// bleed (the page's moment), the phone beside the signed rear barrel, and
// what helps us answer, set like graduations beside the engraved distance
// scale.
import { site, esc, img, footer, route } from '../parts.js';
import { contact } from '../../content/contact.js';
import { lenses } from '../../content/lenses.js';

// Which lens is it about? Picking one starts the email: the lens in the
// subject and the first line (src/site/lab.js makes it live; without JS
// the plain address above is the way to write).
const mm = (l) => (l.specs.find(([k]) => k === 'Focal length') || ['', ''])[1];
function pick() {
  const chips = lenses.map((l) => `<button type="button" class="chip" data-band="${l.band}" data-lens="${esc(l.name)}" data-role="${esc(l.role.toLowerCase())}" data-mm="${esc(mm(l))}" aria-pressed="false">${esc(l.name)} <small>${esc(mm(l))}</small></button>`).join('');
  const pics = lenses.map((l, i) => `<span class="ct-pick__img" data-lens="${esc(l.name)}" data-band="${l.band}">${img(`model-${i + 1}`, { alt: '' })}</span>`).join('');
  const subj = 'Enquiry from the Kessel site';
  const body = 'Hello, I would like to know more about your lenses.';
  return `<section class="beat ct-pick" data-beat="pick" aria-labelledby="contact-pick-title">
  <div class="beat__pin ct-pick__pin">
    <div class="ct-pick__copy">
      <p class="eyebrow">Before you write</p>
      <h2 id="contact-pick-title">Which lens is it about?</h2>
      <p class="ct-pick__lead">Pick one and the email starts itself, with the lens in the subject line.</p>
      <div class="ctl ct-pick__ctl">
        <p class="ctl__say"><span class="ctl__cue">Try it</span> <span class="ctl__how">Tap a lens.</span></p>
        <div class="ct-pick__chips lab__targets" role="group" aria-label="Which lens">${chips}<button type="button" class="chip" data-lens="" aria-pressed="true">Not sure yet</button></div>
      </div>
    </div>
    <figure class="ct-pick__mail">
      <div class="ct-pick__pics" aria-hidden="true">${pics}</div>
      <dl class="ct-pick__head">
        <div><dt>To</dt><dd>${mail(site.email)}</dd></div>
        <div><dt>Subject</dt><dd class="ct-pick__subj" aria-live="polite">${esc(subj)}</dd></div>
      </dl>
      <p class="ct-pick__body">${esc(body)}</p>
      <a class="btn btn--solid ct-pick__go" href="mailto:${esc(site.email)}?subject=${encodeURIComponent(subj)}&amp;body=${encodeURIComponent(body)}">Write this email</a>
      <figcaption class="note">Names are proposals for this concept.</figcaption>
    </figure>
  </div>
</section>`;
}

// The address may only break after the @, never mid-word.
const mail = (s) => esc(s).replace('@', '@<wbr>');
const tel = (s) => s.replace(/[^\d+]/g, '');

export function contactHTML() {
  const C = contact;
  const help = C.help.map((h, i) => `
        <li><span class="ct-help__no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><p>${esc(h)}</p></li>`).join('');
  return route('contact', `Contact · ${site.name}`, `
<div class="ct-stage">
  <figure class="ct-stage__img" data-crop="background">${img(C.image, { lazy: false })}</figure>
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
  <figure class="ct-studio__img" data-crop="background">${img(C.studioImage)}</figure>
  <dl class="ct-studio__in wrap">
    <div class="ct-phone">
      <dt>${esc(C.labels.phone)}</dt>
      <dd><a class="ct-phone__link" href="tel:${tel(site.phone)}"><span class="selectable">${esc(site.phone)}</span><span class="ct-phone__go" aria-hidden="true">${esc(C.callCta)} <span>&rarr;</span></span></a></dd>
    </div>
  </dl>
</div>

${pick()}

<section class="ct-help" aria-labelledby="contact-help-title">
  <figure class="ct-help__img" data-crop="background">${img(C.helpImage)}</figure>
  <div class="ct-help__in wrap">
    <h2 id="contact-help-title">${esc(C.helpTitle)}</h2>
    <ol class="ct-help__list">${help}
    </ol>
  </div>
</section>
${footer('#contact')}`);
}
