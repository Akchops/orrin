// The live layer: pins, scroll -> story time, pointer, render loop and the
// adaptive-quality watchdog. Called by main.js with the libraries already
// started; it reports every tier change back through `report`.
import { buildStory, createState, STORY_END } from './story.js';
import { distanceAt } from './textures.js';

const NARROW = '(max-width: 799px), (orientation: portrait) and (max-width: 1100px)';
// The film ends after Focus; the site's own hero takes over from there.
// The rest of the story timeline is left in place (the stills use it).
const FILM_END = 11.2;

export async function bootLive(L, { caps, font, report, mount3D, mount2D }) {
  const { gsap, ScrollTrigger, Lenis } = L;
  gsap.registerPlugin(ScrollTrigger);
  const root = document.documentElement;
  const $ = (s) => document.querySelector(s);
  const stage = $('#stage');
  const narrowMQ = matchMedia(NARROW);

  // ------------------------------------------------------------ renderer
  let view, tier;
  if (caps.ok) {
    view = mount3D(stage, () => degrade('the 3D context was lost'));
    tier = '3d';
  } else {
    view = mount2D(stage);
    tier = '2d';
  }
  stage.prepend(view.canvas);

  const S = createState();
  let storyTl = buildStory(gsap, S, narrowMQ.matches ? 'narrow' : 'wide');
  if (view.warm) await view.warm(S);
  // Draw one frame before switching layouts: if the renderer cannot draw,
  // this throws here and main.js reports it, with the stills still up.
  view.render(S, 0, { x: 0, y: 0, spin: 0 });

  root.classList.add('live');

  // -------------------------------------------------------------- lenis
  history.scrollRestoration = 'manual';
  const lenis = new Lenis({ autoRaf: false, duration: 1.1, smoothWheel: true, syncTouch: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented) return;
    const id = a.getAttribute('href');
    const el = id === '#top' ? 0 : document.querySelector(id);
    if (el === null) return;
    e.preventDefault();
    lenis.scrollTo(el, { duration: 1.6 });
  });
  document.addEventListener('focusin', (e) => {
    const r = e.target.getBoundingClientRect?.();
    if (r && (r.bottom < 0 || r.top > innerHeight)) lenis.scrollTo(e.target, { immediate: true, offset: -innerHeight / 3 });
  });

  // ------------------------------------------------------------- pins
  // One beat = one readable change: 700 px desktop, 420 px phone (a thumb
  // fling covers far more page per gesture), capped by viewport height.
  const beatPx = () => Math.round(Math.min(narrowMQ.matches ? 420 : 700, innerHeight * 0.95));
  const pins = {};
  const mm = gsap.matchMedia();
  mm.add({ narrow: NARROW, any: 'all' }, () => {
    const pin = (id, beats) => ScrollTrigger.create({
      trigger: id, start: 'top top', end: () => '+=' + Math.round(beats * beatPx()),
      pin: true, anticipatePin: 1, invalidateOnRefresh: true,
    });
    // APERTURE: 2 beats. Eleven blades opening in turn need room to be seen
    //   one at a time; one beat turned them into a single blur.
    pins.ap = pin('#aperture', 2);
    // THROUGH: 4 beats. Seven elements and the iris to pass; at fewer beats
    //   each element is on screen for under half a beat and cannot be read.
    pins.th = pin('#through', 4);
    // BACK TOGETHER: 1.5 beats: one move (pull back while closing up) plus
    //   a short hold on the whole lens.
    pins.ex = pin('#exit', 1.5);
    // FOCUS: 2 beats: one turn of the ring from infinity to the closest mark.
    pins.fo = pin('#focus', 2);
    return () => { for (const k of Object.keys(pins)) delete pins[k]; };
  });

  // Story time as a piecewise-linear function of scroll, anchored to the
  // pins. One source of truth for the camera.
  let anchors = [[0, 0], [1, FILM_END]];
  // Past this scroll position the site covers the stage completely.
  let coveredAt = Infinity, filmEndY = Infinity;
  function rebuild() {
    const p = pins;
    if (!p.ap || !p.fo) return;
    const pts = [[0, 0], [p.ap.start, 1], [p.ap.end, 3], [p.th.start, 3.6], [p.th.end, 7.2], [p.ex.start, 7.8], [p.ex.end, 9.0],
      [p.fo.start, 9.6], [p.fo.end, FILM_END]];
    for (let i = 1; i < pts.length; i++) if (pts[i][0] <= pts[i - 1][0]) pts[i][0] = pts[i - 1][0] + 1;
    anchors = pts;
    filmEndY = p.fo.end;
    coveredAt = p.fo.end + innerHeight * 1.2;
  }
  const storyAt = (y) => {
    for (let i = 1; i < anchors.length; i++) {
      const [y0, s0] = anchors[i - 1], [y1, s1] = anchors[i];
      if (y <= y1) return s0 + (s1 - s0) * Math.max(0, (y - y0) / (y1 - y0));
    }
    return FILM_END;
  };
  ScrollTrigger.addEventListener('refresh', rebuild);
  narrowMQ.addEventListener('change', () => {
    const t = storyTl.time();
    storyTl.kill();
    storyTl = buildStory(gsap, S, narrowMQ.matches ? 'narrow' : 'wide');
    storyTl.time(t);
  });

  // ------------------------------------------------------------ pointer
  const pointer = { x: 0, y: 0, spin: 0, tx: 0, ty: 0, tspin: 0 };
  const fine = matchMedia('(pointer: fine)').matches;
  let lastInput = 0, drag = null;
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') {
      pointer.tx = (e.clientX / innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / innerHeight) * 2 - 1;
      lastInput = performance.now();
    } else if (drag && e.pointerId === drag.id) {
      pointer.tspin = drag.spin + ((e.clientX - drag.x) / innerWidth) * 2;
      lastInput = performance.now();
    }
  }, { passive: true });
  addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') drag = { id: e.pointerId, x: e.clientX, spin: pointer.tspin }; }, { passive: true });
  const endDrag = () => { drag = null; pointer.tspin = 0; };
  addEventListener('pointerup', endDrag, { passive: true });
  addEventListener('pointercancel', endDrag, { passive: true });

  // --------------------------------------------------------------- DOM bits
  const ring = $('.ring-text');
  const readout = $('#readout');
  let readOn = false, lastRead = '', covered = false;

  // ------------------------------------------------------------ the loop
  let sCur = 0, last = performance.now(), slow = 0, fast = 0, lastSig = '', resized = 0;
  const t0 = performance.now();
  const qa = !!caps.qa;

  function frame() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const tSec = (now - t0) / 1000;
    const target = storyAt(window.scrollY);
    sCur += (target - sCur) * (1 - Math.exp(-dt / 0.09));
    if (Math.abs(target - sCur) < 1e-4) sCur = target;
    storyTl.time(Math.min(STORY_END, Math.max(0, sCur)));

    const k = 1 - Math.exp(-dt / 0.14);
    pointer.x += (pointer.tx - pointer.x) * k;
    pointer.y += (pointer.ty - pointer.y) * k;
    pointer.spin += (pointer.tspin - pointer.spin) * (1 - Math.exp(-dt / (drag ? 0.06 : 0.35)));

    // Once the site has scrolled over the stage there is nothing to draw.
    const cov = window.scrollY > coveredAt;
    if (cov !== covered) { covered = cov; root.classList.toggle('film-covered', cov); lastSig = ''; }
    if (cov) { window.__kessel && (window.__kessel.idle = true); return; }

    // Focus readout: what the index mark points at. Checked every frame,
    // as it also goes off when the film ends, where the scene stands still.
    const wantRead = sCur > 9.55 && sCur < 11.3 && window.scrollY < filmEndY;
    if (wantRead !== readOn) { readOn = wantRead; readout.classList.toggle('is-on', wantRead); }
    if (wantRead) {
      const d = distanceAt(S.focus);
      const txt = d === Infinity ? '∞' : (d >= 10 ? d.toFixed(0) : d.toFixed(1)) + ' m';
      if (txt !== lastRead) { lastRead = txt; readout.innerHTML = '<small>Focused at</small>' + txt; }
    }

    // Render only when something changed. Nothing in this scene moves on
    // its own, so a still page costs no GPU time at all: kinder to phone
    // batteries and to slow GPUs that would otherwise queue frames.
    const sig = sCur.toFixed(4) + ',' + pointer.x.toFixed(3) + ',' + pointer.y.toFixed(3) + ',' + pointer.spin.toFixed(3) + ',' + resized;
    const changed = sig !== lastSig;
    lastSig = sig;
    window.__kessel && (window.__kessel.idle = !changed);
    if (!changed) { slow = Math.max(0, slow - 1); return; }
    view.render(S, tSec, pointer);

    // Light coming through the iris also lifts the page behind the lens.
    const facing = Math.max(0, Math.cos((S.az * Math.PI) / 180)) * (1 - S.inside);
    root.style.setProperty('--bloom', ((0.05 + 0.95 * S.iris * S.iris) * facing * S.light).toFixed(3));

    // Engraved text ring sized to the front ring on screen, while the lens
    // faces the viewer; it turns as the page scrolls, like a focus ring.
    const ringOn = facing > 0.97 && sCur < 3.3;
    if (ringOn) {
      const c = view.project('front'), e = view.project('ringEdge');
      if (c && e) {
        const d = Math.hypot(e.x - c.x, e.y - c.y) * 2;
        ring.style.setProperty('--ring', d.toFixed(1) + 'px');
        ring.style.left = c.x.toFixed(1) + 'px';
        ring.style.top = c.y.toFixed(1) + 'px';
      }
      ring.style.setProperty('--ring-rot', (sCur * 40).toFixed(1) + 'deg');
    }
    ring.style.setProperty('--ring-o', ringOn ? Math.min(1, (3.3 - sCur) * 3).toFixed(2) : '0');

    // Watchdog (only counts frames that were actually drawn): sustained
    // frames over 22 ms step the resolution down; still slow at DPR 1 drops
    // to the 2D tier, which draws the same move.
    if (!qa && tier === '3d') {
      if (dt > 0.022) { slow++; fast = 0; } else { fast++; slow = Math.max(0, slow - 1); }
      if (slow > 90) {
        slow = 0;
        const d = view.getDPR();
        if (d > 1.01) view.setDPR(Math.max(1, d - 0.25)); else degrade('3D could not hold its frame rate here');
      } else if (fast > 600) { fast = 0; view.setDPR(view.getDPR() + 0.25); }
    }
  }

  let degrading = false;
  function degrade(why) {
    if (degrading || tier !== '3d') return;
    degrading = true;
    const old = view;
    view = mount2D(stage);
    stage.prepend(view.canvas);
    tier = '2d';
    try { old.destroy(); } catch { /* context may already be gone */ }
    report('2d', why);
  }

  new ResizeObserver(() => { view.resize(); resized++; }).observe(stage);
  ScrollTrigger.refresh();
  rebuild();
  sCur = storyAt(window.scrollY);
  storyTl.time(sCur);
  frame();

  // Other pages of the site hide the film: stop drawing while they are up,
  // and re-measure the pins when home comes back.
  let running = false;
  function setActive(on) {
    if (on === running) return;
    running = on;
    if (on) { ScrollTrigger.refresh(); rebuild(); lastSig = ''; gsap.ticker.add(frame); }
    else gsap.ticker.remove(frame);
  }
  addEventListener('kessel:route', (e) => setActive(e.detail.route === 'home'));
  setActive(root.dataset.route === 'home');
  // Land where the site asked for (a deep link, or the hero after the
  // film) now that the live layout has replaced the stills.
  const land = window.__kesselSite && window.__kesselSite.anchor();
  if (land) { lenis.resize(); lenis.scrollTo(land, { immediate: true, force: true }); }

  window.__kessel = { S, get s() { return sCur; }, storyAt, lenis, ScrollTrigger, get tier() { return tier; } };
  return tier;
}
