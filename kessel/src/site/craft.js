// Craft: the five stages as tabs. The page is built (src/site/pages/craft.js)
// as an index of links over five stacked stages, which is what shows
// without JS; this turns the index into a tablist and shows one stage at a
// time. The close-ups crossfade with a slight scale (instant with reduced
// motion), a thin line fills along the rail, arrow keys move between the
// tabs, and on touch screens a sideways swipe on the picture does too.
const sec = document.getElementById('craft-stages');

if (sec) {
  const tabs = [...sec.querySelectorAll('.cst__tab')];
  const panels = [...sec.querySelectorAll('.cst__panel')];
  const list = sec.querySelector('.cst__rail');
  const stack = sec.querySelector('.cst__panels');
  const ctrl = sec.querySelector('.cst__ctrl');
  const [prevBtn, nextBtn] = ctrl.querySelectorAll('.cst__step');
  const wide = matchMedia('(min-width: 960px)');
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const name = (i) => `${tabs[i].querySelector('.cst__no').textContent} ${tabs[i].querySelector('.cst__name').textContent}`;
  let current = 0;
  let leaving = null;
  let timer = 0;

  // ------------------------------------------------------------ semantics
  list.setAttribute('role', 'tablist');
  tabs.forEach((t, i) => {
    t.parentElement.setAttribute('role', 'presentation');
    t.setAttribute('role', 'tab');
    t.setAttribute('aria-controls', panels[i].id);
    panels[i].setAttribute('role', 'tabpanel');
    panels[i].setAttribute('aria-labelledby', t.id);
  });
  const orient = () => list.setAttribute('aria-orientation', wide.matches ? 'vertical' : 'horizontal');
  orient();
  wide.addEventListener('change', orient);

  // --------------------------------------------------------------- select
  // The new stage fades in over the old one, which stays put underneath
  // until the fade is done, so the picture never dips to the page.
  function select(i, { focus = false, instant = false } = {}) {
    i = Math.max(0, Math.min(panels.length - 1, i));
    const was = current;
    current = i;
    sec.style.setProperty('--p', (i + 0.5) / panels.length);
    sec.style.setProperty('--dir', i >= was ? 1 : -1);
    tabs.forEach((t, k) => {
      const on = k === i;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    if (leaving !== null) panels[leaving].classList.remove('was-on');
    clearTimeout(timer);
    leaving = null;
    const quiet = instant || still.matches || i === was;
    sec.classList.toggle('is-instant', quiet);
    panels.forEach((p, k) => {
      const on = k === i;
      p.classList.toggle('is-on', on);
      p.tabIndex = on ? 0 : -1;
    });
    if (!quiet) {
      leaving = was;
      panels[was].classList.add('was-on');
      timer = setTimeout(() => { panels[was].classList.remove('was-on'); leaving = null; }, 900);
    }
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === panels.length - 1;
    prevBtn.querySelector('.cst__step-l').textContent = i ? name(i - 1) : 'Previous';
    nextBtn.querySelector('.cst__step-l').textContent = i < panels.length - 1 ? name(i + 1) : 'Next';
    prevBtn.setAttribute('aria-label', i ? `Previous stage: ${name(i - 1)}` : 'Previous stage');
    nextBtn.setAttribute('aria-label', i < panels.length - 1 ? `Next stage: ${name(i + 1)}` : 'Next stage');
    if (focus) tabs[i].focus();
  }

  // ---------------------------------------------------------------- input
  // The rail's links would jump to the stacked stage; here they select it.
  tabs.forEach((t, i) => t.addEventListener('click', (e) => { e.preventDefault(); select(i); }));
  list.addEventListener('keydown', (e) => {
    const n = panels.length;
    const to = { ArrowRight: current + 1, ArrowDown: current + 1, ArrowLeft: current - 1, ArrowUp: current - 1, Home: 0, End: n - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    select((to + n) % n, { focus: true });
  });
  prevBtn.addEventListener('click', () => select(current - 1));
  nextBtn.addEventListener('click', () => select(current + 1));

  // Swipe: the picture follows the finger a little, and a clear sideways
  // move changes the stage. A mostly vertical move is left to the page.
  let x0 = 0, y0 = 0, dx = 0, axis = '';
  stack.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; axis = '';
  }, { passive: true });
  stack.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) return;
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (!axis && Math.hypot(mx, my) > 8) axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
    if (axis !== 'x') return;
    dx = mx;
    // Resistance at the ends, where there is no stage to go to.
    const end = (dx > 0 && current === 0) || (dx < 0 && current === panels.length - 1);
    sec.classList.add('is-drag');
    sec.style.setProperty('--drag', `${(end ? 0.12 : 0.3) * dx}px`);
  }, { passive: true });
  const release = () => {
    if (axis === 'x') {
      sec.classList.remove('is-drag');
      sec.style.setProperty('--drag', '0px');
      if (Math.abs(dx) > 48) select(current + (dx < 0 ? 1 : -1));
    }
    axis = ''; dx = 0;
  };
  stack.addEventListener('touchend', release, { passive: true });
  stack.addEventListener('touchcancel', release, { passive: true });

  // An address that names a stage (#craft-iris) opens that stage. The site
  // shell then scrolls to it.
  addEventListener('kessel:route', (e) => {
    if (e.detail.route !== 'craft') return;
    let id = location.hash.slice(1);
    try { id = decodeURIComponent(id); } catch { /* keep as is */ }
    const k = panels.findIndex((p) => p.id === id);
    if (k >= 0) select(k, { instant: true });
  });

  select(0, { instant: true });
}
