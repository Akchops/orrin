// The company page's interactions (its markup is src/site/pages/company.js,
// its drawings src/site/bench-svg.js). The bench's markers open a note
// beside them; the timeline's scale scrubs and snaps to its entries; the
// checks gain a button that runs them in order; the questions open and
// close with an eased height. Without this script every part still reads:
// the notes listed under the drawing, every year listed, real checkboxes
// and native <details>.
import { addBeat } from './beats.js';

const page = document.getElementById('company');
const $ = (s, el = page) => el.querySelector(s);
const $$ = (s, el = page) => [...el.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const EASE = 'cubic-bezier(0.2, 0.7, 0.2, 1)';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

if (page) { bench(); timeline(); checks(); questions(); }

// ------------------------------------------------------------- bench
// Each marker (a link to its note in the list) becomes a button that opens
// the note as a card beside it, wherever it covers no other marker: above,
// below, left or right of it, kept inside the page's gutters and under the
// header. On phones the note docks under the drawing instead. One open at
// a time; the close button, Escape, a tap elsewhere or moving focus away
// closes it.
function bench() {
  const root = $('[data-bench]');
  if (!root) return;
  const stage = $('.bn__stage', root);
  const list = $('.bn__notes', root);
  const notes = $$('.bn__note', root);
  let open = -1;

  list.setAttribute('role', 'presentation');
  notes.forEach((nt) => {
    nt.setAttribute('role', 'dialog');
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'bn__close';
    x.setAttribute('aria-label', `Close the note: ${$('.bn__note-t', nt).textContent}`);
    x.addEventListener('click', () => close(true));
    nt.append(x);
  });
  const spots = $$('a.bn__spot', root).map((a, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = a.className;
    b.dataset.i = String(i);
    b.dataset.side = a.dataset.side;
    b.style.cssText = a.style.cssText;
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-controls', notes[i].id);
    b.append(...a.childNodes);
    a.replaceWith(b);
    b.addEventListener('click', () => (open === i ? close(true) : show(i)));
    return b;
  });

  // A marker's box on screen: its disc, and its label where one shows.
  const boxOf = (b) => {
    const r = b.querySelector('.bn__num').getBoundingClientRect(), l = b.querySelector('.bn__lbl').getBoundingClientRect();
    return l.width > 2 ? { l: Math.min(r.left, l.left), t: Math.min(r.top, l.top), r: Math.max(r.right, l.right), b: Math.max(r.bottom, l.bottom) } : { l: r.left, t: r.top, r: r.right, b: r.bottom };
  };
  function place() {
    if (open < 0) return;
    const nt = notes[open];
    // Docked under the drawing (phones): the stylesheet places it.
    if (getComputedStyle(nt).position !== 'absolute') { nt.style.left = nt.style.top = ''; nt.dataset.side = 'dock'; return; }
    // Positions are relative to the notes layer, which covers the hero.
    const s = spots[open].getBoundingClientRect(), R = list.getBoundingClientRect(), st = stage.getBoundingClientRect();
    const cs = getComputedStyle(document.body);
    const gl = parseFloat(cs.paddingLeft) || 16, gr = parseFloat(cs.paddingRight) || 16;
    const head = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--head')) || 4.25) * 16;
    const w = nt.offsetWidth, h = nt.offsetHeight, gap = 12, pad = 6;
    const cx = s.left + s.width / 2, cy = s.top + s.height / 2;
    const top0 = Math.max(head + 8, st.top + 6), bot0 = Math.min(innerHeight - 8, st.bottom - 6);
    const others = spots.filter((_, j) => j !== open).map(boxOf);
    // The copy on the drawing's wall is in the way too.
    const words = $$('.bn__copy h1, .bn__copy .bn__lead, .bn__copy .bn__hint, .bn__copy .bn__meta', root).map((el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; }).filter((r) => r.r - r.l > 2);
    const x0 = R.left + gl, x1 = R.right - gr - w;
    const cands = [];
    const ks = [0, -0.3, 0.3, -0.45, 0.45];
    for (const side of ['above', 'below']) {
      const y = side === 'above' ? s.top + 5 - gap - h : s.bottom - 5 + gap;
      for (const k of ks) cands.push({ side, x: clamp(cx - w / 2 + k * w, x0, x1), y });
    }
    for (const side of ['left', 'right']) cands.push({ side, x: side === 'left' ? s.left - gap - w : s.right + gap, y: clamp(cy - h / 2, top0, bot0 - h) });
    // Failing those, raised above every other marker, still pointing down
    // at its own.
    const high = Math.min(s.top, ...others.map((o) => o.t)) - gap - h;
    for (const k of ks) cands.push({ side: 'above', x: clamp(cx - w / 2 + k * w, x0, x1), y: high });
    // The first that covers no other marker and stays on screen; failing
    // that, the one that covers least.
    let best = null;
    for (const c of cands) {
      let cost = 0;
      for (const o of [...others, ...words]) {
        const ox = Math.min(c.x + w, o.r + pad) - Math.max(c.x, o.l - pad), oy = Math.min(c.y + h, o.b + pad) - Math.max(c.y, o.t - pad);
        if (ox > 0 && oy > 0) cost += ox * oy * (others.includes(o) ? 4 : 1);
      }
      if (c.y < top0 || c.y + h > bot0) cost += 1e6;
      if (c.x < x0 - 1 || c.x > x1 + 1) cost += 1e6;
      if (!best || cost < best.cost) best = { ...c, cost };
      if (!cost) break;
    }
    const { side, x, y } = best;
    nt.style.left = `${Math.round(x - R.left)}px`;
    nt.style.top = `${Math.round(y - R.top)}px`;
    nt.style.setProperty('--ax', `${Math.round(clamp(cx - x, 18, w - 18))}px`);
    nt.style.setProperty('--ay', `${Math.round(clamp(cy - y, 18, h - 18))}px`);
    nt.style.setProperty('--dy', side === 'above' ? '6px' : side === 'below' ? '-6px' : '0px');
    nt.dataset.side = side;
  }
  // Docked, the notes keep the height of the longest, so the pinned screen
  // never grows from one to the next.
  function reserve() {
    list.style.minHeight = '';
    if (!notes.length || getComputedStyle(notes[0]).position === 'absolute') return;
    let hmax = 0;
    notes.forEach((nt) => { const was = nt.classList.contains('is-open'); nt.classList.add('is-open'); hmax = Math.max(hmax, nt.offsetHeight); if (!was) nt.classList.remove('is-open'); });
    list.style.minHeight = `${hmax}px`;
  }
  function show(i) {
    if (open >= 0) close(false);
    open = i;
    spots[i].setAttribute('aria-expanded', 'true');
    notes[i].classList.add('is-open');
    place();
    notes[i].focus({ preventScroll: true });
    const r = notes[i].getBoundingClientRect();
    if (r.bottom > innerHeight || r.top < 0) notes[i].scrollIntoView({ block: 'nearest', behavior: reduce.matches ? 'auto' : 'smooth' });
  }
  function close(focus) {
    if (open < 0) return;
    const i = open;
    open = -1;
    spots[i].setAttribute('aria-expanded', 'false');
    notes[i].classList.remove('is-open');
    if (focus) spots[i].focus({ preventScroll: true });
  }
  const inside = (el) => open >= 0 && el instanceof Node && (notes[open].contains(el) || spots[open].contains(el));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open >= 0) { e.preventDefault(); close(true); } });
  document.addEventListener('pointerdown', (e) => { if (open >= 0 && !inside(e.target)) close(false); }, true);
  document.addEventListener('focusin', (e) => { if (open >= 0 && !inside(e.target)) close(false); });
  addEventListener('resize', () => { reserve(); place(); }, { passive: true });
  addEventListener('kessel:route', () => close(false));
  root.classList.add('is-live');
  reserve();
  if (document.fonts) document.fonts.ready.then(reserve);

  // A beat with four stops: scroll opens the notes one after another (no
  // focus, no scrolling) until the visitor taps a number.
  const peek = (i) => {
    if (i === open) return;
    if (open >= 0) close(false);
    if (i < 0) return;
    open = i;
    spots[i].setAttribute('aria-expanded', 'true');
    notes[i].classList.add('is-open');
    place();
  };
  const beatEl = root.closest('.beat');
  if (beatEl) {
    const beat = addBeat(beatEl, { drive: (t, still) => peek(still ? -1 : Math.round(t * (spots.length - 1))), stops: spots.length });
    spots.forEach((b) => b.addEventListener('click', () => beat.mine()));
  }
}

// ---------------------------------------------------------- timeline
// A range input lies over the whole scale (its own thumb invisible; the
// amber index shows the value). Dragging moves the index freely and the
// entry changes as it passes each year; letting go snaps to the nearest
// entry. The arrow keys, Page Up/Down, Home and End step from entry to
// entry. The current entry shows beside the scale and is announced.
function timeline() {
  const tl = $('[data-tl]');
  if (!tl) return;
  const scale = $('.tl__scale', tl), input = $('.tl__in', tl), live = $('.tl__live', tl);
  const entries = $$('.tl__entry', tl), icons = $$('.tl__ico', tl);
  const years = $$('.tl__y.is-entry', tl), feet = $$('.tl__feet span', tl);
  const P = entries.map((e) => Number(e.dataset.at));
  let cur = -1;
  const nearest = (p) => P.reduce((b, v, i) => (Math.abs(v - p) < Math.abs(P[b] - p) ? i : b), 0);
  const say = (i) => `${$('.tl__year', entries[i]).textContent}: ${$('.tl__title', entries[i]).textContent}`;

  function show(i, announce) {
    if (i === cur) return;
    cur = i;
    entries.forEach((e, j) => e.classList.toggle('is-active', j === i));
    icons.forEach((e, j) => e.classList.toggle('is-later', j > i));
    years.forEach((e, j) => e.classList.toggle('is-current', j === i));
    feet.forEach((e, j) => e.classList.toggle('is-current', j === i));
    input.setAttribute('aria-valuetext', say(i));
    if (announce) live.textContent = `${say(i)}. ${$('.tl__line', entries[i]).textContent}`;
  }
  function snap(i, announce = true) {
    tl.classList.remove('is-dragging');
    scale.style.setProperty('--at', P[i]);
    input.value = String(Math.round(P[i] * 1000));
    show(i, announce);
  }
  input.addEventListener('input', () => {
    const p = Number(input.value) / 1000;
    tl.classList.add('is-dragging');
    scale.style.setProperty('--at', p);
    show(nearest(p), false);
  });
  input.addEventListener('change', () => { const i = nearest(Number(input.value) / 1000); cur = -1; snap(i); });
  input.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowUp: 1, PageUp: 1, ArrowLeft: -1, ArrowDown: -1, PageDown: -1 }[e.key];
    const i = step ? cur + step : e.key === 'Home' ? 0 : e.key === 'End' ? P.length - 1 : null;
    if (i === null) return;
    e.preventDefault();
    const j = clamp(i, 0, P.length - 1);
    if (j !== cur) snap(j);
  });
  input.hidden = false;
  $('.tl__help', tl).hidden = false;
  snap(0, false);
  tl.classList.add('is-ready');

  // A beat with a stop at each year on the scale: scroll moves the index
  // along the years, resting at each entry, until it is dragged.
  let idle = 0;
  const scrub = (p) => {
    tl.classList.add('is-dragging');
    scale.style.setProperty('--at', p);
    input.value = String(Math.round(p * 1000));
    show(nearest(p), false);
    clearTimeout(idle);
    idle = setTimeout(() => tl.classList.remove('is-dragging'), 200);
  };
  const beatEl = tl.closest('.beat');
  if (beatEl) {
    const beat = addBeat(beatEl, { drive: (t, still, d) => (still ? snap(Math.floor(P.length / 2), false) : d && d.glide === undefined ? snap(d.stop, false) : scrub(P[0] + (P[P.length - 1] - P[0]) * t)), stops: P.length });
    // A change is the visitor's; a press alone is not (on a phone a swipe
    // that starts on the slider scrolls the page).
    const mine = () => beat.mine();
    input.addEventListener('keydown', (e) => { if (e.key !== 'Tab') mine(); });
    input.addEventListener('input', (e) => { if (e.isTrusted) mine(); });
  }
}

// ------------------------------------------------------------ checks
// The boxes tick by hand without any script. The button runs the rest in
// order, a short beat on each (it reads "Checking…" meanwhile, and a tick
// by hand takes over), and starts again once all have passed.
function checks() {
  const box = $('[data-co-checks]');
  if (!box) return;
  const inputs = $$('.ck-tile__box', box);
  const run = $('.ck__run', box);
  const count = $('.ck__count', box);
  let token = 0; // a newer run, or a tick by hand, stops an older run

  // The caption under the tiles: the check just ticked (or being run),
  // its name and its line; the tiles themselves stay compact.
  const say = $('.ck__say', box), sayNo = say && $('.ck__say-no', say), sayName = say && $('.ck__say-name', say), sayT = say && $('.ck__say-t', say);
  const lines = inputs.map((i) => { const t = i.closest('.ck-tile'); return { no: $('.ck-tile__no', t).textContent, name: $('.ck-tile__name', t).textContent, line: $('.ck-tile__line', t).textContent }; });
  const sayOf = (k) => { if (!say) return; const c = lines[Math.max(0, k)]; sayNo.textContent = c.no; sayName.textContent = c.name; sayT.textContent = c.line; };
  let touched = -1; // the tile ticked or unticked by hand
  function update() {
    const done = inputs.filter((i) => i.checked).length, all = done === inputs.length;
    const running = inputs.findIndex((i) => i.closest('.ck-tile').classList.contains('is-running'));
    sayOf(running >= 0 ? running : touched >= 0 ? touched : done ? inputs.map((i) => i.checked).lastIndexOf(true) : 0);
    const busy = box.classList.contains('is-running');
    box.classList.toggle('is-done', all);
    run.textContent = busy ? run.dataset.busy : all ? run.dataset.again : run.dataset.run;
    if (busy) run.setAttribute('aria-disabled', 'true'); else run.removeAttribute('aria-disabled');
    count.textContent = `${done} of ${inputs.length} checks passed${all ? '. Signed, ready to leave the workshop.' : ''}`;
  }
  function stop() {
    token++;
    box.classList.remove('is-running');
    inputs.forEach((i) => i.closest('.ck-tile').classList.remove('is-running'));
  }

  const tiles = inputs.map((i) => i.closest('.ck-tile'));
  const unfill = () => tiles.forEach((t) => t.style.removeProperty('--fill'));
  run.addEventListener('click', () => {
    if (box.classList.contains('is-running')) return;
    touched = -1;
    stop();
    unfill();
    const t = token;
    let todo = inputs.filter((i) => !i.checked);
    // All passed: "Run it again" clears them and runs all six.
    if (!todo.length) { inputs.forEach((i) => { i.checked = false; }); update(); todo = inputs.slice(); }
    if (reduce.matches) { todo.forEach((i) => { i.checked = true; }); update(); return; }
    box.classList.add('is-running');
    update();
    const next = (k) => {
      if (t !== token) return;
      const i = todo[k];
      if (!i) { box.classList.remove('is-running'); update(); return; }
      const row = i.closest('.ck-tile');
      row.classList.add('is-running');
      setTimeout(() => {
        if (t !== token) return;
        row.classList.remove('is-running');
        i.checked = true;
        update();
        setTimeout(() => next(k + 1), 160);
      }, 560);
    };
    next(0);
  });
  inputs.forEach((i, k) => i.addEventListener('change', () => { touched = k; stop(); unfill(); update(); }));
  run.hidden = false;
  box.classList.add('is-ready');
  update();

  // The caption keeps the height of its longest line.
  if (say) {
    const reserve = () => {
      say.style.minHeight = '';
      let h = 0;
      lines.forEach((_, k) => { sayOf(k); h = Math.max(h, say.offsetHeight); });
      say.style.minHeight = `${h}px`;
      update();
    };
    reserve();
    addEventListener('resize', reserve);
    if (document.fonts) document.fonts.ready.then(reserve);
  }

  // A beat with a stop at each check: at stop k the first k + 1 are ticked,
  // and on the way to the next its tile fills; at the last all six have
  // passed and the signature is drawn. Until the visitor ticks or runs them.
  const scrub = (stop, glide) => {
    if (box.classList.contains('is-running')) return;
    inputs.forEach((inp, k) => { const f = k <= stop ? 1 : k === stop + 1 ? glide : 0; tiles[k].style.setProperty('--fill', f.toFixed(3)); inp.checked = f >= 1; });
    update();
  };
  const beatEl = box.closest('.beat');
  if (beatEl) {
    const beat = addBeat(beatEl, { drive: (t, still, d) => (still ? scrub(2, 0) : scrub(d ? d.stop : Math.round(t * (inputs.length - 1)), d && d.glide !== undefined ? d.glide : 0)), stops: inputs.length });
    run.addEventListener('click', () => beat.mine());
    inputs.forEach((i) => i.addEventListener('change', () => beat.mine()));
  }
}

// --------------------------------------------------------- questions
// Native <details>: the script only eases the height open and closed, and
// leaves it to the browser when motion is reduced.
function questions() {
  for (const d of $$('.co-q')) {
    const sum = $('summary', d);
    let anim = null;
    sum.addEventListener('click', (e) => {
      if (reduce.matches || !d.animate) return;
      e.preventDefault();
      const from = d.getBoundingClientRect().height;
      if (anim) anim.cancel();
      const closing = d.open && !d.classList.contains('is-closing');
      d.classList.toggle('is-closing', closing);
      if (!closing) d.open = true;
      const to = closing ? sum.getBoundingClientRect().height + (d.offsetHeight - d.clientHeight) : d.getBoundingClientRect().height;
      anim = d.animate({ height: [`${from}px`, `${to}px`] }, { duration: closing ? 320 : 460, easing: EASE });
      anim.onfinish = () => {
        anim = null;
        if (closing) { d.open = false; d.classList.remove('is-closing'); }
      };
    });
  }
}
