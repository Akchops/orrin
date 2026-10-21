// The company page's interactions (its markup is src/site/pages/company.js).
// The timeline becomes a year scrubber on wide screens and a vertical
// stepper on phones; the checks gain a button that runs them in order; the
// questions open and close with an eased height; the role cards show their
// description on hover or a tap. Without this script every part still
// reads: all the years in a list, real checkboxes, native <details> and
// every description shown.
const page = document.getElementById('company');
const $ = (s, el = page) => el.querySelector(s);
const $$ = (s, el = page) => [...el.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const EASE = 'cubic-bezier(0.2, 0.7, 0.2, 1)';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

if (page) { timeline(); checks(); questions(); roles(); }

// ---------------------------------------------------------- timeline
// One state, two presentations. Wide screens: a tab per year on a ruler,
// with an index mark that follows the active year and can be dragged; one
// entry shows at a time. Phones: each year's heading becomes a button and
// one entry is open at a time, a rail down the left marking the way.
function timeline() {
  const tl = $('[data-co-tl]');
  if (!tl) return;
  const scrub = $('.co-tl__scrub', tl);
  const track = $('.co-tl__track', tl);
  const list = $('.co-tl__list', tl);
  const tabs = $$('[role="tab"]', tl);
  const items = $$('.co-tl__item', tl);
  const panels = items.map((li) => $('.co-tl__panel', li));
  const heads = items.map((li) => $('.co-tl__head', li));
  const at = tabs.map((t) => parseFloat(t.style.getPropertyValue('--p')) || 0);
  const wide = matchMedia('(min-width: 900px)');
  const toggles = [];
  let active = 0;
  let shut = false; // phones: the open entry can be closed again
  let mode = '';
  let dragged = false;

  function render() {
    items.forEach((li, i) => {
      li.classList.toggle('is-active', i === active);
      li.classList.toggle('is-past', i < active);
      li.classList.toggle('is-open', i === active && (mode === 'tabs' || !shut));
    });
    if (mode === 'tabs') {
      tabs.forEach((t, i) => { t.setAttribute('aria-selected', String(i === active)); t.tabIndex = i === active ? 0 : -1; });
      panels.forEach((p, i) => { p.inert = i !== active; });
      track.style.setProperty('--at', at[active]);
    } else {
      toggles.forEach((b, i) => b.setAttribute('aria-expanded', String(i === active && !shut)));
    }
  }

  function select(i, focus) {
    active = clamp(i, 0, items.length - 1);
    shut = false;
    render();
    if (focus) (mode === 'tabs' ? tabs : toggles)[active].focus();
  }

  // Each year's heading holds the stepper's button on phones and is plain
  // text on wide screens, where the tabs do the job.
  function setMode() {
    const m = wide.matches ? 'tabs' : 'steps';
    if (m === mode) return;
    mode = m;
    tl.dataset.mode = m;
    scrub.hidden = m !== 'tabs';
    if (m === 'tabs') list.setAttribute('role', 'none'); else list.removeAttribute('role');
    items.forEach((li, i) => {
      const p = panels[i], h = heads[i];
      if (m === 'tabs') {
        const b = toggles[i];
        if (b && b.parentNode === h) { h.append(...b.childNodes); b.remove(); }
        li.setAttribute('role', 'none');
        p.setAttribute('role', 'tabpanel');
        p.setAttribute('aria-labelledby', tabs[i].id);
      } else {
        li.removeAttribute('role');
        p.removeAttribute('role');
        p.removeAttribute('aria-labelledby');
        p.inert = false;
        let b = toggles[i];
        if (!b) {
          b = toggles[i] = document.createElement('button');
          b.type = 'button';
          b.className = 'co-tl__toggle';
          b.setAttribute('aria-controls', `${p.id}-body`);
          b.addEventListener('click', () => {
            if (i === active) { shut = !shut; render(); } else select(i);
          });
        }
        b.append(...h.childNodes);
        h.append(b);
      }
    });
    render();
  }

  // Tabs: arrows step through the years (left/right, or up/down), Home and
  // End jump to the ends; the year under focus is the one shown.
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  $('[role="tablist"]', tl).addEventListener('keydown', (e) => {
    const i = e.key in step ? active + step[e.key] : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : null;
    if (i === null) return;
    e.preventDefault();
    select(i, true);
  });
  tabs.forEach((t, i) => t.addEventListener('click', () => { if (!dragged) select(i); }));

  // Stepper: up and down move between the years' buttons.
  list.addEventListener('keydown', (e) => {
    const i = toggles.indexOf(document.activeElement);
    if (mode !== 'steps' || i < 0) return;
    const j = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? toggles.length - 1 : null;
    if (j === null) return;
    e.preventDefault();
    toggles[clamp(j, 0, toggles.length - 1)].focus();
  });

  // Earlier and later, inside each entry. Focus follows to the entry now
  // shown, since the one it was in has just closed.
  for (const b of $$('.co-tl__go button', tl)) {
    b.addEventListener('click', () => {
      const d = Number(b.dataset.go);
      select(active + d);
      if (mode === 'steps') { toggles[active].focus({ preventScroll: true }); keepInView(panels[active]); return; }
      const p = panels[active], g = $(`[data-go="${d}"]`, p) || $('[data-go]', p);
      g.focus({ preventScroll: true });
      g.scrollIntoView({ block: 'nearest' });
    });
  }
  for (const g of $$('.co-tl__go', tl)) g.hidden = false;

  // The open entry's heading stays on screen when the one above it closes.
  function keepInView(el) {
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      const top = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      if (r.top < top || r.top > innerHeight * 0.55) el.scrollIntoView({ block: 'start', behavior: reduce.matches ? 'auto' : 'smooth' });
    }, reduce.matches ? 0 : 520);
  }

  // Scrubbing: drag along the ruler and the index mark follows the pointer,
  // the entry changing as it passes each year; let go and it settles on
  // that year. A plain click on the ruler jumps to the nearest year.
  const nearest = (p) => at.reduce((b, v, i) => (Math.abs(v - p) < Math.abs(at[b] - p) ? i : b), 0);
  track.addEventListener('pointerdown', (e) => {
    if (mode !== 'tabs' || e.button !== 0) return;
    const r = track.getBoundingClientRect();
    const pAt = (x) => clamp((x - r.left) / r.width, 0, 1);
    const x0 = e.clientX;
    let moving = false;
    const move = (ev) => {
      if (!moving && Math.abs(ev.clientX - x0) < 6) return;
      if (!moving) { moving = true; track.setPointerCapture(e.pointerId); tl.classList.add('is-dragging'); }
      const p = pAt(ev.clientX), n = nearest(p);
      if (n !== active) { active = n; render(); }
      track.style.setProperty('--at', p);
    };
    const end = (ev) => {
      track.removeEventListener('pointermove', move);
      track.removeEventListener('pointerup', end);
      track.removeEventListener('pointercancel', end);
      if (moving) {
        tl.classList.remove('is-dragging');
        dragged = true;
        setTimeout(() => { dragged = false; });
        select(active, true);
      } else if (ev.type === 'pointerup' && !ev.target.closest('[role="tab"]')) select(nearest(pAt(ev.clientX)), true);
    };
    track.addEventListener('pointermove', move);
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
  });

  wide.addEventListener('change', setMode);
  setMode();
  tl.classList.add('is-ready');
}

// ------------------------------------------------------------ checks
// The boxes tick by hand without any script. The button runs the rest in
// order, a short beat on each (it reads "Checking…" meanwhile, and a tick
// by hand takes over), and starts again once all have passed.
function checks() {
  const box = $('[data-co-checks]');
  if (!box) return;
  const inputs = $$('.co-check__box', box);
  const rows = inputs.map((i) => i.closest('.co-check'));
  const run = $('.co-checks__run', box);
  const count = $('.co-checks__count', box);
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
    rows.forEach((r) => r.classList.remove('is-running'));
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
      const row = i.closest('.co-check');
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

// ------------------------------------------------------------- roles
// Each card's heading becomes a button that covers the card: a tap opens
// or closes the description (hover shows it too, where there is a mouse),
// and Escape closes it again.
function roles() {
  const list = $('.co-roles');
  if (!list) return;
  const set = (card, open) => {
    card.classList.toggle('is-open', open);
    $('.co-role__btn', card).setAttribute('aria-expanded', String(open));
  };
  for (const card of $$('.co-role', list)) {
    const h = $('.co-role__head', card), desc = $('.co-role__desc', card);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'co-role__btn';
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-controls', desc.id);
    b.append(...h.childNodes);
    h.append(b);
    b.addEventListener('click', () => set(card, !card.classList.contains('is-open')));
  }
  list.addEventListener('keydown', (e) => {
    const card = e.key === 'Escape' && e.target.closest('.co-role.is-open');
    if (card) set(card, false);
  });
  list.classList.add('is-ready');
}
