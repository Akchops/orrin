// Beats: every interactive piece on the inner pages is a .beat, a section
// one screen taller than its .beat__pin, which sticks under the masthead
// while the page scrolls through that extra screen. While it holds, scroll
// drives the control (drive(t), t 0..1): the slider travels, the ring
// turns, the iris closes. Near the end the beat says "Your turn" and the
// handle pulses once; untouched for 4 s more, it nudges once. The first
// touch hands the control to the visitor and scroll stops driving it.
//
// Never a trap: nothing blocks scrolling, the pin only holds for one
// screen, and the snap is soft: when scrolling down stops just short of a
// beat it eases the last bit; scrolling up never snaps. A pin that would
// not fit the screen (a phone on its side) stays in the flow and plays as
// it passes. With reduced motion nothing pins, drives, snaps or nudges:
// each control waits at its middle value with its cue.
//
// "n of m tried": each route counts the pieces marked data-try="key" and
// the ones the visitor has used (tried(key)).
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const beats = [];
const route = () => root.dataset.route;
const routeOf = (el) => (el.closest('.route') || {}).id;
let head = 64;

export function addBeat(el, { drive, key, mid = 0.5 } = {}) {
  const b = { el, pin: el.querySelector('.beat__pin'), drive, key: key || el.dataset.try || el.dataset.beat, mine: false, cued: false, nudged: false, timer: 0, flow: false, p: -1, mid };
  if (!el.dataset.try) el.dataset.try = b.key;
  beats.push(b);
  if (reduce.matches) { el.classList.add('is-turn'); if (drive) drive(mid, true); }
  layout();
  return {
    // The visitor touched it: scroll stops driving, the cue goes.
    mine() {
      if (b.mine) return;
      b.mine = true; clearTimeout(b.timer);
      el.classList.add('is-mine'); el.classList.remove('is-nudge');
      tried(b.key, el);
    },
    get isMine() { return b.mine; },
  };
}

// ------------------------------------------------------------- layout
function measureHead() { const m = document.querySelector('.masthead'); head = m ? m.offsetHeight : 64; }
function layout() {
  measureHead();
  const vh = innerHeight;
  for (const b of beats) {
    if (!b.pin || routeOf(b.el) !== route()) continue;
    b.el.classList.remove('beat--flow');
    b.flow = reduce.matches || b.pin.offsetHeight > vh - head + 2;
    b.el.classList.toggle('beat--flow', b.flow);
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
    // coming into view.
    if (b.flow) p = (vh * 0.7 - box.top) / Math.max(200, vh * 0.7 - (vh - box.height));
    else p = (head - box.top) / Math.max(1, b.el.offsetHeight - b.pin.offsetHeight);
    p = Math.min(1, Math.max(0, p));
    if (p === b.p) continue;
    b.p = p;
    if (!b.mine && b.drive) b.drive(smooth(0.06, 0.72, p), false);
    if (!b.cued && p >= 0.74) cue(b);
  }
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
let lastY = scrollY, dir = 0, idle = 0, touching = false, snapping = 0;
function snap() {
  if (reduce.matches || touching || dir <= 0 || performance.now() < snapping) return;
  const vh = innerHeight, r = route();
  for (const b of beats) {
    if (b.flow || routeOf(b.el) !== r) continue;
    const d = b.el.getBoundingClientRect().top - head;
    if (d > 3 && d < vh * 0.2) {
      const y = scrollY + d, lenis = window.__kessel && window.__kessel.lenis;
      snapping = performance.now() + 900;
      if (lenis && !lenis.isStopped) lenis.scrollTo(y, { duration: 0.7 });
      else window.scrollTo({ top: y, behavior: 'smooth' });
      return;
    }
  }
}
addEventListener('scroll', () => {
  const y = scrollY;
  if (y !== lastY) dir = y > lastY ? 1 : -1;
  lastY = y;
  schedule();
  clearTimeout(idle);
  idle = setTimeout(snap, 160);
}, { passive: true });
addEventListener('touchstart', () => { touching = true; }, { passive: true });
addEventListener('touchend', () => { touching = false; clearTimeout(idle); idle = setTimeout(snap, 220); }, { passive: true });
addEventListener('resize', () => { layout(); });
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
  if (keys.length < 2) { pill.hidden = true; return; }
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
