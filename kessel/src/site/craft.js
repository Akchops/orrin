// Craft, live: the drawing of the lens on the bench (markup from
// src/site/craft-svg.js) becomes a stepper. The page is built showing the
// finished lens with the five stages as a list, which is what shows
// without JS; this shows the stage buttons and the slider, starts the
// drawing at the first stage and keeps the buttons, the slider, the frame's
// readout and the caption in step. Entering the iris stage closes the
// eleven blades and opens them half way, the light through the lens
// narrowing with them; entering the signing draws the signature with the
// pen. With reduced motion every change is instant and nothing moves.
import { irisFace, irisSide, rayClears, IRIS, AX, outAt, turnShapes, turnPlace } from '../app/craft-lens.js';
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
  let stage = 0, open = IRIS.open, raf = 0, beatApi = null;

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
  function set(n, { focus = false, instant = false, replay = true } = {}) {
    n = Math.max(1, Math.min(N, n));
    const quiet = instant || reduce.matches;
    if (n === stage) {
      if (!replay) return;
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

  // ---------------------------------------------------------- the finale
  // After the signing (pos past 5): the shell sweeps on from the mount to
  // the front over the cut half (close, 0 to 1), then the lens turns to
  // face the viewer while the room dims (turn, 0 to 1). pos 6 is sealed,
  // 7 face on; scroll scrubs it both ways, and the figure can be dragged.
  const F = {
    fig: $('.ckx__fig'), clip: svg.querySelector('.ck-shell__clip'), edge: svg.querySelector('.ck-shell__edge'),
    turn: svg.querySelector('.ck-turn'), tb: [...svg.querySelectorAll('.ck-turn .ck-tb')], tf: [...svg.querySelectorAll('.ck-turn .ck-tf')],
    tk: svg.querySelector('.ck-turn .ck-tk'), rear: svg.querySelector('.ck-tm--rear'), scale: svg.querySelector('.ck-tm--scale'), cap: svg.querySelector('.ck-tcap'),
  };
  const sealedEl = $('.ckx__sealed'), inside = $('.ckx__inside'), pill = $('.ckx__dl .turn');
  const pillText = pill ? pill.textContent : '', sealedText = sealedEl.dataset.text, sealedName = sealedEl.textContent.trim();
  let pos = 1, finKey = '', wasSealed = false, tw = 0;
  function finale(close, tu) {
    const key = `${close.toFixed(4)} ${tu.toFixed(4)}`;
    if (key === finKey) return;
    finKey = key;
    root.classList.toggle('is-fin', close > 0 || tu > 0);
    root.style.setProperty('--close', close.toFixed(3));
    root.style.setProperty('--turn', tu.toFixed(3));
    root.style.setProperty('--tv', Math.min(1, tu / 0.12).toFixed(3));
    const x = 1002 - close * 464, r = outAt(Math.max(540, Math.min(999, x)));
    F.clip.setAttribute('x', x.toFixed(1)); F.clip.setAttribute('width', (1004 - x).toFixed(1));
    F.edge.setAttribute('x', (x - 1.3).toFixed(1)); F.edge.setAttribute('y', (AX - r).toFixed(1)); F.edge.setAttribute('height', String(r));
    F.edge.style.opacity = close > 0 && close < 1 ? (0.85 * Math.sin(Math.PI * close)).toFixed(2) : '0';
    if (tu <= 0 && !F.turn.dataset.on) return;
    F.turn.dataset.on = tu > 0 ? '1' : '';
    const t = turnShapes(tu);
    F.tb.forEach((p, i) => p.setAttribute('d', t.sides[i]));
    F.tf.forEach((p, i) => p.setAttribute('d', t.faces[i]));
    F.tk.setAttribute('d', t.knurl);
    F.rear.setAttribute('transform', `matrix(${t.marks.rear.join(' ')})`); F.rear.setAttribute('opacity', t.marks.a.toFixed(3));
    F.scale.setAttribute('transform', `matrix(${t.marks.scale.join(' ')})`); F.scale.setAttribute('opacity', t.marks.a.toFixed(3));
    F.cap.setAttribute('transform', `matrix(${t.cap.join(' ')})`); F.cap.setAttribute('opacity', t.capOn ? '1' : '0');
    F.turn.setAttribute('transform', turnPlace(tu));
  }
  // pos 1 to 5: the stages; past 5 the finale.
  function go(p, opts = {}) {
    cancelAnimationFrame(tw);
    pos = Math.max(1, Math.min(N + 2, p));
    const n = pos <= N ? Math.round(pos) : N;
    if (n !== stage) set(n, { ...opts, replay: false });
    finale(Math.max(0, Math.min(1, pos - N)), Math.max(0, Math.min(1, pos - N - 1)));
    const sealed = pos >= N + 0.5;
    if (sealed !== wasSealed) {
      wasSealed = sealed;
      root.classList.toggle('is-sealed', sealed);
      if (sealed) {
        put(out.readName, sealedName); put(out.sayName, sealedName); put(out.sayText, sealedText);
        range.setAttribute('aria-valuetext', `${sealedName}: drag back to open it up again`);
        steps.forEach((b) => { b.setAttribute('aria-pressed', 'false'); b.classList.add('is-done'); });
      } else {
        stage = 0;
        set(n, { instant: true, replay: false });
      }
      if (pill) pill.textContent = sealed ? `Your turn \u00b7 ${sealedEl.dataset.hint}` : pillText;
      inside.setAttribute('aria-pressed', String(!sealed));
    }
  }
  // Animated to a new pos (a stage button, the slider, a drag let go).
  function tween(to) {
    cancelAnimationFrame(tw);
    const from = pos, dur = reduce.matches ? 0 : 420 + 300 * Math.abs(to - from);
    if (!dur) { go(to); return; }
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      go(from + (to - from) * ease(k));
      if (k < 1) tw = requestAnimationFrame(step);
    };
    tw = requestAnimationFrame(step);
  }
  // Drag the figure sideways: to the left opens it up again, to the right
  // closes and turns it; let go and it settles on the nearest step.
  let drag = null;
  F.fig.addEventListener('pointerdown', (e) => { if (e.button === 0) drag = { x: e.clientX, y: e.clientY, p: pos, on: false, id: e.pointerId }; });
  F.fig.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.on) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(e.clientY - drag.y)) return;
      drag.on = true; F.fig.setPointerCapture(e.pointerId); root.classList.add('is-dragging');
      if (beatApi) beatApi.mine();
    }
    go(drag.p + dx / Math.max(120, F.fig.getBoundingClientRect().width / 3));
  });
  const letGo = () => { if (drag && drag.on) { root.classList.remove('is-dragging'); tween(Math.round(pos)); } drag = null; };
  F.fig.addEventListener('pointerup', letGo);
  F.fig.addEventListener('pointercancel', letGo);
  // No text selection or native drag to cancel the next drag.
  F.fig.addEventListener('dragstart', (e) => e.preventDefault());
  // With reduced motion the lens waits sealed; this shows the inside.
  inside.addEventListener('click', () => { if (beatApi) beatApi.mine(); go(pos > N ? N : N + 1); });
  inside.hidden = false;

  // ------------------------------------------------------------- input
  steps.forEach((b, i) => b.addEventListener('click', () => (pos > N ? tween(i + 1) : go(i + 1))));
  ctl.querySelector('.ckx__steps').addEventListener('keydown', (e) => {
    const to = { ArrowRight: stage + 1, ArrowLeft: stage - 1, Home: 1, End: N }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    go(to, { focus: true });
  });
  range.addEventListener('input', () => (pos > N ? tween(+range.value) : go(+range.value)));

  // An address that names a stage (#craft-iris) opens that stage.
  addEventListener('kessel:route', (e) => {
    if (e.detail.route !== 'craft') return;
    let id = location.hash.slice(1);
    try { id = decodeURIComponent(id); } catch { /* keep as is */ }
    const k = ids.indexOf(id);
    if (k >= 0) go(k + 1, { instant: true });
  });

  ctl.hidden = false;
  say.hidden = false;
  // The caption keeps the height of its longest stage, so the pinned
  // screen never grows as the stages change.
  function reserve() {
    say.style.minHeight = '';
    const keep = [out.sayName.textContent, out.sayText.textContent];
    let h = 0;
    [...texts, sealedText].forEach((t, i) => { out.sayName.textContent = names[i] || sealedName; out.sayText.textContent = t; h = Math.max(h, say.offsetHeight); });
    [out.sayName.textContent, out.sayText.textContent] = keep;
    say.style.minHeight = `${h}px`;
  }
  reserve();
  addEventListener('resize', reserve);
  if (document.fonts) document.fonts.ready.then(reserve);
  go(1, { instant: true });
  root.classList.add('is-live');

  // A beat (src/site/beats.js): scroll builds the lens stage by stage
  // until the visitor takes the steps or the slider.
  const beatEl = root.closest('.beat');
  if (beatEl) {
    // Seven stops: one per stage, about a screen each, then sealed and face
    // on, the finale scrubbed between them (about one and a half screens);
    // scroll back undoes it all. With reduced motion: sealed, still.
    const beat = addBeat(beatEl, {
      drive: (t, still) => { if (still) go(N + 1, { instant: true }); else if (!drag || !drag.on) go(1 + t * (N + 1)); },
      stops: N + 2, rest: [1, 1, 1, 1, 1, 0.45, 1], glides: [0.9, 0.9, 0.9, 0.9, 0.8, 0.8], hold: 6.5,
    });
    beatApi = beat;
    const mine = () => beat.mine();
    steps.forEach((b) => b.addEventListener('click', mine));
    range.addEventListener('input', mine);
    ctl.querySelector('.ckx__steps').addEventListener('keydown', mine);
  }
}
