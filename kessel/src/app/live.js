// The live layer: pins, scroll -> story time, pointer, render loop, the
// adaptive-quality watchdog and the teardown's camera. Called by main.js
// with the libraries already started; it reports every tier change back
// through `report`.
import { buildStory, createState, STORY_END, FILM_END } from './story.js';
import { distanceLabel, FILM_SCALE } from './textures.js';
import { TD_STOPS, TD_LAST, stopState, fitStop } from './td-stops.js';
import { createWatchdog } from './watchdog.js';
import { fitToBox } from './fit.js';

const NARROW = '(max-width: 799px), (orientation: portrait) and (max-width: 1100px)';

export async function bootLive(L, { caps, font, report, mount3D, mount2D }) {
  const { gsap, ScrollTrigger, Lenis } = L;
  gsap.registerPlugin(ScrollTrigger);
  const root = document.documentElement;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const stage = $('#stage');
  const narrowMQ = matchMedia(NARROW);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const params = new URLSearchParams(location.search);
  const tdSec = $('#teardown'), tdView = tdSec && tdSec.querySelector('.td-view');

  // ------------------------------------------------------------ renderer
  let view, tier;
  if (caps.ok) {
    view = mount3D(stage, contextLost);
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
    // Long jumps (the nav, the hero buttons) land at once instead of
    // fast-forwarding through the whole film; short ones glide.
    // A pinned section is measured by its pin spacer: seen from below, the
    // section itself sits at the end of its pin.
    const box = el === 0 ? 0 : (el.closest('.pin-spacer') || el);
    const y = box === 0 ? 0 : box.getBoundingClientRect().top + window.scrollY;
    if (Math.abs(y - window.scrollY) > innerHeight * 2.5) lenis.scrollTo(y, { immediate: true, force: true });
    else lenis.scrollTo(y, { duration: 1.6 });
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
    // LENSES: 3 beats, one per proposal: half held, half morphing.
    pins.mo = pin('#models', 3);
    pins.ws = ScrollTrigger.create({ trigger: '#film-workshop', start: 'top top', end: 'bottom top' });
    // CONTACT: the film's last stage. The film ends when it fills the
    //   screen; the same move carries on as it scrolls away.
    pins.ct = ScrollTrigger.create({ trigger: '#film-contact', start: 'top top', end: 'bottom top' });
    // TEARDOWN: not pinned here. It is a screen of scroll per stop with a
    //   sticky stage (CSS), stepped by src/site/td-steps.js.
    return () => { for (const k of Object.keys(pins)) delete pins[k]; };
  });

  // Story time as a piecewise-linear function of scroll, anchored to the
  // pins. One source of truth for the camera.
  let anchors = [[0, 0], [1, STORY_END]];
  // Past this scroll position the site covers the stage completely; the
  // teardown's top and its stretch of scroll (wheel scrolling is native
  // there, below).
  let coveredAt = Infinity, tdTop = Infinity;
  function rebuild() {
    const p = pins;
    if (!p.ap || !p.mo || !p.ct || !tdSec) return;
    tdTop = tdSec.getBoundingClientRect().top + window.scrollY;
    // The story ends as the teardown reaches the top of the screen; from
    // there its stops take over.
    const pts = [[0, 0], [p.ap.start, 1], [p.ap.end, 3], [p.th.start, 3.6], [p.th.end, 7.2], [p.ex.start, 7.8], [p.ex.end, 9.0],
      [p.fo.start, 9.6], [p.fo.end, 11.2], [p.mo.start, 11.8], [p.mo.end, 14.2], [p.ws.start, 15.2], [p.ct.start, FILM_END],
      [tdTop, STORY_END]];
    for (let i = 1; i < pts.length; i++) if (pts[i][0] <= pts[i - 1][0]) pts[i][0] = pts[i - 1][0] + 1;
    anchors = pts;
    coveredAt = tdTop + tdSec.offsetHeight;
    // The pins change the page's length; make the smooth scroller measure it
    // now rather than on its next resize check, so the page never stops
    // short of the teardown in the first second after the live layout.
    lenis.resize();
  }
  const storyAt = (y) => {
    for (let i = 1; i < anchors.length; i++) {
      const [y0, s0] = anchors[i - 1], [y1, s1] = anchors[i];
      if (y <= y1) return s0 + (s1 - s0) * Math.max(0, (y - y0) / (y1 - y0));
    }
    return STORY_END;
  };
  ScrollTrigger.addEventListener('refresh', rebuild);
  narrowMQ.addEventListener('change', () => {
    const t = storyTl.time();
    storyTl.kill();
    storyTl = buildStory(gsap, S, narrowMQ.matches ? 'narrow' : 'wide');
    storyTl.time(t);
  });

  // ------------------------------------------------------------ pointer
  // The lens is an object in the hand: a drag (mouse, or a finger sliding
  // sideways) turns it, it carries on a little when let go, and after a
  // moment at rest it settles back to the film's pose. A mouse at rest
  // tilts it slightly toward the pointer. In the teardown a drag turns the
  // camera round the part or the line in view instead (teardownStep).
  const pointer = { x: 0, y: 0, spin: 0, tx: 0, ty: 0, tspin: 0, drag: 0, tdrag: 0 };
  const turn = { vs: 0, vt: 0, last: 0 };
  let drag = null;
  const NO_DRAG = 'a, button, input, textarea, select, label, summary, h1, h2, h3, p, li, dt, dd, .tier, .masthead, .td-side, .td-tag';
  addEventListener('pointerdown', (e) => {
    if (e.button > 0 || root.dataset.route !== 'home' || e.target.closest(NO_DRAG)) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, mouse: e.pointerType === 'mouse' };
    turn.vs = turn.vt = 0;
    // A turning hand should not select the headline it passes over.
    root.classList.add('turning');
  }, { passive: true });
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') {
      pointer.tx = (e.clientX / innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / innerHeight) * 2 - 1;
      td.hoverAt = [e.clientX, e.clientY];
    }
    if (!drag || e.pointerId !== drag.id) return;
    const now = performance.now(), dts = Math.max(0.008, (now - drag.t) / 1000);
    const ds = ((e.clientX - drag.x) / innerWidth) * 2.6;
    const dtl = drag.mouse ? ((e.clientY - drag.y) / innerHeight) * 1.4 : 0;
    pointer.tspin += ds;
    pointer.tdrag = Math.max(-0.5, Math.min(0.5, pointer.tdrag + dtl));
    // Release velocity, smoothed over the last few moves.
    turn.vs += (ds / dts - turn.vs) * 0.5;
    turn.vt += (dtl / dts - turn.vt) * 0.5;
    drag.moved += Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y);
    drag.x = e.clientX; drag.y = e.clientY; drag.t = now; turn.last = now;
  }, { passive: true });
  const endDrag = (e) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    if (drag.moved > 8) td.noClick = performance.now();
    if (performance.now() - drag.t > 90) turn.vs = turn.vt = 0;   // held still before letting go
    drag = null;
    turn.last = performance.now();
    root.classList.remove('turning');
  };
  addEventListener('pointerup', endDrag, { passive: true });
  addEventListener('pointercancel', endDrag, { passive: true });
  function turnStep(dt, now) {
    if (!drag) {
      pointer.tspin += turn.vs * dt; turn.vs *= Math.exp(-dt / 0.45);
      pointer.tdrag = Math.max(-0.5, Math.min(0.5, pointer.tdrag + turn.vt * dt)); turn.vt *= Math.exp(-dt / 0.45);
      // After 1.6 s at rest, settle back the short way round.
      if (now - turn.last > 1600) {
        const w = Math.round(pointer.tspin / (Math.PI * 2)) * Math.PI * 2;
        pointer.tspin -= w; pointer.spin -= w;
        const k = 1 - Math.exp(-dt / 0.9);
        pointer.tspin -= pointer.tspin * k; pointer.tdrag -= pointer.tdrag * k;
        if (Math.abs(pointer.tspin) < 1e-4) pointer.tspin = 0;
        if (Math.abs(pointer.tdrag) < 1e-4) pointer.tdrag = 0;
      }
    }
    const k = 1 - Math.exp(-dt / (drag ? 0.06 : 0.2));
    pointer.spin += (pointer.tspin - pointer.spin) * k;
    pointer.drag += (pointer.tdrag - pointer.drag) * k;
  }

  // --------------------------------------------------------------- DOM bits
  const ring = $('.ring-text');
  const readout = $('#readout');
  const models = $$('.film .model');
  let activeModel = -1, readOn = false, lastRead = '', covered = false;
  // Teardown: the numbers on the parts in the exploded view (tappable).
  const tdTags = $$('.td-tag').map((el) => ({ el, id: el.dataset.part, on: false }));
  const tagsLayer = $('.td-tags');
  // The teardown camera (teardownStep): the stop it is going to (want),
  // the pose it left (from) and when (t0), how long the glide takes (dur)
  // and how far it is (k, 0..1); the pose it shows (cur), with the part
  // that is bright (hl) and the one the others draw back from (pick, pe).
  const td = { active: false, want: -1, from: null, t0: 0, dur: 0, k: 1, cur: null, hl: '', pick: '', pe: 0,
    fromHl: '', fromPick: '', fromPe: 0, tilt: 1, boxKey: '', clipKey: '', hover: null, hoverAt: null, noClick: 0 };

  // ------------------------------------------------------------ the loop
  let sCur = 0, last = performance.now(), lastSig = '', resized = 0;
  let fitBase = null, lastMo = '';
  const modelsSec = document.getElementById('models'), modelsStage = modelsSec && modelsSec.querySelector('.models__stage');
  const heroStage = document.querySelector('#home-hero .hero__stage');
  // The layout check (scripts/verify-stage.mjs) asks the live film where
  // the hero's lens is; the 2D film is measured from its canvas instead.
  if (heroStage) heroStage.__lensBox = () => (view && view.lensBox ? view.lensBox() : null);
  const t0 = performance.now();
  const qa = !!caps.qa;
  // Test hooks: ?watchdog keeps the watchdog on with forced software GL,
  // ?slow=N adds N ms of work to every drawn frame (a slow phone, faked).
  const wdOn = !qa || params.has('watchdog');
  const fakeSlow = Number(params.get('slow')) || 0;

  function frame() {
    const now = performance.now();
    const iv = now - last;
    const dt = Math.min(0.1, iv / 1000);
    last = now;
    watchTick(now, iv);
    // The teardown camera is laid over S for one frame only: put the
    // film's camera back first (keys no tween covers here would otherwise
    // keep the teardown's pose after scrolling back into the film).
    if (tdDirty) { Object.assign(S, tdBase); tdDirty = false; }
    if (fitBase) { Object.assign(S, fitBase); fitBase = null; }
    const tSec = (now - t0) / 1000;
    const target = storyAt(window.scrollY);
    sCur += (target - sCur) * (1 - Math.exp(-dt / 0.09));
    if (Math.abs(target - sCur) < 1e-4) sCur = target;
    storyTl.time(Math.min(STORY_END, Math.max(0, sCur)));
    teardownStep(now);
    // The hero and the three-lens chapter: the lens fitted to its stage
    // box (fit.js), for this frame only, so the timeline's own camera comes
    // back after. The hero's box scrolls away with it.
    const box = sCur < 3 ? heroStage : modelsStage;
    if (S.fit > 0.001 && box) {
      fitBase = { frame: S.frame, sx: S.sx, sy: S.sy, tx: S.tx, ty: S.ty, tz: S.tz };
      fitToBox(S, box.getBoundingClientRect(), innerWidth, innerHeight, S.fit);
    }
    // Its heading and list leave before the camera moves in on the barrel.
    if (modelsSec) {
      const mo = Math.max(0, Math.min(1, (14.3 - sCur) / 0.1)).toFixed(3);
      if (mo !== lastMo) { lastMo = mo; modelsSec.style.setProperty('--mo', mo); }
    }

    const k = 1 - Math.exp(-dt / 0.14);
    pointer.x += (pointer.tx - pointer.x) * k;
    pointer.y += (pointer.ty - pointer.y) * k;
    turnStep(dt, now);

    // Once the site has scrolled over the stage there is nothing to draw.
    const cov = window.scrollY > coveredAt;
    if (cov !== covered) { covered = cov; root.classList.toggle('film-covered', cov); lastSig = ''; }
    if (cov) { window.__kessel && (window.__kessel.idle = true); return; }

    // Render only when something changed. Nothing in this scene moves on
    // its own, so a still page costs no GPU time at all: kinder to phone
    // batteries and to slow GPUs that would otherwise queue frames.
    const sig = sCur.toFixed(4) + ',' + pointer.x.toFixed(3) + ',' + pointer.y.toFixed(3) + ',' + pointer.spin.toFixed(3) + ',' + pointer.drag.toFixed(3) + ',' + resized +
      ',' + S.hl + ',' + S.dim.toFixed(3) + ',' + td.want + ',' + td.k.toFixed(4) + ',' + td.boxKey;
    const changed = sig !== lastSig;
    window.__kessel && (window.__kessel.idle = !changed && td.k >= 1);
    lastSig = sig;
    if (!changed) return;
    // In the teardown the lens holds still: the camera moves round it.
    pointer.tilt = td.tilt;
    view.render(S, tSec, pointer);
    if (fakeSlow) { const t = performance.now(); while (performance.now() - t < fakeSlow) { /* busy */ } }
    wdPending = true;

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
    // The ring comes in as the hero text goes, so the headline never sits
    // on it.
    const ringIn = Math.min(1, Math.max(0, (sCur - 0.12) / 0.45));
    ring.style.setProperty('--ring-o', ringOn ? (Math.min(1, (3.3 - sCur) * 3) * ringIn).toFixed(2) : '0');
    root.style.setProperty('--hero-o', Math.max(0, 1 - sCur / 0.55).toFixed(3));

    placeTags();

    // Focus readout: what the index mark points at.
    const wantRead = sCur > 9.55 && sCur < 11.3;
    if (wantRead !== readOn) { readOn = wantRead; readout.classList.toggle('is-on', wantRead); }
    if (wantRead) {
      // The film's lens, Parvati: 0.45 m at the end of the stage, as engraved.
      const txt = distanceLabel(S.focus, FILM_SCALE);
      if (txt !== lastRead) { lastRead = txt; readout.innerHTML = '<small>Focused at</small>' + txt; }
    }
    const am = Math.round(S.model);
    if (sCur > 11.6 && sCur < 14.3) {
      if (am !== activeModel) { activeModel = am; models.forEach((m, i) => m.classList.toggle('is-on', i === am)); }
    } else if (activeModel !== -1) { activeModel = -1; models.forEach((m) => m.classList.remove('is-on')); }

  }

  // ------------------------------------------------------------ watchdog
  // See watchdog.js. Ticks while another tier is up, or while the tab is
  // hidden, are not counted.
  let wdPending = false;
  const wd = createWatchdog({
    now0: performance.now(),
    stepDown: () => (view.stepDown ? view.stepDown() : null),
    degrade: (why) => degrade(why),
    report: (why) => report('3d', why),
  });
  let wdSkip = false;
  document.addEventListener('visibilitychange', () => { wdSkip = true; });
  function watchTick(now, iv) {
    const drew = wdPending;
    wdPending = false;
    if (wdSkip) { wdSkip = false; return; }   // the gap while the tab was hidden
    if (wdOn && tier === '3d' && !document.hidden) wd.tick(now, iv, drew);
  }

  // --------------------------------------------------------- teardown
  // Stepped by scroll: src/site/td-steps.js keeps #teardown[data-stop] on
  // the step anchor across the middle of the screen (-1 above the
  // teardown, 10 below it) and data-show on a tapped part. Each stop is a
  // pose (td-stops.js) fitted to the stage box (.td-view); the camera
  // glides from wherever it is to the new pose in about 600 ms, or switches
  // at once with reduced motion. Nothing here moves the page.
  const ease = (t) => t * t * (3 - 2 * t);
  const glide = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const TD_KEYS = ['az', 'el', 'frame', 'tx', 'ty', 'tz', 'sx', 'sy', 'oroll', 'tear', 'tlight', 'light', 'iris', 'focus', 'dim', 'dof', 'dofR'];
  const tdBase = {};
  let tdDirty = false, vb = null;

  // Stop i's pose in this frame's box. Before the teardown (-1) it is the
  // film's own camera, fitted into the box as the section scrolls in (w),
  // with the stage clipped to the box by the same amount, so the hand-off
  // from the film is one move.
  function poseOf(i, box) {
    if (i < 0) {
      const P = { model: S.model, fov: S.fov, hl: '', pick: '', pe: 0 };
      for (const key of TD_KEYS) P[key] = S[key];
      const w = ease(Math.max(0, Math.min(1, (sCur - FILM_END) / (STORY_END - FILM_END))));
      fitToBox(P, box, innerWidth, innerHeight, w);
      P.clip = w;
      return P;
    }
    const P = stopState(i);
    P.fov = S.fov;
    fitStop(P, i, box, innerWidth, innerHeight, S.tspread || 1, S.model);
    P.clip = 1;
    return P;
  }

  // The stage drawn only inside the box (the caption, the map and the list
  // beside it stay clear of the parts), from the full screen in the film.
  function setClip(c, box) {
    const W = innerWidth, H = innerHeight;
    const key = c < 0.001 || !box ? '' : [c.toFixed(3), box.left | 0, box.top | 0, box.width | 0, box.height | 0, W, H].join(',');
    if (key === td.clipKey) return;
    td.clipKey = key;
    if (!key) { stage.style.clipPath = ''; return; }
    const t = Math.max(0, box.top) * c, l = Math.max(0, box.left) * c;
    const r = Math.max(0, W - box.left - box.width) * c, b = Math.max(0, H - box.top - box.height) * c;
    stage.style.clipPath = `inset(${t.toFixed(1)}px ${r.toFixed(1)}px ${b.toFixed(1)}px ${l.toFixed(1)}px round ${(4 * c).toFixed(1)}px)`;
  }

  function teardownStep(now) {
    if (!tdSec || !tdView) return;
    const stop = Number(tdSec.dataset.stop), show = tdSec.dataset.show;
    const want = show !== undefined ? Number(show) : Math.min(TD_LAST, stop);
    // Wheel scrolling is native on the teardown and a screen either side of
    // it: the browser's snap works on the page's own scroll, which the
    // smooth scroller would otherwise animate. A glide under way stops.
    const near = window.scrollY > tdTop - innerHeight * 1.25 && window.scrollY < coveredAt + innerHeight * 0.5;
    if (near === lenis.options.smoothWheel) {
      lenis.options.smoothWheel = !near;
      if (near && lenis.isScrolling === 'smooth') lenis.reset();
    }
    // In the film itself the teardown does nothing.
    if (want < 0 && td.k >= 1 && sCur <= FILM_END + 1e-4) {
      if (td.active) {
        td.active = false; td.want = -1; td.cur = null; td.tilt = 1; td.boxKey = '';
        S.hl = ''; S.pick = ''; S.pe = 0; S.dim = 0;
        setClip(0, null);
      }
      return;
    }
    td.active = true;
    const r = tdView.getBoundingClientRect();
    vb = { left: r.left, top: r.top, width: r.width, height: r.height };
    td.boxKey = `${vb.left | 0},${vb.top | 0},${vb.width | 0},${vb.height | 0}`;
    const P = poseOf(want, vb);
    if (want !== td.want || !td.cur) {
      td.from = td.cur ? { ...td.cur } : { ...P };
      td.fromHl = td.hl; td.fromPick = td.pick; td.fromPe = td.pe;
      // The parts leaving or coming back together take a little longer
      // than the glide from one part to the next.
      const regroup = (td.from.tear > 0.5) !== (P.tear > 0.5);
      td.dur = reduce.matches ? 0 : regroup ? 1300 : 650;
      td.want = want; td.t0 = now;
      // Reduced motion: no glide, a short cross-fade of the stage.
      if (reduce.matches && stage.animate) stage.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
    }
    const f = td.dur ? Math.min(1, (now - td.t0) / td.dur) : 1;
    const k = glide(f), half = k < 0.5, F = td.from;
    td.k = f;
    const cur = td.cur || (td.cur = {});
    for (const key of TD_KEYS) {
      if (key === 'az') { const d = P.az - F.az; cur.az = F.az + (d - Math.round(d / 360) * 360) * k; }
      else cur[key] = F[key] + (P[key] - F[key]) * k;
    }
    cur.clip = F.clip + (P.clip - F.clip) * k;
    // From one part to the next, the bright part hands over halfway and
    // the others' dimming and drift dip and come back, so nothing jumps.
    if (td.fromHl === P.hl) td.hl = P.hl;
    else if (!td.fromHl) { td.hl = P.hl; cur.dim = P.dim * k; }
    else if (!P.hl) { td.hl = td.fromHl; cur.dim = F.dim * (1 - k); }
    else { td.hl = half ? td.fromHl : P.hl; cur.dim = half ? F.dim * (1 - 2 * k) : P.dim * (2 * k - 1); }
    if (td.fromPick === P.pick) { td.pick = P.pick; td.pe = td.fromPe + (P.pe - td.fromPe) * k; }
    else if (!td.fromPick) { td.pick = P.pick; td.pe = P.pe * k; }
    else if (!P.pick) { td.pick = td.fromPick; td.pe = td.fromPe * (1 - k); }
    else { td.pick = half ? td.fromPick : P.pick; td.pe = half ? td.fromPe * (1 - 2 * k) : P.pe * (2 * k - 1); }
    if (f >= 1) { td.hl = P.hl; td.pick = P.pick; }

    for (const key of TD_KEYS) tdBase[key] = S[key];
    tdDirty = true;
    for (const key of TD_KEYS) S[key] = cur[key];
    // A sideways drag turns the camera round what is in view; it settles
    // back a moment after the hand lets go (turnStep).
    if (want >= 0) S.az += Math.max(-75, Math.min(75, pointer.spin * (180 / Math.PI) * 0.6));
    S.hl = td.hl; S.pick = td.pick; S.pe = td.pe;
    td.tilt = want >= 0 ? 0 : 1 - cur.clip;
    setClip(cur.clip, vb);
  }

  // The numbers on the parts while the whole line is in view, every other
  // one above its part and the rest below, so neighbours never collide
  // (stills: the same numbers on the exploded view). The layer is fixed;
  // its box gives the page's offset.
  function placeTags() {
    const on = td.active && td.want === 0 && td.k >= 1 && !!vb;
    const lo = on && tagsLayer ? tagsLayer.getBoundingClientRect() : { left: 0, top: 0 };
    for (const [n, t] of tdTags.entries()) {
      const below = n % 2 === 1;
      const p = on ? view.project('td-' + t.id + (below ? '-b' : '')) : null;
      const show = !!(p && p.visible && p.x > vb.left + 14 && p.x < vb.left + vb.width - 14 && (below ? p.y > vb.top + 8 && p.y < vb.top + vb.height - 34 : p.y > vb.top + 34 && p.y < vb.top + vb.height - 8));
      if (show !== t.on) { t.on = show; t.el.classList.toggle('is-shown', show); t.el.classList.toggle('is-below', below); }
      if (!show) continue;
      t.el.style.setProperty('--x', (p.x - lo.left).toFixed(1) + 'px');
      t.el.style.setProperty('--y', (p.y - lo.top).toFixed(1) + 'px');
    }
    // A mouse over a part on the stage: the pointer says it can be tapped.
    if (td.hoverAt && view.pick && td.active && td.want >= 0) {
      const [x, y] = td.hoverAt;
      td.hoverAt = null;
      const inBox = vb && x > vb.left && x < vb.left + vb.width && y > vb.top && y < vb.top + vb.height;
      const h = inBox ? view.pick(x, y) : null;
      if (h !== td.hover) { td.hover = h; root.classList.toggle('td-hover', !!h); }
    } else if (!td.active && td.hover) { td.hover = null; root.classList.remove('td-hover'); }
  }

  // Tapping a part on the stage shows it, as the list does; the page stays
  // where it is. A tap that closes the open badge does only that.
  let badgeWasOpen = false;
  document.addEventListener('pointerdown', () => { badgeWasOpen = !!document.querySelector('.tier.is-open'); }, true);
  document.addEventListener('click', (e) => {
    if (root.dataset.route !== 'home' || !td.active || td.want < 0 || !vb || badgeWasOpen || performance.now() - td.noClick < 300) return;
    if (e.target.closest('a, button, input, textarea, select, label, .tier, .masthead, .td-side, .td-tag')) return;
    const x = e.clientX, y = e.clientY;
    if (x < vb.left || x > vb.left + vb.width || y < vb.top || y > vb.top + vb.height) return;
    const id = view.pick ? view.pick(x, y) : null;
    const i = id ? TD_STOPS.indexOf(id) : -1;
    if (i > 0 && tdSec.__tdShow) tdSec.__tdShow(i);
  });

  let degrading = false;
  function degrade(why) {
    if (degrading || tier !== '3d') return;
    degrading = true;
    const old = view;
    view = mount2D(stage);
    stage.prepend(view.canvas);
    tier = '2d';
    try { old.destroy(); } catch { /* context may already be gone */ }
    lastSig = '';
    report('2d', why);
  }
  // A lost WebGL context (a phone reclaiming graphics memory) gets one
  // fresh start at low quality, with smaller buffers; only a second loss,
  // or a restart that fails, falls back to 2D.
  let losses = 0;
  function contextLost() {
    if (tier !== '3d' || degrading) return;
    if (++losses > 1) return degrade('the 3D view lost its graphics memory twice here');
    setTimeout(async () => {
      if (tier !== '3d' || degrading) return;
      const old = view;
      try { old.destroy(); } catch { /* already gone */ }
      try {
        view = mount3D(stage, contextLost, 'low');
        stage.prepend(view.canvas);
        if (view.warm) await view.warm(S);
        view.render(S, 0, pointer);
        lastSig = '';
        report('3d', 'restarted at low quality after the phone reclaimed graphics memory');
      } catch {
        view = old;   // destroyed; degrade replaces it
        degrade('the 3D view lost its graphics memory and could not restart');
      }
    }, 300);
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
    else { gsap.ticker.remove(frame); lenis.options.smoothWheel = true; }
  }
  addEventListener('kessel:route', (e) => setActive(e.detail.route === 'home'));
  setActive(root.dataset.route === 'home');
  // Land where the site asked for (a deep link, or the hero after the
  // film) now that the live layout has replaced the stills.
  const land = window.__kesselSite && window.__kesselSite.anchor();
  if (land) { lenis.resize(); lenis.scrollTo(land, { immediate: true, force: true }); }

  window.__kessel = { S, get s() { return sCur; }, storyAt, lenis, ScrollTrigger, get tier() { return tier; }, get view() { return view; },
    get td() { return { active: td.active, stop: td.want, k: td.k, box: vb, hl: td.hl, clip: td.cur ? td.cur.clip : 0 }; },
    get watchdog() { return { on: wdOn, ...wd.stats() }; } };
  return tier;
}
