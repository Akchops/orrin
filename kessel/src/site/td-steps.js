// The teardown, stepped by scroll (markup: src/site/film.js). The section
// is a screen of scroll per stop with a sticky stage; each stop has an
// invisible anchor a screen tall that the page snaps to (CSS scroll snap,
// scroll-snap-stop: always). The active stop is the anchor across the
// middle of the screen, from an IntersectionObserver, written to
// #teardown[data-stop]: -1 above the teardown, 0 to 9 on it, 10 below it.
// Nothing here ever moves the page: the visitor's own scroll, at any
// speed, decides the stop, and the snap is the browser's (touch only).
//
// Each stop shows its caption beside the stage, marks its part on the map
// and in the list, and (in the stills tier) fades its still in. The live
// lens (src/app/live.js) reads data-stop and glides the camera there. A
// tap on a part (the list, the map, a number on the lens) shows it at once
// without moving the page (data-show), until the next stop scrolls in.
import { tdMap, camShape } from '../app/td-stops.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const put = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };

export function startTeardownSteps() {
  const sec = document.getElementById('teardown');
  if (!sec) return;
  const root = document.documentElement;
  const $ = (s) => sec.querySelector(s), $$ = (s) => [...sec.querySelectorAll(s)];
  const steps = $$('.td-step'), N = steps.length;
  const shots = $$('.td-shot'), btns = $$('.td-btn'), spots = $$('.td-spot'), tags = $$('.td-tag');
  const say = $('.td-say'), sayNo = $('.td-no'), sayName = $('.td-name'), sayLong = $('.td-t__long'), sayShort = $('.td-t__short'), cue = $('.td-cue');
  const camEl = $('.td-map__cam'), coneEl = $('.td-map__cone'), aimEl = $('.td-map__aim');
  const copy = steps.map((s) => ({ no: s.dataset.no || '', name: s.dataset.name, text: s.dataset.text, short: s.dataset.short }));
  const M = tdMap();
  let stop = -1, tap = null, shown = -1, mapCam = null, mapTw = 0;

  // The map's camera glides with the lens's (instantly with reduced motion).
  function drawCam(c) {
    const g = camShape(c);
    camEl.setAttribute('transform', g.transform);
    coneEl.setAttribute('d', g.cone);
    aimEl.setAttribute('cx', g.aim[0]); aimEl.setAttribute('cy', g.aim[1]);
  }
  function glideCam(i) {
    const to = M.cam(i);
    cancelAnimationFrame(mapTw);
    if (!mapCam || reduce.matches) { mapCam = to; drawCam(to); return; }
    const from = { ...mapCam };
    let daz = to.az - from.az;
    if (daz > 180) daz -= 360; else if (daz < -180) daz += 360;
    const t0 = performance.now();
    const step = (now) => {
      const f = ease(Math.min(1, (now - t0) / 600));
      mapCam = { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f, az: from.az + daz * f, D: from.D + (to.D - from.D) * f, half: from.half + (to.half - from.half) * f };
      drawCam(mapCam);
      if (f < 1) mapTw = requestAnimationFrame(step);
    };
    mapTw = requestAnimationFrame(step);
  }

  function cueText() { return root.classList.contains('live') ? cue.dataset.live : cue.dataset.still; }
  function render() {
    const i = tap != null ? tap : Math.max(0, Math.min(N - 1, stop));
    if (tap != null) sec.dataset.show = String(tap); else delete sec.dataset.show;
    put(cue, cueText());
    if (i === shown) return;
    shown = i;
    const c = copy[i];
    put(sayNo, c.no); put(sayName, c.name); put(sayLong, c.text); put(sayShort, c.short);
    sec.dataset.shown = String(i);
    shots.forEach((s, k) => s.classList.toggle('is-on', k === i));
    btns.forEach((b) => { if (+b.dataset.stop === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    spots.forEach((s) => s.classList.toggle('is-on', +s.dataset.stop === i));
    tags.forEach((t) => t.classList.toggle('is-on', +t.dataset.stop === i));
    sec.classList.toggle('is-turn', i === N - 1);
    glideCam(i);
  }

  // One stop at a time: should the observer ever report a jump of more
  // than one anchor (a frame missed in a hard fling), every stop between
  // is still made active, in order.
  function setStop(s) {
    if (s === stop) return;
    const dir = Math.sign(s - stop);
    while (stop !== s) {
      stop += dir;
      sec.dataset.stop = String(stop);
    }
    tap = null;
    render();
  }
  // The anchor across the middle line of the screen. The observer says
  // when that changes; the boxes say which one it is.
  function resolve() {
    const mid = innerHeight / 2, r = sec.getBoundingClientRect();
    if (!r.height) return;
    if (r.top > mid) return setStop(-1);
    if (r.bottom <= mid) return setStop(N);
    for (let k = 0; k < N; k++) {
      const b = steps[k].getBoundingClientRect();
      if (b.top <= mid && b.bottom > mid) return setStop(k);
    }
  }
  // Snapping is for touch. A wheel or trackpad moves the page in small
  // steps, and each small step that ends near an anchor would be pulled
  // back to it, so the page could not be scrolled on past a stop: after a
  // wheel the page scrolls freely (the stops still step, a screen each);
  // the next touch brings the snap back.
  addEventListener('wheel', () => root.classList.add('td-free'), { passive: true });
  addEventListener('touchstart', () => root.classList.remove('td-free'), { passive: true });
  const io = new IntersectionObserver(resolve, { rootMargin: '-49% 0px -49% 0px', threshold: 0 });
  steps.forEach((s) => io.observe(s));
  addEventListener('resize', resolve);
  addEventListener('kessel:route', () => requestAnimationFrame(resolve));

  // Tapping a part shows it straight away; the page stays where it is.
  const show = (i) => { tap = Math.max(0, Math.min(N - 1, i)); render(); };
  const onTap = (e) => {
    const el = e.target.closest('[data-stop]');
    if (!el || el.classList.contains('td-step')) return;
    show(+el.dataset.stop);
  };
  for (const el of [...btns, ...spots, ...tags]) el.addEventListener('click', onTap);
  sec.__tdShow = show;

  // The caption keeps the height of its longest stop (with the cue), so
  // nothing beside the stage moves as it changes.
  function reserve() {
    say.style.minHeight = '';
    const keep = [sayNo.textContent, sayName.textContent, sayLong.textContent, sayShort.textContent, sec.classList.contains('is-turn')];
    let h = 0;
    for (let k = 0; k < N; k++) {
      const c = copy[k];
      sayNo.textContent = c.no; sayName.textContent = c.name; sayLong.textContent = c.text; sayShort.textContent = c.short;
      sec.classList.toggle('is-turn', k === N - 1);
      h = Math.max(h, say.offsetHeight);
    }
    [sayNo.textContent, sayName.textContent, sayLong.textContent, sayShort.textContent] = keep;
    sec.classList.toggle('is-turn', keep[4]);
    say.style.minHeight = `${h}px`;
  }
  // The live layer arrives after the page: its cue mentions dragging.
  let wasLive = root.classList.contains('live');
  new MutationObserver(() => {
    const live = root.classList.contains('live');
    if (live !== wasLive) { wasLive = live; render(); reserve(); }
  }).observe(root, { attributes: true, attributeFilter: ['class'] });
  addEventListener('resize', reserve);
  if (document.fonts) document.fonts.ready.then(reserve);

  sec.classList.add('is-stepped');
  render();
  reserve();
  resolve();
}
