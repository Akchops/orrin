// Contact: email and phone only, no form. One beat holds the page: the lens
// whole in its own stage (src/styles/base.css .lstage), and beside it (below
// on phones) the heading, "Which lens is it about?" and the email. Nothing
// is set over the lens. The phone and what helps us answer follow, plain.
import { site, esc, img, footer, route } from '../parts.js';
import { contact } from '../../content/contact.js';
import { lenses } from '../../content/lenses.js';

// The address may only break after the @, never mid-word.
const mail = (s) => esc(s).replace('@', '@<wbr>');
const tel = (s) => s.replace(/[^\d+]/g, '');
const mm = (l) => (l.specs.find(([k]) => k === 'Focal length') || ['', ''])[1];

// Picking a lens starts the email: the lens in the subject and the first
// line, and that lens on the stage (src/site/lab.js makes it live; without
// JS the stage shows the three and the plain address is the way to write).
function pick(C) {
  const chips = lenses.map((l) => `<button type="button" class="chip" data-band="${l.band}" data-lens="${esc(l.name)}" data-role="${esc(l.role.toLowerCase())}" data-mm="${esc(mm(l))}" aria-pressed="false">${esc(l.name)} <small>${esc(mm(l))}</small></button>`).join('');
  const shots = lenses.map((l, i) => img(`lens-${i + 1}`, { cls: 'ct-pick__lens', lazy: false }).replace('<img', `<img data-lens="${esc(l.name)}"`)).join('\n      ');
  const subj = 'Enquiry from the Kessel site';
  const body = 'Hello, I would like to know more about your lenses.';
  return `<section class="beat ct-pick" data-beat="pick" aria-labelledby="contact-title">
  <div class="beat__pin ct-pick__pin">
    <figure class="ct-pick__stage lstage" data-lstage>
      ${img(C.allImage, { cls: 'ct-pick__lens ct-pick__lens--all', lazy: false, alt: C.allAlt })}
      ${shots}
    </figure>
    <div class="ct-pick__copy">
      <header class="ct-head">
        <p class="eyebrow">${esc(C.eyebrow)}</p>
        <h1 id="contact-title" tabindex="-1">${esc(C.title)}</h1>
        <p class="ct-head__lead">${esc(C.lead)}</p>
      </header>
      <div class="ctl ct-pick__ctl">
        <h2 class="ct-pick__h">${esc(C.pickTitle)}</h2>
        <p class="ctl__say"><span class="ctl__cue">Try it</span> <span class="ctl__how">${esc(C.pickHow)}</span></p>
        <div class="ct-pick__chips lab__targets" role="group" aria-label="${esc(C.pickTitle)}">${chips}<button type="button" class="chip" data-lens="" aria-pressed="true">${esc(C.notSure)}</button></div>
      </div>
      <div class="ct-pick__mail">
        <dl class="ct-pick__head">
          <div><dt>${esc(C.labels.email)}</dt><dd><a class="ct-mail__link" href="mailto:${esc(site.email)}"><span class="selectable">${mail(site.email)}</span></a></dd></div>
          <div class="ct-pick__subj-row"><dt>Subject</dt><dd class="ct-pick__subj" aria-live="polite">${esc(subj)}</dd></div>
        </dl>
        <p class="ct-pick__acts">
          <a class="btn btn--solid ct-pick__go" href="mailto:${esc(site.email)}?subject=${encodeURIComponent(subj)}&amp;body=${encodeURIComponent(body)}" data-body="${esc(body)}">Write this email</a>
          <button class="copy" type="button" data-copy="${esc(site.email)}" hidden>Copy</button>
        </p>
      </div>
      <p class="note ct-pick__note">Names are proposals for this concept.</p>
    </div>
  </div>
</section>`;
}

export function contactHTML() {
  const C = contact;
  const help = C.help.map((h, i) => `
        <li><span class="ct-help__no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><p>${esc(h)}</p></li>`).join('');
  return route('contact', `Contact · ${site.name}`, `
${pick(C)}

<section class="ct-more wrap" aria-labelledby="contact-help-title">
  <dl class="ct-phone">
    <dt>${esc(C.labels.phone)}</dt>
    <dd><a class="ct-phone__link" href="tel:${tel(site.phone)}"><span class="selectable">${esc(site.phone)}</span><span class="ct-phone__go" aria-hidden="true">${esc(C.callCta)} <span>&rarr;</span></span></a></dd>
  </dl>
  <div class="ct-help">
    <h2 id="contact-help-title">${esc(C.helpTitle)}</h2>
    <ol class="ct-help__list">${help}
    </ol>
  </div>
</section>
${footer('#contact')}`);
}
