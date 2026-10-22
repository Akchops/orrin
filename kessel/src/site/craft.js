// Craft, live: the drawing of the lens on the bench (markup from
// src/site/craft-svg.js) becomes a stepper. The page is built showing the
// finished lens with the five stages as a list, which is what shows
// without JS; this shows the stage buttons and the slider, starts the
// drawing at the first stage and keeps the buttons, the slider, the frame's
// readout and the caption in step. Entering the iris stage closes the
// eleven blades and opens them half way, the light through the lens
// narrowing with them; entering the signing draws the signature with the
// pen. With reduced motion every change is instant and nothing moves.
import { irisFace, irisSide, rayClears, IRIS } from '../app/craft-lens.js';
import { addBeat } from './beats.js';

const root = document.getElementById('craft-build');

if (root) {
  const $ = (s) => root.querySelector(s);
  const svg = $('.ck');
  const ctl = $('.ckx__ctl'), say = $('.ckx__say');
  const steps = [...root.querySelectorAll('.ckx__step')];
  const range = $('.ckx__range');
  const N = steps.length;
  const names = steps.map((b) => b.querySelector('.ckx__name').textContent.trim());
  const nos = steps.map((b) => b.querySelector('.ckx__no').textContent.trim());
  const items = [...root.querySelectorAll('.ckx__li')];
  const texts = items.map((li) => li.querySelector('.ckx__li-t').textContent.trim());
  const ids = items.map((li) => li.id);
  const out = { readNo: $('.ckx__read-no'), readName: $('.ckx__read-name'), sayNo: $('.ckx__say-no'), sayName: $('.ckx__say-name'), sayText: $('.ckx__say-t') };
  const field = svg.querySelector('.ck-iris-field'), edges = svg.querySelector('.ck-iris-edges'), side = svg.querySelector('.ck-iris-side');
  const raysB = [...svg.querySelectorAll('.ck-ray-b')];
  const sig = [...svg.querySelectorAll('.ck-sig')];
  const pen = svg.querySelector('.ck-p--pen > g');
  const penRest = pen ? pen.getAttribute('transform') : '';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const put = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
  let stage = 0, open = IRIS.open, raf = 0;

  // ------------------------------------------------------------ the iris
  function setIris(a) {
    open = a;
    const f = irisFace(a);
    field.setAttribute('d', f.field);
    edges.setAttribute('d', f.edges);
    side.setAttribute('d', irisSide(a));
    light();
  }
  // Without the iris every ray gets through; with it, only those inside
  // the opening.
  function light() {
    for (const r of raysB) r.setAttribute('opacity', stage < 2 || rayClears(+r.dataset.h, open) ? '0.6' : '0');
  }
  // Keyframes: [ms, value], eased between.
  function play(keys, fn, done) {
    cancelAnimationFrame(raf);
    const t0 = performance.now(), end = keys[keys.length - 1][0];
    const tick = (now) => {
      const t = Math.min(end, now - t0);
      let i = 1;
      while (i < keys.length - 1 && t > keys[i][0]) i++;
      const [ta, va] = keys[i - 1], [tb, vb] = keys[i];
      fn(va + (vb - va) * ease(tb > ta ? Math.max(0, Math.min(1, (t - ta) / (tb - ta))) : 1));
      if (t < end) raf = requestAnimationFrame(tick); else if (done) done();
    };
    raf = requestAnimationFrame(tick);
  }
  const closeIris = () => play([[0, open], [450, 0.96], [1550, 0.2], [2350, IRIS.open]], setIris);

  // ------------------------------------------------------- the signature
  const lens = sig.map((p) => p.getTotalLength());
  function signed(done = true) {
    sig.forEach((p, i) => { p.style.strokeDasharray = done ? '' : `${lens[i]} ${lens[i]}`; p.style.strokeDashoffset = done ? '' : String(lens[i]); });
    if (pen) pen.setAttribute('transform', penRest);
  }
  // The main line, then the stroke under it, the pen's nib on the line.
  function sign() {
    signed(false);
    const total = lens[0] + lens[1];
    play([[300, 0], [2300, 1]], (f) => {
      const d = f * total;
      const k = d < lens[0] ? 0 : 1, at = k ? d - lens[0] : d;
      sig[0].style.strokeDashoffset = String(Math.max(0, lens[0] - d));
      sig[1].style.strokeDashoffset = String(Math.max(0, lens[1] - (d - lens[0])));
      if (pen) { const p = sig[k].getPointAtLength(Math.min(lens[k], at)); pen.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`); }
    }, () => signed(true));
  }

  // ------------------------------------------------------------ a stage
  function set(n, { focus = false, instant = false } = {}) {
    n = Math.max(1, Math.min(N, n));
    const quiet = instant || reduce.matches;
    if (n === stage) {
      // Choosing the same stage again plays it again.
      if (!quiet && n === 2) closeIris();
      if (!quiet && n === 5) sign();
      if (focus) steps[n - 1].focus();
      return;
    }
    stage = n;
    root.classList.toggle('is-instant', quiet);
    root.dataset.stage = String(n);
    steps.forEach((b, i) => { b.setAttribute('aria-pressed', String(i + 1 === n)); b.classList.toggle('is-done', i + 1 < n); });
    range.value = String(n);
    range.setAttribute('aria-valuetext', `Stage ${n} of ${N}: ${names[n - 1]}`);
    put(out.readNo, nos[n - 1]); put(out.readName, names[n - 1]);
    put(out.sayNo, nos[n - 1]); put(out.sayName, names[n - 1]); put(out.sayText, texts[n - 1]);
    cancelAnimationFrame(raf);
    signed(true);
    if (n === 2 && !quiet) closeIris(); else setIris(IRIS.open);
    if (n === 5 && !quiet) sign();
    if (focus) steps[n - 1].focus();
  }

  // ------------------------------------------------------------- input
  steps.forEach((b, i) => b.addEventListener('click', () => set(i + 1)));
  ctl.querySelector('.ckx__steps').addEventListener('keydown', (e) => {
    const to = { ArrowRight: stage + 1, ArrowLeft: stage - 1, Home: 1, End: N }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    set(to, { focus: true });
  });
  range.addEventListener('input', () => set(+range.value));

  // An address that names a stage (#craft-iris) opens that stage.
  addEventListener('kessel:route', (e) => {
    if (e.detail.route !== 'craft') return;
    let id = location.hash.slice(1);
    try { id = decodeURIComponent(id); } catch { /* keep as is */ }
    const k = ids.indexOf(id);
    if (k >= 0) set(k + 1, { instant: true });
  });

  ctl.hidden = false;
  say.hidden = false;
  set(1, { instant: true });
  root.classList.add('is-live');

  // A beat (src/site/beats.js): scroll builds the lens stage by stage
  // until the visitor takes the steps or the slider.
  const beatEl = root.closest('.beat');
  if (beatEl) {
    const beat = addBeat(beatEl, { drive: (t, still) => { const n = still ? 3 : 1 + Math.round(t * (N - 1)); if (n !== stage) set(n); } });
    const mine = () => beat.mine();
    steps.forEach((b) => b.addEventListener('click', mine));
    range.addEventListener('input', mine);
    ctl.querySelector('.ckx__steps').addEventListener('keydown', mine);
  }
}
