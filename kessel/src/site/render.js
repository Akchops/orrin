// Build-time templates: turn the content files into the site's routes.
// Run by kessel/scripts/build.mjs in Node; nothing here ships to the page
// except the HTML it returns. Every route is a <section class="route">
// with an id that is also its address (#lenses, #lens-parvati, ...).
// Each page has its own module in ./pages and its own stylesheet in
// ../styles; shared pieces live in ./parts.js.
import { site, esc, href } from './parts.js';
import { lenses } from '../content/lenses.js';
import { homeHTML } from './pages/home.js';
import { lensesHTML } from './pages/lenses.js';
import { lensHTML } from './pages/lens.js';
import { craftHTML } from './pages/craft.js';
import { workshopHTML } from './pages/workshop.js';
import { contactHTML } from './pages/contact.js';

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

// --------------------------------------------------------------- all
export function renderSite() {
  const routes = [homeHTML(), lensesHTML(), ...lenses.map(lensHTML), craftHTML(), workshopHTML(), contactHTML()];
  const html = routes.join('\n\n');
  // Every id on the site belongs to one route: the map lets the first
  // script in <head> pick the route from the address before first paint.
  const map = {};
  for (const r of routes) {
    const rid = r.match(/^<section class="route[^"]*" id="([^"]+)"/)[1];
    for (const m of r.matchAll(/\sid="([^"]+)"/g)) {
      if (map[m[1]]) throw new Error(`duplicate id "${m[1]}" (in ${map[m[1]]} and ${rid})`);
      map[m[1]] = rid;
    }
  }
  const ids = Object.values(map).filter((v, i, a) => a.indexOf(v) === i);
  return { html, header: header(), map, ids };
}
