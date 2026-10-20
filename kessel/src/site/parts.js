// Shared building blocks for the page templates: escaping, images,
// contact lines, the footer and the route wrapper. Build time only.
import { site } from '../content/site.js';
import { media } from '../content/media.js';

export { site };
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const paras = (list, cls = '') => list.map((p) => `<p${cls ? ` class="${cls}"` : ''}>${esc(p)}</p>`).join('\n');
export const href = (route) => `#${route}`;
export const lensRoute = (l) => `lens-${l.slug}`;
// An image is always one of the rendered stills; `%%STILL:name%%` is
// replaced with its data URI by the build. Stills rendered for the site
// pages carry an alpha channel, so they sit on the page with no box.
export function img(name, { lazy = true, cls = '', sizes = '', alt } = {}) {
  const m = media[name];
  if (!m) throw new Error(`no media entry for still "${name}"`);
  return `<img${cls ? ` class="${cls}"` : ''} src="%%STILL:${name}%%" width="${m.w}" height="${m.h}"${lazy ? ' loading="lazy" decoding="async"' : ''}${sizes ? ` sizes="${sizes}"` : ''} alt="${esc(alt ?? m.alt)}">`;
}

export const contactLines = (cls = '') => `
<dl class="clist${cls ? ' ' + cls : ''}">
  <div><dt>Email</dt><dd><span class="selectable">${esc(site.email)}</span> <button class="copy" type="button" data-copy="${esc(site.email)}" hidden>Copy</button></dd></div>
  <div><dt>Phone</dt><dd><span class="selectable">${esc(site.phone)}</span></dd></div>
  <div><dt>Studio</dt><dd>${esc(site.city)}</dd></div>
</dl>`;

export const proposalTag = '<span class="tag">Proposal</span>';
export function footer(topHref) {
  const links = site.nav.map((n) => `<li><a href="${n.href}">${esc(n.label)}</a></li>`).join('');
  const more = site.more.map((n) => `<a href="${n.href}">${esc(n.label)}</a>`).join('<span aria-hidden="true"> · </span>');
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
    <p class="foot__more">More: ${more}</p>
    <a href="${topHref}">Back to top</a>
  </div>
</footer>`;
}

export const route = (id, title, body, extra = '') =>
  `<section class="route${extra ? ' ' + extra : ''}" id="${id}" data-title="${esc(title)}" aria-labelledby="${id}-title">\n${body}\n</section>`;

export const pageHead = ({ id, eyebrow, title, lead, note }) => `
<header class="phead wrap">
  <p class="eyebrow">${esc(eyebrow)}</p>
  <h1 id="${id}-title" tabindex="-1">${esc(title)}</h1>
  ${lead ? `<p class="lead">${esc(lead)}</p>` : ''}
  ${note ? `<p class="note">${esc(note)}</p>` : ''}
</header>`;


// Specification table with the sample-figures note under it.
export function specTable(l, caption) {
  const rows = l.specs.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');
  return `<table class="spec"><caption>${esc(caption)}</caption><tbody>${rows}</tbody></table>
<p class="spec-note">${esc(site.specNote)}</p>`;
}

// The controls under a 3D lens viewer (src/app/viewer.js): hidden until
// the viewer has drawn, so the stills never offer controls that do nothing.
export function viewerTools(forId, { hint, buttons = true }) {
  const b = (act, label, txt) => `<button type="button" data-act="${act}"${label ? ` aria-label="${label}"` : ''}>${txt}</button>`;
  return `<div class="viewer-tools" data-for="${forId}" hidden>
  <p class="viewer-tools__hint">${esc(hint)}</p>${buttons ? `
  <div class="viewer-tools__btns" role="group" aria-label="Turn and zoom the 3D lens">
    ${b('left', 'Turn left', '<span aria-hidden="true">&larr;</span>')}${b('right', 'Turn right', '<span aria-hidden="true">&rarr;</span>')}${b('out', 'Zoom out', '<span aria-hidden="true">&minus;</span>')}${b('in', 'Zoom in', '<span aria-hidden="true">+</span>')}${b('reset', '', 'Reset')}
  </div>` : ''}
</div>`;
}
