// Beats: every interactive piece on the inner pages is a .beat, a section
// taller than its .beat__pin, which sticks under the masthead while the
// page scrolls through the extra height (a page's opening piece,
// .beat--open, already sits under the masthead and sticks at the very top).
// While it holds, scroll drives the control (drive(t, still, at), t 0..1):
// the slider travels, the ring turns, the iris closes. A beat with several
// states (stops: N) rests at each of them for a stretch of scroll and
// glides between them (t = i / (N - 1) at stop i; at.stop says which).
// At the last stop the beat says "Your turn" and the handle pulses once;
// untouched for 4 s more, it nudges once. The first touch hands the
// control to the visitor and scroll stops driving it.
//
// A fair stop, never a trap: nothing blocks scrolling and the pin only
// holds for its stops. When scrolling stops just short of a beat (going
// down) it eases the last bit; inside a beat it settles on the nearest stop
// in the direction of travel; a flick that runs over a beat's start and
// past its end comes back to land on it, once (never after the visitor has
// reached its last stop or touched it). A pin that would not fit the
// screen stays in the flow and plays as it passes. With reduced motion
// nothing pins, drives, snaps or nudges: each control waits at its middle
// value with its cue.
//
// "n of m tried": each route counts the pieces marked data-try="key" and
// the ones the visitor has used (tried(key)).
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const beats = [];
let pressed = false;
addEventListener('pointerdown', () => { pressed = true; }, true);
addEventListener('pointerup', () => { pressed = false; });
addEventListener('pointercancel', () => { pressed = false; });
const route = () => root.dataset.route;
const routeOf = (el) => (el.closest('.route') || {}).id;
let head = 64;

export function addBeat(el, { drive, key, mid = 0.5, stops = 1, hold, rest = 1, glide = 0.9, glides } = {}) {
  const b = { el, pin: el.querySelector('.beat__pin'), drive, key: key || el.dataset.try || el.dataset.beat, mine: false, cued: false, nudged: false, timer: 0, flow: false, p: -1, mid, landed: false };
  // The stops along the hold: [start, end] of each rest, as shares of it.
  b.stops = stops;
  b.hold = hold ?? (stops > 1 ? 0.7 * stops : 0.9);
  const g = (i) => (glides && glides[i] != null ? glides[i] : glide);
  const rs = (i) => (Array.isArray(rest) ? rest[i] ?? 1 : rest);
  let total = 0;
  for (let i = 0; i < stops; i++) total += rs(i) + (i < stops - 1 ? g(i) : 0);
  b.rests = [];
  let at = 0;
  for (let i = 0; i < stops; i++) { b.rests.push([at / total, (at + rs(i)) / total]); at += rs(i) + (i < stops - 1 ? g(i) : 0); }
  if (!el.dataset.try) el.dataset.try = b.key;
  el.__beat = b;
  beats.push(b);
  if (b.pin) ro.observe(b.pin);
  if (reduce.matches) { el.classList.add('is-turn'); if (drive) drive(mid, true); }
  layout();
  return {
    // The visitor touched it: scroll stops driving, the cue goes.
    mine() {
      if (b.mine) return;
      b.mine = true; clearTimeout(b.timer);
      tried(b.key, el);
      // The cue goes once the press ends: dropping the "Your turn" pill
      // mid-press would move what is under the finger and lose the tap.
      const apply = () => { el.classList.add('is-mine'); el.classList.remove('is-nudge'); };
      if (!pressed) return apply();
      const done = () => { removeEventListener('pointerup', done, true); removeEventListener('pointercancel', done, true); setTimeout(apply, 0); };
      addEventListener('pointerup', done, true); addEventListener('pointercancel', done, true);
    },
    get isMine() { return b.mine; },
  };
}

// ------------------------------------------------------------- layout
function measureHead() { const m = document.querySelector('.masthead'); head = m ? m.offsetHeight : 64; }
const topOf = (b) => (b.open ? 0 : head);
function layout() {
  measureHead();
  const vh = innerHeight;
  for (const b of beats) {
    if (!b.pin || routeOf(b.el) !== route()) continue;
    b.open = b.el.classList.contains('beat--open');
    // Measured as it would pin; its height stays meanwhile, so nothing
    // above or below moves while the beats are measured.
    b.el.classList.remove('beat--flow');
    // Growing a little into its own bottom padding (kept clear for the
    // tier badge) still pins; past that it plays in the flow.
    const pb = parseFloat(getComputedStyle(b.pin).paddingBottom) || 0;
    b.flow = reduce.matches || b.pin.offsetHeight > vh - topOf(b) + 2 + Math.max(0, Math.min(32, pb - 24));
    b.el.classList.toggle('beat--flow', b.flow);
    // The pin, then the scroll it holds for (its stops).
    b.el.style.height = b.flow ? '' : `${b.pin.offsetHeight + Math.round(vh * b.hold)}px`;
    b.p = -1;
  }
  tick();
}

// --------------------------------------------------------------- scroll
let raf = 0;
function tick() {
  raf = 0;
  if (reduce.matches) return;
  const vh = innerHeight, r = route();
  for (const b of beats) {
    if (routeOf(b.el) !== r) continue;
    const box = b.el.getBoundingClientRect();
    if (box.bottom < -vh || box.top > vh * 2) continue;
    let p;
    // In the flow: from its top passing 70% of the screen to its bottom
    // coming into view (an opening piece: from the top of the page).
    if (b.flow && b.open) p = -box.top / Math.max(200, box.height - vh * 0.5);
    else if (b.flow) p = (vh * 0.7 - box.top) / Math.max(200, vh * 0.7 - (vh - box.height));
    else p = (topOf(b) - box.top) / Math.max(1, b.el.offsetHeight - b.pin.offsetHeight);
    p = Math.min(1, Math.max(0, p));
    if (p === b.p) continue;
    b.p = p;
    const d = dwell(b, p);
    if (!b.mine && b.drive) b.drive(d.t, false, d);
    if (!b.cued && d.last) cue(b);
  }
}
// Scroll progress -> the control's value: resting at each stop, gliding
// (eased) between them. One stop: a plain eased sweep, cue near the end.
const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
function dwell(b, p) {
  const N = b.stops;
  if (N <= 1) return { t: smooth(0.06, 0.72, p), stop: 0, last: p >= 0.74 };
  for (let i = 0; i < N; i++) {
    const [a, z] = b.rests[i];
    if (p <= z) {
      if (p >= a || i === 0) return { t: i / (N - 1), stop: i, last: i === N - 1 };
      const prev = b.rests[i - 1][1], u = (p - prev) / (a - prev);
      return { t: (i - 1 + easeInOut(u)) / (N - 1), stop: i - 1, glide: u, last: false };
    }
  }
  return { t: 1, stop: N - 1, last: true };
}
const schedule = () => { if (!raf) raf = requestAnimationFrame(tick); };

function cue(b) {
  b.cued = true;
  if (b.mine) return;
  b.el.classList.add('is-turn');
  // One gentle nudge if still untouched 4 s later and in view. No loops.
  b.timer = setTimeout(() => {
    const r = b.el.getBoundingClientRect();
    if (b.mine || b.nudged || r.bottom < head || r.top > innerHeight) return;
    b.nudged = true;
    b.el.classList.add('is-nudge');
  }, 4000);
}

// ----------------------------------------------------------------- snap
let lastY = scrollY, dir = 0, idle = 0, touching = false, snapping = 0, gStart = scrollY, lastEvent = 0;
function glideTo(y) {
  const lenis = window.__kessel && window.__kessel.lenis;
  snapping = performance.now() + 900;
  if (lenis && !lenis.isStopped) lenis.scrollTo(y, { duration: 0.7 });
  else window.scrollTo({ top: y, behavior: 'smooth' });
}
const spanOf = (b, y) => ({ top: b.el.getBoundingClientRect().top + y - topOf(b), span: b.el.offsetHeight - b.pin.offsetHeight });
function snap() {
  if (reduce.matches) return;
  const vh = innerHeight, r = route(), y = scrollY;
  // Resting at its last stop (or on past it, within it), or brought back to
  // its start by a flick: seen.
  for (const b of beats) {
    if (b.flow || routeOf(b.el) !== r) continue;
    const { top, span } = spanOf(b, y);
    if (span > 0 && ((y >= top + b.rests[b.stops - 1][0] * span - 2 && y <= top + span + 2) || (b.tries && Math.abs(y - top) < 4))) b.landed = true;
  }
  if (touching || performance.now() < snapping) return;
  for (const b of beats) {
    if (b.flow || routeOf(b.el) !== r) continue;
    const { top, span } = spanOf(b, y);
    if (span <= 0) continue;
    // A flick that ran over this beat's start and past its end lands on it
    // (once, with one retry if more scrolling cut the glide short; never
    // after the visitor has seen its last stop or touched it).
    if (!b.open && !b.landed && !b.mine && dir > 0 && gStart < top - 2 && y > top + span && y < top + span + 1.5 * vh && (b.tries || 0) < 2) {
      b.tries = (b.tries || 0) + 1; glideTo(top); return;
    }
    // Stopping just short of it on the way down eases the last bit.
    if (!b.open && dir > 0 && top - y > 3 && top - y < vh * 0.22) { glideTo(top); return; }
    // Inside it: settle on the nearest stop in the direction of travel.
    if (b.stops > 1 && y > top + 2 && y < top + span - 2) {
      const p = (y - top) / span;
      const centres = b.rests.map(([a, z]) => (a + z) / 2);
      const step = 1 / Math.max(1, b.stops - 1);
      let best = null;
      for (const c of centres) {
        const d = c - p;
        if ((dir > 0 && d >= -0.02) || (dir < 0 && d <= 0.02)) if (Math.abs(d) < step * 0.4 && (best === null || Math.abs(d) < Math.abs(best - p))) best = c;
      }
      if (best !== null && Math.abs(best - p) * span > 4) { glideTo(top + best * span); return; }
    }
  }
}
addEventListener('scroll', () => {
  const y = scrollY, now = performance.now();
  if (now - lastEvent > 250) gStart = lastY;
  lastEvent = now;
  if (y !== lastY) dir = y > lastY ? 1 : -1;
  lastY = y;
  schedule();
  clearTimeout(idle);
  idle = setTimeout(snap, 160);
}, { passive: true });
addEventListener('touchstart', () => { touching = true; }, { passive: true });
addEventListener('touchend', () => { touching = false; clearTimeout(idle); idle = setTimeout(snap, 220); }, { passive: true });
addEventListener('resize', () => { layout(); });
// A pin that changes size (a toggle opened inside it, the whole street;
// fonts arriving) is laid out again, keeping it where it is on the screen:
// grown past the screen it drops into the flow rather than run off the
// bottom, and back it pins again.
const sizes = new WeakMap();
const ro = new ResizeObserver((es) => {
  for (const e of es) {
    const b = beats.find((x) => x.pin === e.target);
    const hgt = Math.round(e.contentRect.height), was = sizes.get(e.target);
    sizes.set(e.target, hgt);
    if (!b || was === undefined || Math.abs(hgt - was) < 2 || routeOf(b.el) !== route() || reduce.matches) continue;
    const before = b.pin.getBoundingClientRect().top;
    layout();
    const shift = b.pin.getBoundingClientRect().top - before;
    if (Math.abs(shift) < 1) continue;
    const lenis = window.__kessel && window.__kessel.lenis, y = scrollY + shift;
    snapping = performance.now() + 400;
    if (lenis) { lenis.resize(); lenis.scrollTo(y, { immediate: true, force: true }); } else window.scrollTo(0, y);
  }
});
addEventListener('kessel:route', () => { requestAnimationFrame(() => { layout(); paintTried(); }); });
reduce.addEventListener('change', () => location.reload());

// ---------------------------------------------------------------- tried
const done = {};
let pill = null;
function paintTried() {
  const r = route(), sec = document.getElementById(r);
  const keys = sec ? [...new Set([...sec.querySelectorAll('[data-try]')].map((e) => e.dataset.try))] : [];
  if (!pill) {
    pill = document.createElement('p');
    pill.className = 'tried';
    pill.setAttribute('aria-live', 'polite');
    document.body.appendChild(pill);
  }
  // A count of one says nothing: pages with a single control show no pill.
  if (keys.length <= 1) { pill.hidden = true; return; }
  const n = keys.filter((k) => done[r] && done[r].has(k)).length;
  pill.hidden = false;
  pill.innerHTML = `<span class="tried__dots" aria-hidden="true">${keys.map((k) => `<i${done[r] && done[r].has(k) ? ' class="on"' : ''}></i>`).join('')}</span><span class="tried__t"><b>${n}</b><span class="tried__long"> of ${keys.length} tried</span><span class="tried__short">/${keys.length} tried</span></span>`;
  pill.classList.toggle('is-all', n === keys.length);
}
export const refreshTried = () => paintTried();
export function tried(key, el) {
  const r = (el && routeOf(el)) || route();
  (done[r] = done[r] || new Set()).add(key);
  if (r === route()) paintTried();
}
// Buttons, links, inputs and canvases inside a data-try piece count as
// trying it; controls built on src/site/ctl.js call tried() themselves.
const mark = (e) => {
  const t = e.target.closest && e.target.closest('[data-try]');
  if (t && e.target.closest('button, a, input, summary, canvas, [role="slider"], .fov__r')) tried(t.dataset.try, t);
};
document.addEventListener('click', mark);
document.addEventListener('input', mark);
document.addEventListener('pointermove', (e) => { if (e.buttons && e.target.tagName === 'CANVAS') mark(e); }, { passive: true });

// Pieces that are not beats (the turning lens in a hero): one nudge if
// untouched 4 s after they come into view.
const io = new IntersectionObserver((es) => {
  for (const e of es) {
    const el = e.target;
    clearTimeout(el._nudge);
    if (!e.isIntersecting || reduce.matches) continue;
    el._nudge = setTimeout(() => {
      const r = routeOf(el), k = el.dataset.try;
      if (done[r] && done[r].has(k)) return;
      el.classList.add('is-nudge');
    }, 4000);
  }
}, { threshold: 0.6 });
export function watchTry(el) { io.observe(el); }

requestAnimationFrame(() => { layout(); paintTried(); });
