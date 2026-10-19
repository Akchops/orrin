// The live layer: pins, scroll -> story time, pointer, render loop, the
// adaptive-quality watchdog and the interactive teardown. Called by main.js
// with the libraries already started; it reports every tier change back
// through `report`.
import { buildStory, createState, STORY_END, FILM_END, TEAR_CAPTIONS } from './story.js';
import { distanceAt } from './textures.js';
import { RAIL, TEAR_CLOSE, partCentre } from './teardown.js';
import { createWatchdog } from './watchdog.js';

const NARROW = '(max-width: 799px), (orientation: portrait) and (max-width: 1100px)';

export async function bootLive(L, { caps, font, report, mount3D, mount2D }) {
  const { gsap, ScrollTrigger, Lenis } = L;
  gsap.registerPlugin(ScrollTrigger);
  const root = document.documentElement;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const stage = $('#stage');
  const narrowMQ = matchMedia(NARROW);
  const params = new URLSearchParams(location.search);

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
    const y = el === 0 ? 0 : el.getBoundingClientRect().top + window.scrollY;
    if (Math.abs(y - window.scrollY) > innerHeight * 2.5) lenis.scrollTo(y, { immediate: true, force: true });
    else lenis.scrollTo(el, { duration: 1.6 });
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
    // TEARDOWN: one beat per story unit (8.3): the parts leave, eight
    //   captions held, then back together.
    pins.td = pin('#teardown', STORY_END - 17.0);
    return () => { for (const k of Object.keys(pins)) delete pins[k]; };
  });

  // Story time as a piecewise-linear function of scroll, anchored to the
  // pins. One source of truth for the camera.
  let anchors = [[0, 0], [1, STORY_END]];
  // Past this scroll position the site covers the stage completely.
  let coveredAt = Infinity;
  function rebuild() {
    const p = pins;
    if (!p.ap || !p.mo || !p.ct || !p.td) return;
    const pts = [[0, 0], [p.ap.start, 1], [p.ap.end, 3], [p.th.start, 3.6], [p.th.end, 7.2], [p.ex.start, 7.8], [p.ex.end, 9.0],
      [p.fo.start, 9.6], [p.fo.end, 11.2], [p.mo.start, 11.8], [p.mo.end, 14.2], [p.ws.start, 15.2], [p.ct.start, FILM_END],
      [p.td.start, 17.0], [p.td.end, STORY_END]];
    for (let i = 1; i < pts.length; i++) if (pts[i][0] <= pts[i - 1][0]) pts[i][0] = pts[i - 1][0] + 1;
    anchors = pts;
    coveredAt = p.td.end + innerHeight;
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
  const pointer = { x: 0, y: 0, spin: 0, tx: 0, ty: 0, tspin: 0 };
  const fine = matchMedia('(pointer: fine)').matches;
  let lastInput = 0, drag = null;
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') {
      pointer.tx = (e.clientX / innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / innerHeight) * 2 - 1;
      lastInput = performance.now();
      td.hoverAt = [e.clientX, e.clientY];
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
  const models = $$('.film .model');
  let activeModel = -1, readOn = false, lastRead = '', covered = false;
  // Teardown: labels that follow the parts, and one caption at a time.
  const tdTags = $$('.td-tag').map((el) => ({ el, id: el.dataset.part, on: false, w: 0 }));
  const tdCaps = new Map($$('.td-cap').map((el) => [el.dataset.part, el]));
  const tdIntro = $('.td-intro'), tdOutro = $('.td-outro');
  let tdState = '';
  const tdSection = $('#teardown');
  const tagsLayer = $('.td-tags'), tierEl = $('#tier');
  // Selection (tap a part or its name on the rail): the camera flies to a
  // close-up blended over the scroll camera by td.f (0..1).
  // td.e (0..1) is the picked part's emphasis, which comes up first; td.f
  // follows a moment later and carries the camera in.
  const td = { sel: null, e: 0, f: 0, tween: null, y0: 0, hover: null, hoverAt: null, railKey: '', capKey: '' };

  // ------------------------------------------------------------ the loop
  let sCur = 0, last = performance.now(), lastSig = '', resized = 0;
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
    // The close-up camera is blended into S for one frame only: put the
    // scroll camera back first (keys no tween covers here would otherwise
    // keep the close-up after the part is closed).
    if (camDirty) { Object.assign(S, camBase); camDirty = false; }
    const tSec = (now - t0) / 1000;
    const target = storyAt(window.scrollY);
    sCur += (target - sCur) * (1 - Math.exp(-dt / 0.09));
    if (Math.abs(target - sCur) < 1e-4) sCur = target;
    storyTl.time(Math.min(STORY_END, Math.max(0, sCur)));
    if (td.sel && !td.leaving && !td.backPending && (Math.abs(window.scrollY - td.y0) > 60 || !isApart())) deselect();
    teardownState();

    const k = 1 - Math.exp(-dt / 0.14);
    pointer.x += (pointer.tx - pointer.x) * k;
    pointer.y += (pointer.ty - pointer.y) * k;
    pointer.spin += (pointer.tspin - pointer.spin) * (1 - Math.exp(-dt / (drag ? 0.06 : 0.35)));

    // Once the site has scrolled over the stage there is nothing to draw.
    const cov = window.scrollY > coveredAt;
    if (cov !== covered) { covered = cov; root.classList.toggle('film-covered', cov); lastSig = ''; }
    if (cov) { window.__kessel && (window.__kessel.idle = true); return; }

    // Render only when something changed. Nothing in this scene moves on
    // its own, so a still page costs no GPU time at all: kinder to phone
    // batteries and to slow GPUs that would otherwise queue frames.
    const sig = sCur.toFixed(4) + ',' + pointer.x.toFixed(3) + ',' + pointer.y.toFixed(3) + ',' + pointer.spin.toFixed(3) + ',' + resized +
      ',' + S.hl + ',' + S.dim.toFixed(3) + ',' + td.f.toFixed(4) + ',' + td.e.toFixed(3) + ',' + (td.sel || '');
    const changed = sig !== lastSig;
    lastSig = sig;
    window.__kessel && (window.__kessel.idle = !changed && !td.tween);
    if (!changed) return;
    // The lens holds still under the pointer in a close-up.
    pointer.tilt = 1 - ease(td.f);
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

    placeTeardown();

    // Focus readout: what the index mark points at.
    const wantRead = sCur > 9.55 && sCur < 11.3;
    if (wantRead !== readOn) { readOn = wantRead; readout.classList.toggle('is-on', wantRead); }
    if (wantRead) {
      const d = distanceAt(S.focus);
      const txt = d === Infinity ? '∞' : (d >= 10 ? d.toFixed(0) : d.toFixed(1)) + ' m';
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
  // The parts are apart (and can be picked) between these story times.
  const APART = [18.6, 23.6];
  const isApart = () => sCur > APART[0] && sCur < APART[1];
  const capAt = (s) => TEAR_CAPTIONS.find((c) => s >= c.from && s < c.to);

  // Per frame, after the scroll timeline has set S: which part is bright
  // (the one being explained, or the one picked), how much the others dim,
  // and the close-up camera blended over the scroll camera.
  const cen = [0, 0, 0];
  const ease = (t) => t * t * (3 - 2 * t);
  const CAM_KEYS = ['az', 'el', 'frame', 'tx', 'ty', 'tz', 'sx', 'sy', 'oroll'];
  const camBase = {};
  let camDirty = false;
  function teardownState() {
    let hl = '', dim = 0;
    if (isApart()) {
      const c = capAt(sCur);
      if (c) {
        hl = c.id;
        dim = 0.5 * Math.min(1, (sCur - APART[0]) / 0.25, (APART[1] - sCur) / 0.25);
      }
    }
    // Short phones (Safari's visible area is ~664 px tall at 390 wide): the
    // exploded line is framed a little smaller, so its ends clear the badge
    // and the caption panel. Eased in and out with the teardown.
    const n = narrowMQ.matches;
    const short = n ? Math.min(1.3, Math.max(1, 2.16 / (innerHeight / innerWidth))) : 1;
    const shrink = 1 + (short - 1) * Math.min(1, Math.max(0, (sCur - 16.5) / 0.5), Math.max(0, (24.8 - sCur) / 1.3));
    if (td.sel || shrink > 1) { for (const key of CAM_KEYS) camBase[key] = S[key]; camDirty = true; }
    S.frame *= shrink;
    if (td.sel) {
      hl = td.sel;
      dim = Math.max(dim * (1 - td.e), 0.8 * td.e);
      const k = ease(td.f), c = TEAR_CLOSE[td.sel];
      partCentre(td.sel, S.tear, S.tspread || 1, cen);
      const pose = {
        az: c.az, el: c.el, frame: c.r * (n ? 1.55 : 1.3) * short, tx: cen[0], ty: cen[1], tz: cen[2],
        sx: n ? 0 : -0.17, sy: n ? 0.15 : 0.02, oroll: 0,
      };
      for (const key in pose) S[key] += (pose[key] - S[key]) * k;
    }
    S.hl = hl;
    S.dim = dim;
  }

  // The parts rail, built here because it only exists while the lens is
  // live: one button per part, named from the labels already in the page.
  const rail = document.createElement('nav');
  rail.className = 'td-rail';
  rail.setAttribute('aria-label', 'Parts of the lens');
  const names = new Map(tdTags.map((t) => [t.id, t.el.querySelector('.td-tag__text').textContent]));
  rail.innerHTML = '<ol>' + RAIL.map((id, i) => `<li><button type="button" class="td-chip" data-part="${id}" aria-pressed="false">` +
    `<span class="td-chip__no">${String(i + 1).padStart(2, '0')}</span><span class="td-chip__name">${names.get(id) || id}</span></button></li>`).join('') + '</ol>';
  const chips = new Map([...rail.querySelectorAll('.td-chip')].map((b) => [b.dataset.part, b]));
  tdSection && tdSection.appendChild(rail);
  // One Back button, moved into whichever caption is open.
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'td-back';
  back.innerHTML = '<span aria-hidden="true">←</span><span class="td-back__txt"> All parts</span>';
  back.setAttribute('aria-label', 'Back to all parts');
  back.addEventListener('click', (e) => { e.stopPropagation(); deselect(); });

  // Story time -> scroll position (the inverse of storyAt), for the rail.
  function yFor(s) {
    let lo = 0, hi = ScrollTrigger.maxScroll(window);
    for (let i = 0; i < 32; i++) { const m = (lo + hi) / 2; if (storyAt(m) < s) lo = m; else hi = m; }
    return hi;
  }

  function select(id, { hold = false } = {}) {
    if (!id) return;
    if (td.sel === id) { deselect(); return; }
    if (!isApart()) {
      // From the rail before the parts are out (or after they went back):
      // go to that part's place in the teardown first.
      const c = TEAR_CAPTIONS.find((x) => x.id === id);
      lenis.scrollTo(yFor(c ? c.from + 0.3 : 19), { immediate: true, force: true });
      sCur = storyAt(window.scrollY);
    }
    const had = !!td.sel;
    td.sel = id;
    td.tok = (td.tok || 0) + 1;
    td.backPending = false;
    td.y0 = window.scrollY;
    try { history[had ? 'replaceState' : 'pushState']({ kTd: id }, ''); } catch { /* sandboxed */ }
    td.tween && td.tween.kill();
    // First the part lights up and the others dim, then the camera flies
    // in, so the visitor sees what they picked before the view moves.
    // (hold: stop after the first step; a test hook.)
    td.tween = gsap.timeline({ onComplete: () => { td.tween = null; } })
      .to(td, { e: 1, duration: 0.3, ease: 'power1.out' }, 0);
    if (!hold) td.tween.to(td, { f: 1, duration: had ? 0.6 : 0.9, ease: 'power2.inOut' }, had ? 0 : 0.3);
    root.classList.add('td-picked');
    td.capKey = '';
  }
  function deselect(fromHistory = false) {
    if (!td.sel || td.leaving) return;
    if (!fromHistory && history.state && history.state.kTd) {
      // Undo our history entry, once; popstate calls back here. If the
      // browser does not answer (a sandboxed frame), close anyway.
      if (td.backPending) return;
      td.backPending = true;
      history.back();
      // The fallback only ever closes the part it was asked to close.
      const tok = td.tok;
      setTimeout(() => { if (td.tok === tok && td.sel && !td.leaving) deselect(true); }, 350);
      return;
    }
    td.backPending = false;
    td.leaving = true;
    td.tween && td.tween.kill();
    root.classList.remove('td-picked');
    td.tween = gsap.to(td, { f: 0, e: 0, duration: 0.7, ease: 'power2.inOut', onComplete: () => { td.sel = null; td.leaving = false; td.tween = null; td.capKey = ''; } });
    td.capKey = '';
  }
  addEventListener('popstate', () => { if (td.sel) deselect(true); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && td.sel) deselect(); });
  rail.addEventListener('click', (e) => {
    const b = e.target.closest('.td-chip');
    if (b) { e.stopPropagation(); select(b.dataset.part); }
  });
  // Tapping the scene: the part under the finger (or pointer), if any.
  // Tapping empty space while a part is open goes back.
  // A tap that closes the open badge does only that.
  let badgeWasOpen = false;
  document.addEventListener('pointerdown', () => { badgeWasOpen = !!document.querySelector('.tier.is-open'); }, true);
  document.addEventListener('click', (e) => {
    if (root.dataset.route !== 'home' || !isApart() || badgeWasOpen) return;
    if (e.target.closest('a, button, input, textarea, select, label, .tier, .masthead, .td-rail, .td-copy')) return;
    const tag = e.target.closest('.td-tag');
    if (tag) { select(tag.dataset.part); return; }
    const id = view.pick ? view.pick(e.clientX, e.clientY) : null;
    if (id) select(id);
    else if (td.sel) deselect();
  });

  // Labels, captions and the rail. Labels follow the parts while they are
  // apart: every label on wide screens (the featured one bright), only the
  // featured one on phones; the leader points away from the centre of the
  // exploded lens, as on the Orrin watch. With a part open, only its label
  // and its caption (beside it on wide screens, in the panel on phones).
  function placeTeardown() {
    const s = sCur;
    const cap = capAt(s);
    const sel = td.sel && !td.leaving ? td.sel : null;
    // The caption becomes a card beside the part once the camera is on its
    // way in; until then it is the part's usual caption.
    const close = !!sel && td.f > 0.4;
    const state = sel ? (close ? 'sel:' : 'cap:') + sel : s < 18.55 ? (s > 16.9 ? 'intro' : '') : s < 23.55 ? 'cap:' + (cap ? cap.id : '') : s < STORY_END + 0.01 ? 'outro' : '';
    if (state !== tdState) {
      tdState = state;
      tdIntro && tdIntro.classList.toggle('is-on', state === 'intro');
      tdOutro && tdOutro.classList.toggle('is-on', state === 'outro');
      for (const [id, el] of tdCaps) {
        const on = state === 'sel:' + id || state === 'cap:' + id;
        el.classList.toggle('is-on', on);
        el.classList.toggle('is-selected', state === 'sel:' + id);
      }
      if (sel) tdCaps.get(sel)?.appendChild(back); else back.remove();
      td.capKey = '';
    }
    const narrow = narrowMQ.matches;
    // The rail: shown through the teardown; the part being explained or
    // the open one is marked.
    const railOn = s > 16.95 && s < 23.9;
    const cur = sel || (isApart() && cap ? cap.id : '');
    const rk = railOn + '|' + cur + '|' + (td.sel || '');
    if (rk !== td.railKey) {
      td.railKey = rk;
      rail.classList.toggle('is-on', railOn);
      for (const [id, b] of chips) {
        b.classList.toggle('is-current', id === cur);
        b.setAttribute('aria-pressed', String(id === td.sel));
      }
      const b = chips.get(cur);
      if (b && narrow && railOn) {
        const r = rail.querySelector('ol'), x = b.offsetLeft - (r.clientWidth - b.offsetWidth) / 2;
        r.scrollTo({ left: x, behavior: 'smooth' });
      }
    }
    // Hover (mouse): the part under the pointer gets a pointer cursor.
    if (td.hoverAt && view.pick && isApart()) {
      const h = view.pick(td.hoverAt[0], td.hoverAt[1]);
      td.hoverAt = null;
      if (h !== td.hover) { td.hover = h; root.classList.toggle('td-hover', !!h); }
    } else if (!isApart() && td.hover) { td.hover = null; root.classList.remove('td-hover'); }
    // The labels and the open card are fixed inside the pinned section,
    // which makes the section their containing block: viewport points are
    // shifted by its offset (the page gutter).
    const lo = tagsLayer ? tagsLayer.getBoundingClientRect() : { left: 0, top: 0 };
    // Open caption beside the part on wide screens: the close-up puts the
    // part's centre at a known place, left of centre, so the card goes to
    // its right, clear of the rail.
    if (close && !narrow) {
      const el = tdCaps.get(sel), W = innerWidth, H = innerHeight;
      const cx = W / 2 - 0.17 * W, rpx = (Math.min(W, H) / 2) / 1.3;
      const railL = rail.getBoundingClientRect().left || W;
      const w = Math.min(352, railL - (cx + rpx * 0.75) - 40);
      const key = W + 'x' + H + ':' + sel;
      if (el && key !== td.capKey) {
        td.capKey = key;
        el.style.setProperty('--card-x', Math.max(cx + rpx * 0.75 + 24, W * 0.5) - lo.left + 'px');
        el.style.setProperty('--card-w', Math.max(260, w) + 'px');
        el.style.setProperty('--card-y', (H / 2 - 0.02 * H) - lo.top + 'px');
      }
    }

    const apart = s > 18.45 && s < 23.75;
    const center = view.project('__target');
    // Names flip to the left before they would run into the rail.
    const rightEdge = !narrow && railOn ? rail.getBoundingClientRect().left - 12 : innerWidth - 8;
    const pill = narrow && tierEl && tierEl.offsetParent ? tierEl.getBoundingClientRect() : null;
    for (const t of tdTags) {
      const featured = sel ? t.id === sel : !!cap && cap.id === t.id;
      // In the close-up only the open part's label, straight above it;
      // while the camera flies, none.
      const inClose = !!sel && td.f > 0.85, flying = !!sel && td.f > 0.05 && !inClose;
      const want = apart && !flying && (sel ? featured : featured || !narrow);
      const below = !inClose && !narrow && RAIL.indexOf(t.id) % 2 === 1;
      const p = want ? view.project('td-' + t.id + (below ? '-b' : '')) || view.project('td-' + t.id) : null;
      const show = !!(p && p.visible);
      if (show !== t.on) { t.on = show; t.el.classList.toggle('is-on', show); }
      t.el.classList.toggle('is-featured', featured);
      if (!show) continue;
      let dx = p.x - (center ? center.x : innerWidth / 2), dy = p.y - (center ? center.y : innerHeight / 2);
      // Close-up: straight up from the part. Wide screens: labels alternate
      // above and below the line, so neighbours never collide.
      if (inClose) { dx = 0.5; dy = -1; } else if (!narrow) { dx = 0.3; dy = below ? 1 : -1; }
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const L = narrow ? 30 : 46;
      let ex = dx * L;
      let ey = dy * L - 6;
      // Keep the name below the header (and, on phones, below the badge's
      // tap area); a name pushed down beside the badge goes to the left of
      // its part instead, so it covers neither the part's dot nor the pill.
      const top = (pill ? pill.bottom + 22 : narrow ? 112 : 92) - p.y;
      let forceLeft = false;
      if (ey < top) {
        ey = top;
        if (pill && p.x + ex + (t.w || 110) > pill.left - 8) { ex = -L; forceLeft = true; }
      }
      if (!t.w) t.w = t.el.querySelector('.td-tag__text').offsetWidth || 110;
      let left = dx < 0 || forceLeft;
      if (!left && p.x + ex + t.w > rightEdge) left = true;
      else if (left && p.x + ex - t.w < 8) left = false;
      // A name level with its dot sits on the side it reads towards, so a
      // name flipped for room never covers its own dot.
      if (Math.abs(ey) < 16) ex = left ? -Math.abs(ex) : Math.abs(ex);
      const st = t.el.style;
      st.setProperty('--x', (p.x - lo.left).toFixed(1) + 'px');
      st.setProperty('--y', (p.y - lo.top).toFixed(1) + 'px');
      st.setProperty('--dx', ex.toFixed(1) + 'px');
      st.setProperty('--dy', ey.toFixed(1) + 'px');
      st.setProperty('--len', Math.hypot(ex, ey).toFixed(1) + 'px');
      st.setProperty('--ang', Math.atan2(ey, ex).toFixed(3) + 'rad');
      st.setProperty('--tx', left ? '-100%' : '0%');
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
    else gsap.ticker.remove(frame);
  }
  addEventListener('kessel:route', (e) => setActive(e.detail.route === 'home'));
  setActive(root.dataset.route === 'home');
  // Land where the site asked for (a deep link, or the hero after the
  // film) now that the live layout has replaced the stills.
  const land = window.__kesselSite && window.__kesselSite.anchor();
  if (land) { lenis.resize(); lenis.scrollTo(land, { immediate: true, force: true }); }

  window.__kessel = { S, get s() { return sCur; }, storyAt, lenis, ScrollTrigger, get tier() { return tier; }, get view() { return view; }, select, deselect, get selected() { return td.sel; },
    get watchdog() { return { on: wdOn, ...wd.stats() }; } };
  return tier;
}
