// The company page's interactions (its markup is src/site/pages/company.js,
// its drawings src/site/bench-svg.js). The bench's markers open a note
// beside them; the timeline's scale scrubs and snaps to its entries; the
// checks gain a button that runs them in order; the questions open and
// close with an eased height. Without this script every part still reads:
// the notes listed under the drawing, every year listed, real checkboxes
// and native <details>.
const page = document.getElementById('company');
const $ = (s, el = page) => el.querySelector(s);
const $$ = (s, el = page) => [...el.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const EASE = 'cubic-bezier(0.2, 0.7, 0.2, 1)';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

if (page) { bench(); timeline(); checks(); questions(); }

// ------------------------------------------------------------- bench
// Each marker (a link to its note in the list) becomes a button that opens
// the note as a card beside it: above the marker when there is room, below
// it otherwise, kept inside the page's gutters. One open at a time; the
// close button, Escape, a tap elsewhere or moving focus away closes it.
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

  function place() {
    if (open < 0) return;
    // Positions are relative to the notes layer, which covers the hero.
    const nt = notes[open], s = spots[open].getBoundingClientRect(), R = list.getBoundingClientRect(), st = stage.getBoundingClientRect();
    const cs = getComputedStyle(document.body);
    const gl = parseFloat(cs.paddingLeft) || 16, gr = parseFloat(cs.paddingRight) || 16;
    const head = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--head')) || 4.25) * 16;
    const w = nt.offsetWidth, h = nt.offsetHeight, gap = 12;
    const cx = s.left + s.width / 2 - R.left;
    const left = clamp(cx - w / 2, gl, R.width - gr - w);
    // Above when it fits under the header and inside the drawing's top.
    const above = s.top + 5 - gap - h >= Math.max(head + 8, st.top + 6);
    const top = above ? s.top + 5 - R.top - gap - h : s.bottom - 5 - R.top + gap;
    nt.style.left = `${Math.round(left)}px`;
    nt.style.top = `${Math.round(top)}px`;
    nt.style.setProperty('--ax', `${Math.round(clamp(cx - left, 18, w - 18))}px`);
    nt.style.setProperty('--dy', above ? '6px' : '-6px');
    nt.dataset.side = above ? 'above' : 'below';
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
  addEventListener('resize', place, { passive: true });
  addEventListener('kessel:route', () => close(false));
  root.classList.add('is-live');
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

  function update() {
    const done = inputs.filter((i) => i.checked).length, all = done === inputs.length;
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

  run.addEventListener('click', () => {
    if (box.classList.contains('is-running')) return;
    stop();
    const t = token;
    const todo = inputs.filter((i) => !i.checked);
    if (!todo.length) { inputs.forEach((i) => { i.checked = false; }); update(); return; }
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
  inputs.forEach((i) => i.addEventListener('change', () => { stop(); update(); }));
  run.hidden = false;
  box.classList.add('is-ready');
  update();
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
