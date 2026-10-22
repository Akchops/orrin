// The lens pages' experiences, live (markup from src/site/lab-svg.js):
//   focus     the ring racks focus down the street (blur per layer)
//   aperture  the slider closes the iris (the drawing, and the 3D lens when
//             it is live) and the lights behind turn to discs and back
//   sees      "See the difference", the dial swept by scroll
// and on the Lenses page the compare strip (one slider, three irises) and
// the tint: hover or tap a lens and the page leans toward its colour.
// Each is a beat (src/site/beats.js): scroll plays it until it is touched.
import { LENSES } from '../app/fov.js';
import { control, animate } from './ctl.js';
import { addBeat, watchTry, tried, refreshTried } from './beats.js';
import {
  TARGETS, N_MIN, nAt, nLabel, openAt, metresAt, throwAt, metres, feet, coc, irisPaths, discPath, discD,
  layerBlurs, discs, bokehBox, frameW, RING_W, BOKEH_FOCUS, DEPTH,
} from './lab-math.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const q = (n) => (Math.round(n * 10) / 10).toFixed(1);
const put = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };

// Layer blur filters in one street picture, set only when they change.
function blurrer(svg) {
  const f = {};
  // Filter ids end -b<layer> (src/site/lab-svg.js).
  for (const fe of svg.querySelectorAll('filter')) f[fe.id.replace(/^.*-b/, '')] = fe.querySelector('feGaussianBlur');
  return (blurs) => { for (const k in blurs) { const g = f[k], v = q(blurs[k]); if (g && g.getAttribute('stdDeviation') !== v) g.setAttribute('stdDeviation', v); } };
}

// ----------------------------------------------------------- focus pull
function focusBeat(el) {
  const i = +el.dataset.lens, slug = el.dataset.slug, lens = LENSES[i];
  const svg = el.querySelector('.lab__street'), blur = blurrer(svg);
  const ring = el.querySelector('.ring'), strip = el.querySelector('.ring__strip');
  const outM = el.querySelector('.lab__m'), outFt = el.querySelector('.lab__ft'), outIn = el.querySelector('.lab__in');
  const chips = [...el.querySelectorAll('.lab__targets .chip')];
  const pins = Object.fromEntries([...el.querySelectorAll('.lab__mark[data-key]')].map((p) => [p.dataset.key, p]));
  const tpos = TARGETS.map((t) => throwAt(t.m, i));
  let cancel = null;

  function render(f) {
    const s = metresAt(f, i);
    blur(layerBlurs(lens, slug, s, N_MIN));
    strip.setAttribute('transform', `translate(${(-f * RING_W).toFixed(1)} 0)`);
    put(outM, metres(s)); put(outFt, feet(s));
    // The sharpest of the three, by how far its blur is from none.
    const b = TARGETS.map((t) => coc(lens.mm, N_MIN, s, t.m === Infinity ? DEPTH.far : t.m));
    const best = b.indexOf(Math.min(...b));
    const sharp = b[best] * frameW(slug) * 3 < 1.2;
    // Otherwise, which two it lies between (the throw runs near to far as
    // f falls).
    let j = 0;
    while (j < tpos.length - 2 && f < tpos[j + 1]) j++;
    put(outIn, sharp ? `${TARGETS[best].label} in focus` : `Between ${TARGETS[j].label.toLowerCase()} and ${TARGETS[j + 1].label.toLowerCase()}`);
    TARGETS.forEach((t, j) => { if (pins[t.key]) pins[t.key].classList.toggle('is-sharp', sharp && j === best); });
    chips.forEach((c, j) => c.setAttribute('aria-pressed', String(Math.abs(tpos[j] - f) < 0.01)));
    ring.setAttribute('aria-valuenow', String(Math.round(f * 100)));
    ring.setAttribute('aria-valuetext', `${metres(s)}, ${feet(s)}`);
  }
  const c = control(ring, {
    kind: 'ring', value: +ring.dataset.f || 0, step: 0.02,
    px: () => ring.getBoundingClientRect().width * RING_W / 340,
    onInput: (f, user) => { if (user && cancel) { cancel(); cancel = null; } render(f); },
    onTouch: () => beat.mine(),
  });
  chips.forEach((ch, j) => ch.addEventListener('click', () => {
    beat.mine(); c.touch();
    if (cancel) cancel();
    cancel = animate(c.value, tpos[j], reduce.matches ? 0 : 700, (f) => c.set(f));
  }));
  // Scroll: scooter, then the person, then the fort, with a breath at each.
  const path = (t) => {
    const [a, b2, d] = tpos;
    const seg = (x0, x1, u) => x0 + (x1 - x0) * (u < 0 ? 0 : u > 1 ? 1 : u * u * (3 - 2 * u));
    return t < 0.45 ? seg(a, b2, (t - 0.12) / 0.3) : seg(b2, d, (t - 0.58) / 0.32);
  };
  const beat = addBeat(el, { drive: (t, still) => c.set(still ? tpos[1] : path(t)), mid: 0.5 });
  render(c.value);
}

// ------------------------------------------------------ aperture, bokeh
function irisUpdater(svg) {
  const blades = svg.querySelector('.lf__blades'), edges = svg.querySelector('.lf__edges'), light = svg.querySelector('.lf__light');
  return (a) => {
    const p = irisPaths(a, { field: 47, ap: 44 });
    blades.setAttribute('d', p.field); edges.setAttribute('d', p.edges);
    if (light) light.style.opacity = (0.4 + 0.6 * a).toFixed(2);
  };
}
function apertureBeat(el) {
  const i = +el.dataset.lens, slug = el.dataset.slug, lens = LENSES[i];
  const svg = el.querySelector('.lab__street'), blur = blurrer(svg);
  const front = el.querySelector('.lab__front'), iris = irisUpdater(front.querySelector('.lab__iris-svg'));
  const discEls = [...el.querySelectorAll('.lab__disc')];
  const slider = el.querySelector('.slider'), fill = slider.querySelector('.slider__fill');
  const outN = el.querySelector('.lab__n'), outOpen = el.querySelector('.lab__open');
  const vb = bokehBox(slug);
  function render(t) {
    const N = nAt(t), a = openAt(N);
    iris(a);
    if (front.__lensSet) front.__lensSet({ iris: Math.max(0.05, a) });
    blur(layerBlurs(lens, slug, BOKEH_FOCUS, N));
    discs(lens, slug, N, vb).forEach(({ p, r, k, alpha }, j) => {
      const d = discEls[j];
      if (!d) return;
      d.setAttribute('d', discPath(p.x, p.y, r, k));
      d.style.opacity = String(alpha);
    });
    fill.style.width = `${(t * 100).toFixed(1)}%`;
    slider.style.setProperty('--t', t.toFixed(3));
    const label = `T${nLabel(N)}`;
    put(outN, label);
    put(outOpen, t < 0.03 ? 'Wide open' : t > 0.97 ? 'Stopped right down' : 'Stopping down');
    slider.setAttribute('aria-valuenow', String(Math.round(t * 100)));
    slider.setAttribute('aria-valuetext', `${label}${t < 0.03 ? ', wide open' : ''}`);
  }
  const c = control(slider, { value: 0, onInput: (t) => render(t), onTouch: () => beat.mine() });
  const beat = addBeat(el, { drive: (t, still) => c.set(still ? 0.5 : t), mid: 0.5 });
  // The 3D lens takes the iris as it goes live.
  addEventListener('kessel:viewer', () => requestAnimationFrame(() => render(c.value)));
  render(c.value);
}

// --------------------------------------------------- see the difference
function seesBeat(el) {
  const fov = el.querySelector('.fov');
  if (!fov) return;
  const own = Math.max(0, LENSES.findIndex((l) => l.id === fov.dataset.fov));
  let beat = null;
  const ready = () => {
    if (!fov.__fov) return requestAnimationFrame(ready);
    const L0 = Math.log(LENSES[0].mm), L1 = Math.log(LENSES[2].mm), Lo = Math.log(LENSES[own].mm);
    const norm = (l) => (l - L0) / (L1 - L0);
    // Scroll: through all three focal lengths, then home to this lens.
    const path = (t) => (t < 0.55 ? norm(L0) + (1 - norm(L0)) * Math.min(1, t / 0.5) : 1 + (norm(Lo) - 1) * Math.min(1, (t - 0.55) / 0.35));
    beat = addBeat(el, { drive: (t, still) => fov.__fov.scrub(still ? norm(Lo) : path(t)), mid: 0.5 });
    fov.addEventListener('pointerdown', (e) => { if (e.target.closest('button, input, .fov__r')) beat.mine(); });
    fov.addEventListener('keydown', (e) => { if (e.target.closest('button, input')) beat.mine(); });
  };
  ready();
}

// --------------------------------------------------------- compare strip
function compareBeat(el) {
  const cells = [...el.querySelectorAll('.cmp__cell')].map((c) => ({
    i: +c.dataset.lens, iris: irisUpdater(c.querySelector('.cmp__iris')), disc: c.querySelector('.cmp__disc path'),
  }));
  const slider = el.querySelector('.slider'), fill = slider.querySelector('.slider__fill'), outN = el.querySelector('.cmp__n');
  const slugs = ['shaniwar', 'parvati', 'sinhagad'];
  function render(t) {
    const N = nAt(t), a = openAt(N);
    for (const c of cells) {
      c.iris(a);
      const d = discD(coc(LENSES[c.i].mm, N, BOKEH_FOCUS, DEPTH.mid), frameW(slugs[c.i])) / frameW(slugs[c.i]) * 100;
      c.disc.setAttribute('d', discPath(0, 0, Math.min(11, Math.max(0.8, d * 1.2)), 0));
    }
    fill.style.width = `${(t * 100).toFixed(1)}%`;
    slider.style.setProperty('--t', t.toFixed(3));
    put(outN, `T${nLabel(N)}`);
    slider.setAttribute('aria-valuenow', String(Math.round(t * 100)));
    slider.setAttribute('aria-valuetext', `T${nLabel(N)}`);
  }
  const c = control(slider, { value: 0, onInput: (t) => render(t), onTouch: () => beat.mine() });
  const beat = addBeat(el, { drive: (t, still) => c.set(still ? 0.5 : t), mid: 0.5 });
  render(0);
}

// ------------------------------------------------ Contact: which lens?
function contactPick(el) {
  const chips = [...el.querySelectorAll('.chip')];
  const fig = el.querySelector('.ct-pick__mail'), subj = el.querySelector('.ct-pick__subj');
  const body = el.querySelector('.ct-pick__body'), go = el.querySelector('.ct-pick__go');
  const to = (go.getAttribute('href') || '').replace(/^mailto:/, '').split('?')[0];
  let cur = -1;
  function choose(i) {
    if (i === cur) return;
    cur = i;
    const c = chips[i], name = c.dataset.lens;
    chips.forEach((x, j) => x.setAttribute('aria-pressed', String(j === i)));
    const s = name ? `Enquiry: ${name} (${c.dataset.mm})` : 'Enquiry from the Kessel site';
    const b = name ? `Hello, I would like to know more about ${name}, the ${c.dataset.role} lens.` : 'Hello, I would like to know more about your lenses.';
    put(subj, s); put(body, b);
    go.href = `mailto:${to}?subject=${encodeURIComponent(s)}&body=${encodeURIComponent(b)}`;
    if (name) { fig.dataset.lens = name; fig.dataset.band = c.dataset.band; } else { delete fig.dataset.lens; delete fig.dataset.band; }
  }
  chips.forEach((c, i) => c.addEventListener('click', () => { beat.mine(); choose(i); }));
  // Scroll: through the three lenses; reduced motion waits on "Not sure".
  const beat = addBeat(el, { drive: (t, still) => choose(still || t < 0.08 ? chips.length - 1 : Math.min(2, Math.floor(((t - 0.08) / 0.84) * 3))) });
  choose(chips.length - 1);
}

// ------------------------------------------------- the Lenses page tint
function tint(page) {
  const lx = page.querySelector('.lx');
  if (!lx) return;
  const set = (band) => { if (band) lx.dataset.tint = band; else delete lx.dataset.tint; };
  for (const a of page.querySelectorAll('.lx-lens')) {
    a.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { set(a.dataset.band); tried('pick', a); } });
    a.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') set(null); });
    a.addEventListener('focusin', () => set(a.dataset.band));
    // A tap on the picture (not the link) picks the lens: tint and preview.
    a.querySelector('.lx-lens__fig').addEventListener('click', () => {
      const on = lx.dataset.tint === a.dataset.band && a.classList.contains('is-picked');
      page.querySelectorAll('.lx-lens.is-picked').forEach((x) => x.classList.remove('is-picked'));
      if (!on) a.classList.add('is-picked');
      set(on ? null : a.dataset.band);
      tried('pick', a);
    });
  }
}

export function startLab() {
  document.querySelectorAll('.lab--focus').forEach(focusBeat);
  document.querySelectorAll('.lab--ap').forEach(apertureBeat);
  document.querySelectorAll('.lab--sees').forEach(seesBeat);
  document.querySelectorAll('.cmp').forEach(compareBeat);
  document.querySelectorAll('.ct-pick').forEach(contactPick);
  const lensesPage = document.getElementById('lenses');
  if (lensesPage) tint(lensesPage);
  // A 3D viewer is something to try only once it is live (the still is
  // not): its stage joins the count then.
  const live = () => {
    for (const v of document.querySelectorAll('[data-viewer].is-live:not([data-pose])')) {
      const stage = v.closest('.lens__stage, .lx-hero__stage');
      if (stage && !stage.dataset.try) { stage.dataset.try = 'turn'; watchTry(stage); }
    }
    refreshTried();
  };
  addEventListener('kessel:viewer', () => requestAnimationFrame(live));
}
