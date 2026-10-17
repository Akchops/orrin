// The site shell: hash routes, the menu, copy buttons and the badge pill on
// phones. Runs before the lens bootstrap (src/app/main.js) and tells it
// about every route change with a 'kessel:route' event.
//
// Routes are plain fragment tokens (#lenses, #lens-parvati, ...), so the
// page works as one file opened from disk, offline, or inside a host that
// only passes the fragment through. Without JavaScript, CSS :target shows
// the same routes.
const root = document.documentElement;
const map = window.__kesselRoutes || {};
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const navLinks = $$('.masthead__nav a');
const menuBtn = $('.masthead__menu');

let current = null;
let lastHash = null;
// Where the page should stay anchored until the visitor scrolls: the lens
// bootstrap re-applies it after it swaps the stills for the live layout.
let anchorEl = null;

function resolve(hash) {
  let id = (hash || '').replace(/^#/, '');
  try { id = decodeURIComponent(id); } catch { /* keep as is */ }
  const routeId = map[id];
  return routeId ? { id, route: routeId } : { id: 'home', route: 'home' };
}

function scrollToY(y) {
  const lenis = window.__kessel && window.__kessel.lenis;
  if (lenis) { lenis.resize(); lenis.scrollTo(y, { immediate: true, force: true }); }
  else window.scrollTo(0, y);
}
const topOf = (el) => el.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0);

function go(hash, { initial = false } = {}) {
  lastHash = location.hash;
  const { id, route } = resolve(hash);
  const changed = route !== current;
  current = route;
  root.setAttribute('data-route', route);
  const sec = document.getElementById(route);
  if (sec && sec.dataset.title) document.title = sec.dataset.title;
  const section = route.startsWith('lens-') ? 'lenses' : route;
  navLinks.forEach((a) => (a.dataset.nav === section ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  setMenu(false);
  // Listeners run now, so the film has re-measured before we scroll.
  dispatchEvent(new CustomEvent('kessel:route', { detail: { route, initial, changed } }));

  // Where to land: an inner anchor goes to that element; a route goes to
  // its top, except home, which lands on the hero after the film when you
  // come back to it from another page. A fresh load plays the film.
  let target = null;
  if (id === 'top') target = null;
  else if (id !== route) target = document.getElementById(id);
  else if (route === 'home' && !initial) target = document.getElementById('home-hero');
  anchorEl = target;
  if (changed || target || !initial) scrollToY(target ? topOf(target) : 0);
  if (!initial) {
    const h = target ? (target.querySelector('[tabindex="-1"]') || target) : $('h1', sec);
    if (h) { if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
  past();
}

function navigate(hash) {
  try { history.pushState(null, '', hash); } catch { location.hash = hash; return; }
  go(hash);
}

// Links: anything that leaves the current route, any route link, and the
// skip-film jump are handled here. Links inside a route (the scroll cue)
// are left to the film's smooth scroll, or to the browser.
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const hash = a.getAttribute('href');
  if (a.hasAttribute('data-skip')) {
    e.preventDefault();
    const sec = document.getElementById(current);
    const h = sec && ($('h1', sec) || $('[tabindex="-1"]', sec));
    if (h) { h.focus({ preventScroll: true }); h.scrollIntoView({ block: 'center' }); }
    return;
  }
  const { id, route } = resolve(hash);
  const isRoute = id === route || id === 'top';
  if (route === current && a.hasAttribute('data-jump')) {
    // Skip film: jump without touching the address, so a reload still
    // plays the film from the start.
    e.preventDefault();
    const t = document.getElementById(id);
    if (t) {
      anchorEl = t;
      scrollToY(topOf(t));
      const h = t.querySelector('[tabindex="-1"]');
      if (h) h.focus({ preventScroll: true });
      past();
    }
    return;
  }
  if (route === current && !isRoute) return;
  e.preventDefault();
  if (hash === location.hash) go(hash); else navigate(hash);
});

addEventListener('popstate', () => { if (location.hash !== lastHash) go(location.hash); });
addEventListener('hashchange', () => { if (location.hash !== lastHash) go(location.hash); });
for (const ev of ['wheel', 'touchmove', 'keydown']) addEventListener(ev, () => { anchorEl = null; }, { passive: true });

// ---------------------------------------------------------------- menu
function setMenu(open) {
  if (!menuBtn) return;
  const was = root.classList.contains('menu-open');
  root.classList.toggle('menu-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.textContent = open ? 'Close' : 'Menu';
  if (open && !was) navLinks[0] && navLinks[0].focus();
  if (!open && was && document.activeElement && document.activeElement.closest('.masthead__nav')) menuBtn.focus();
}
if (menuBtn) {
  menuBtn.hidden = false;
  menuBtn.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); } });
  matchMedia('(min-width: 800px)').addEventListener('change', () => setMenu(false));
}

// --------------------------------------------------------- copy buttons
for (const btn of $$('[data-copy]')) {
  btn.hidden = false;
  btn.addEventListener('click', async () => {
    const text = btn.dataset.copy;
    try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied'; }
    catch {
      const span = btn.parentElement.querySelector('.selectable');
      if (span) { const r = document.createRange(); r.selectNodeContents(span); getSelection().removeAllRanges(); getSelection().addRange(r); }
      btn.textContent = 'Selected';
    }
    setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
  });
}

// ------------------------------------------------- badge pill on phones
// On narrow screens the badge is a pill in the header band; tapping it
// shows the reason underneath. The badge's own logic is untouched.
const badge = document.getElementById('tier');
const toggle = badge && $('.tier__toggle', badge);
if (toggle) {
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    const open = !badge.classList.contains('is-open');
    badge.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (e) => {
    if (badge.classList.contains('is-open') && !badge.contains(e.target)) { badge.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
  });
}

// ------------------------------------------------ past the film (home)
// The header turns solid and the skip button goes once the site has
// taken over from the film.
const after = document.getElementById('after');
let ticking = false;
function past() {
  const r = current === 'home' && after ? after.getBoundingClientRect().top : -1;
  root.classList.toggle('past-film', current !== 'home' || r < 72);
  root.classList.toggle('film-done', current !== 'home' || r < innerHeight * 0.8);
}
addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { ticking = false; past(); });
}, { passive: true });
addEventListener('resize', past, { passive: true });

window.__kesselSite = { anchor: () => anchorEl, get route() { return current; } };
go(location.hash, { initial: true });
