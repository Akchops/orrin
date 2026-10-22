// See the difference, live: each .fov[data-fov] viewer (markup from
// src/site/fov-svg.js) becomes a switcher. The screen is the street SVG
// cropped to the chosen lens's frame; switching lens glides the crop from
// one frame to the next (in focal length, so the zoom feels even) while
// the layers behind the person blur in or out. The dial runs through every
// focal length between the three. No libraries: the SVG does the drawing.
import { LENSES, AIM, WIDE_W, BLUR, WORLD, angle, fanPath } from '../app/fov.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const LOG = LENSES.map((l) => Math.log(l.mm));
const L0 = LOG[0], L1 = LOG[LOG.length - 1];
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Piecewise in log focal length between the three lenses.
function between(lm, list) {
  if (lm <= LOG[0]) return list[0];
  for (let i = 0; i < LOG.length - 1; i++) {
    if (lm <= LOG[i + 1]) { const f = (lm - LOG[i]) / (LOG[i + 1] - LOG[i]); return list[i] + (list[i + 1] - list[i]) * f; }
  }
  return list[list.length - 1];
}
const aimX = LENSES.map((l) => AIM[l.id][0]), aimY = LENSES.map((l) => AIM[l.id][1]);
function frameAt(lm) {
  const mm = Math.exp(lm), w = WIDE_W * LENSES[0].mm / mm, cx = between(lm, aimX), cy = between(lm, aimY);
  return { x: cx - w / 2, y: cy - w / 3, w, h: w / 1.5 };
}
const nearest = (lm) => LENSES.reduce((b, l, i) => (Math.abs(LOG[i] - lm) < Math.abs(LOG[b] - lm) ? i : b), 0);

function enhance(root) {
  if (root.dataset.live) return;
  root.dataset.live = '1';
  const id = root.id;
  const still = root.querySelector('.fov__still');
  const veil = root.querySelector('.fov__veil');
  const blurs = Object.fromEntries(Object.keys(BLUR).map((k) => [k, document.querySelector(`#${id}-l${k} feGaussianBlur`)]));
  // The screen's layers take the live blurs instead of the fixed ones.
  for (const u of still.querySelectorAll('use')) {
    const k = (u.getAttribute('href') || '').split('-').pop();
    if (BLUR[k]) u.setAttribute('filter', `url(#${id}-l${k})`); else u.removeAttribute('filter');
  }
  const hudName = root.querySelector('.fov__hud-name'), hudRole = root.querySelector('.fov__hud-role');
  const hudMm = root.querySelector('.fov__hud-mm'), hudDeg = root.querySelector('.fov__hud-deg');
  const fan = root.querySelector('.fov__fan-wedge'), aovDeg = root.querySelector('.fov__aov-deg');
  const sayName = root.querySelector('.fov__say-name'), sayText = root.querySelector('.fov__say-text');
  const liveEl = root.querySelector('.fov__live');
  const dial = root.querySelector('.fov__dial'), input = root.querySelector('.fov__mm-in');

  // The legend's lenses become buttons.
  const btns = [...root.querySelectorAll('.fov__lens')].map((li) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'fov__btn'; b.dataset.lens = li.dataset.lens;
    b.append(...li.childNodes);
    li.append(b);
    b.addEventListener('click', () => go(LENSES.findIndex((l) => l.id === b.dataset.lens)));
    return b;
  });
  root.querySelectorAll('.fov__r').forEach((r) => r.addEventListener('click', () => go(LENSES.findIndex((l) => l.id === r.dataset.lens))));

  let lm = LOG[Math.max(0, LENSES.findIndex((l) => l.id === root.dataset.fov))], shown = -1, anim = 0;
  function draw() {
    const f = frameAt(lm);
    still.setAttribute('viewBox', `${f.x.toFixed(2)} ${f.y.toFixed(2)} ${f.w.toFixed(2)} ${f.h.toFixed(2)}`);
    for (const k of Object.keys(BLUR)) blurs[k] && blurs[k].setAttribute('stdDeviation', between(lm, BLUR[k]).toFixed(2));
    // The overview: everything outside the frame veiled.
    veil.setAttribute('d', `M-1 -1H${WORLD.w + 1}V${WORLD.h + 1}H-1Z M${f.x.toFixed(1)} ${f.y.toFixed(1)}v${f.h.toFixed(1)}h${f.w.toFixed(1)}v${(-f.h).toFixed(1)}Z`);
    const mm = Math.exp(lm);
    hudMm.textContent = Math.round(mm);
    const deg = angle(mm);
    hudDeg.textContent = Math.round(deg) + '°';
    aovDeg.textContent = Math.round(deg) + '°';
    fan.setAttribute('d', fanPath(deg));
    input.value = Math.round(((lm - L0) / (L1 - L0)) * 1000);
    const n = nearest(lm);
    if (n !== shown) {
      shown = n;
      const l = LENSES[n];
      root.dataset.lens = l.id;
      hudName.textContent = l.name; hudRole.textContent = l.role;
      sayName.textContent = l.name; sayText.textContent = l.sees;
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lens === l.id)));
    }
  }
  function go(i, { announce = true } = {}) {
    if (i < 0) return;
    cancelAnimationFrame(anim);
    const from = lm, to = LOG[i], t0 = performance.now(), dur = reduce.matches ? 0 : 700 + 300 * Math.abs(to - from);
    const step = (now) => {
      const t = dur ? Math.min(1, (now - t0) / dur) : 1;
      lm = from + (to - from) * ease(t);
      draw();
      if (t < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
    if (announce) { const l = LENSES[i]; liveEl.textContent = `${l.name}, ${l.mm} mm, ${l.deg}° angle of view: ${l.sees}`; }
  }
  // The dial: any focal length between the three; let go near one and it
  // settles on it.
  input.addEventListener('input', () => { cancelAnimationFrame(anim); lm = L0 + (L1 - L0) * (+input.value / 1000); draw(); });
  input.addEventListener('change', () => {
    const n = nearest(lm);
    if (Math.abs(LOG[n] - lm) < 0.12) go(n, { announce: false });
    const l = LENSES[nearest(lm)];
    liveEl.textContent = `${Math.round(Math.exp(lm))} mm, ${Math.round(angle(Math.exp(lm)))}° angle of view, nearest ${l.name}.`;
  });
  dial.hidden = false;
  draw();
  root.classList.add('is-live');
  // For the page's beats (src/site/lab.js): scroll sweeps the focal length,
  // t 0..1 from the widest to the longest.
  root.__fov = {
    scrub(t) { cancelAnimationFrame(anim); lm = L0 + (L1 - L0) * Math.min(1, Math.max(0, t)); draw(); },
    go,
  };
}

export function startFov(scope = document) {
  scope.querySelectorAll('.fov[data-fov]').forEach(enhance);
}
