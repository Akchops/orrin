// The cinematic layer: scroll choreography, the render loop, pointer input
// and the part labels. Loaded lazily by entry.js after the probe.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { buildStory, createState, STORY_END } from './story.js';
import { mumbaiSeconds } from './watch/parts.js';

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// Scroll distance per beat (one readable state change). Desktop 700 px:
// below ~350 a fast wheel flick skips a beat, above ~1200 the page feels
// frozen. Phones get 60% of that, because a thumb fling covers far more
// document per gesture. Capped by viewport height so short windows are not
// stuck in a pin.
// Portrait tablets take the phone composition: captions below, watch above.
const NARROW = '(max-width: 767px), (orientation: portrait) and (max-width: 1100px)';
const narrowMQ = matchMedia(NARROW);
const beatPx = () => Math.round(Math.min(narrowMQ.matches ? 420 : 700, innerHeight * 0.95));

// Labels for parts, shown while their stage holds. Times are story units.
const TAGS = [
  { id: 'crown', text: 'Crown', from: 1.55, to: 2.02 },
  { id: 'stem', text: 'Stem', from: 1.7, to: 2.02 },
  { id: 'bridges', text: 'Bridges', from: 4.45, to: 5.02 },
  { id: 'balance', text: 'Balance wheel', from: 4.45, to: 5.02 },
  { id: 'pallet', text: 'Pallet fork', from: 4.5, to: 5.02, wide: true },
  { id: 'escape', text: 'Escape wheel', from: 4.5, to: 5.02 },
  { id: 'train', text: 'Train wheels', from: 4.55, to: 5.02, wide: true },
  { id: 'barrel', text: 'Barrel', from: 4.55, to: 5.02, wide: true },
  { id: 'jewel', text: 'Jewel', from: 4.6, to: 5.02 },
  { id: 'dial', text: 'Dial', from: 5.62, to: 5.98 },
  { id: 'hands', text: 'Hands', from: 5.62, to: 5.98 },
  { id: 'indices', text: 'Applied markers', from: 5.68, to: 5.98, wide: true },
  { id: 'strap', text: 'Strap', from: 6.85, to: 7.35 },
];

export async function boot({ caps, params }) {
  const stage = $('[data-stage]');
  const qa = !!(caps && caps.qa);

  // Canvas textures use the page fonts; wait for them (bounded), so the dial
  // print and caseback engraving are set in Archivo, not a fallback.
  await Promise.race([
    Promise.all([
      document.fonts.load('600 32px Archivo'),
      document.fonts.load('500 32px Archivo'),
    ]).catch(() => {}),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
  const fontFamily = document.fonts.check('600 32px Archivo') ? 'Archivo, Arial, sans-serif' : 'Arial, sans-serif';

  // ---------------------------------------------------------------- renderer
  const S = createState();
  let view = null;
  let tier = 0;
  async function mountTier1() {
    const { mountWebGL } = await import('./watch/stage3d.js');
    const v = mountWebGL(stage, caps, { fontFamily, onContextLost: () => degrade('context') });
    stage.prepend(v.canvas);
    tier = 1;
    return v;
  }
  async function mountTier2() {
    const { mount2D } = await import('./tier2/canvas2d.js');
    const v = mount2D(stage, { fontFamily });
    stage.prepend(v.canvas);
    tier = 2;
    return v;
  }
  view = caps ? await mountTier1() : await mountTier2();

  // From here the cinematic layout applies.
  root.classList.add('live');
  root.dataset.tier = String(tier);

  // ------------------------------------------------------------------ lenis
  history.scrollRestoration = 'manual';
  const lenis = new Lenis({ autoRaf: false, duration: 1.1, smoothWheel: true, syncTouch: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  // Anchor links go through Lenis, so ScrollTrigger never sees a teleport.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const el = id === '#top' ? 0 : document.querySelector(id);
    if (el === null) return;
    e.preventDefault();
    lenis.scrollTo(el, { duration: 1.6 });
    if (id !== '#top') history.replaceState(null, '', id);
  });
  // Keyboard focus moving off-screen: jump there instantly rather than let
  // Lenis pull the focused element back out of view.
  document.addEventListener('focusin', (e) => {
    const r = e.target.getBoundingClientRect?.();
    if (r && (r.bottom < 0 || r.top > innerHeight)) lenis.scrollTo(e.target, { immediate: true, offset: -innerHeight / 3 });
  });

  // ------------------------------------------------------------ story timeline
  let layout = narrowMQ.matches ? 'narrow' : 'wide';
  let storyTl = buildStory(gsap, S, layout);

  // ------------------------------------------------------------- the reel
  const dis = $('#disassembly');
  const reel = document.createElement('div');
  reel.className = 'reel';
  reel.setAttribute('aria-hidden', 'true');
  reel.innerHTML = '<div class="reel__strip"><span>I</span><span>II</span><span>III</span><span>IV</span></div>';
  dis.appendChild(reel);
  const reelStrip = reel.firstElementChild;

  // -------------------------------------------------------- scroll triggers
  const mm = gsap.matchMedia();
  let stDis, stModels, stWork;
  const beats = $$('.beat', dis);
  const capParts = (b) => $$('.beat__cap > :not(.beat__num):not(.parts)', b);

  // Re-runs (and reverts the previous run) whenever the composition flips.
  mm.add({ narrow: NARROW, any: 'all' }, () => {
    // Hero: the wordmark comes apart letter by letter as the camera leaves
    // for the crown, the same idea as the watch at typographic scale.
    const letters = $$('.hero__word > span');
    gsap.timeline({
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 },
    })
      .to(letters, {
        xPercent: (i) => (i - 2) * 55,
        yPercent: (i) => [-14, 22, -30, 18, -10][i],
        rotate: (i) => [-8, 5, -3, 7, -6][i],
        ease: 'none',
      }, 0)
      .to('.hero__mark', { opacity: 0.12, ease: 'power1.in' }, 0)
      .to('.hero__cue', { opacity: 0, ease: 'none', duration: 0.3 }, 0);

    // DISASSEMBLY — 6 beats x beatPx() = 4200 px desktop, 2520 px phone.
    //   beat 1  crown unscrews, stem draws out
    //   beat 2  round to the back, caseback off, movement starts to lift
    //   beat 3  movement out, gears separate and spin into place
    //   beat 4  hold on the exploded movement with its labels
    //   beat 5  dial falls away, hands float clear
    //   beat 6  parts fly home, straps swing back on
    // Six because the brief names four stages and the movement needs three
    // beats of its own to be read: off, apart, held. Fewer and the explosion
    // becomes a blur; more and the hold feels frozen.
    const capTl = gsap.timeline({ defaults: { ease: 'none' } });
    // Captions wipe through a horizontal aperture (clip-path) while sliding
    // a short way, timed to the scene: each one changes as its stage starts.
    const windows = [[0, 1.0], [1.0, 3.95], [3.95, 4.95], [4.95, 6]];
    beats.forEach((b, i) => {
      const parts = capParts(b);
      const [a, z] = windows[i];
      if (i > 0) {
        capTl.fromTo(parts,
          { clipPath: 'inset(0% 0% 100% 0%)', y: 28 },
          { clipPath: 'inset(0% 0% 0% 0%)', y: 0, stagger: 0.04, duration: 0.2, ease: 'power2.out' }, a + 0.04);
      }
      if (i < beats.length - 1) {
        capTl.to(parts, { clipPath: 'inset(100% 0% 0% 0%)', y: -22, stagger: 0.03, duration: 0.16, ease: 'power2.in' }, z - 0.14);
      }
    });
    // The date-window reel rolls one numeral per stage, in step with the captions.
    capTl.fromTo(reelStrip, { yPercent: 0 }, { yPercent: -25, duration: 0.18, ease: 'power2.inOut' }, 0.93)
      .to(reelStrip, { yPercent: -50, duration: 0.18, ease: 'power2.inOut' }, 3.88)
      .to(reelStrip, { yPercent: -75, duration: 0.18, ease: 'power2.inOut' }, 4.88)
      .set({}, {}, 6);
    stDis = ScrollTrigger.create({
      trigger: dis,
      start: 'top top',
      end: () => '+=' + 6 * beatPx(),
      pin: true,
      scrub: 0.5,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      animation: capTl,
    });

    // MODELS — 5 beats x 0.8 beatPx() = 2800 px desktop, 1680 px phone.
    // One beat per model: half a beat held, half morphing. 0.8 because a
    // colour change is a lighter read than a mechanical one.
    stModels = ScrollTrigger.create({
      trigger: '#models',
      start: 'top top',
      end: () => '+=' + Math.round(5 * 0.8 * beatPx()),
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    });

    stWork = ScrollTrigger.create({ trigger: '#workshop', start: 'top top', end: 'bottom top' });

    return () => { stDis = stModels = stWork = null; };
  });

  // Story time as a piecewise-linear function of scroll, anchored to the
  // triggers above. One source of truth: the watch never depends on which
  // trigger happened to update last.
  let anchors = [[0, 0], [1, STORY_END]];
  function rebuildAnchors() {
    const max = ScrollTrigger.maxScroll(window);
    if (!stDis || !stModels || !stWork) return;
    const pts = [
      [0, 0],
      [stDis.start, 1], [stDis.end, 7],
      [stModels.start, 8], [stModels.end, 13],
      [stWork.start, 14],
      [max, STORY_END],
    ];
    // Guard against equal positions on very short viewports.
    for (let i = 1; i < pts.length; i++) if (pts[i][0] <= pts[i - 1][0]) pts[i][0] = pts[i - 1][0] + 1;
    anchors = pts;
  }
  function storyAt(y) {
    for (let i = 1; i < anchors.length; i++) {
      const [y0, s0] = anchors[i - 1], [y1, s1] = anchors[i];
      if (y <= y1) return s0 + (s1 - s0) * Math.max(0, (y - y0) / (y1 - y0));
    }
    return STORY_END;
  }
  ScrollTrigger.addEventListener('refresh', rebuildAnchors);

  narrowMQ.addEventListener('change', () => {
    const t = storyTl.time();
    storyTl.kill();
    layout = narrowMQ.matches ? 'narrow' : 'wide';
    storyTl = buildStory(gsap, S, layout);
    storyTl.time(t);
  });

  // ----------------------------------------------------------------- pointer
  // Mouse: tilt toward the cursor. Touch: horizontal drags turn the watch and
  // spring back; vertical drags stay native scroll (touch-action: pan-y).
  const pointer = { x: 0, y: 0, spin: 0, tx: 0, ty: 0, tspin: 0 };
  const fine = matchMedia('(pointer: fine)').matches;
  let lastInput = 0;
  let drag = null;
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') {
      pointer.tx = (e.clientX / innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / innerHeight) * 2 - 1;
      lastInput = performance.now();
    } else if (drag && e.pointerId === drag.id) {
      pointer.tspin = drag.spin + ((e.clientX - drag.x) / innerWidth) * 2.2;
      lastInput = performance.now();
    }
  }, { passive: true });
  addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') drag = { id: e.pointerId, x: e.clientX, spin: pointer.tspin };
  }, { passive: true });
  const endDrag = () => { drag = null; pointer.tspin = 0; };
  addEventListener('pointerup', endDrag, { passive: true });
  addEventListener('pointercancel', endDrag, { passive: true });

  // Device tilt, offered on touch screens behind an explicit button (iOS
  // needs a user gesture to grant it; some embedded views refuse it).
  const tiltBtn = $('#tilt-toggle');
  let gyro = false;
  if (!fine && tiltBtn && 'DeviceOrientationEvent' in window) {
    tiltBtn.hidden = false;
    let base = null;
    const onOrient = (e) => {
      if (e.gamma == null) return;
      if (!base) base = { b: e.beta, g: e.gamma };
      pointer.tx = Math.max(-1, Math.min(1, (e.gamma - base.g) / 30));
      pointer.ty = Math.max(-1, Math.min(1, (e.beta - base.b) / 30));
      lastInput = performance.now();
      gyro = true;
    };
    tiltBtn.addEventListener('click', async () => {
      if (tiltBtn.getAttribute('aria-pressed') === 'true') {
        removeEventListener('deviceorientation', onOrient);
        tiltBtn.setAttribute('aria-pressed', 'false');
        tiltBtn.textContent = 'Tilt your phone to move the light';
        gyro = false;
        return;
      }
      try {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
          const res = await DeviceOrientationEvent.requestPermission();
          if (res !== 'granted') throw new Error('denied');
        }
        base = null;
        addEventListener('deviceorientation', onOrient);
        tiltBtn.setAttribute('aria-pressed', 'true');
        tiltBtn.textContent = 'Tilt on · tap to stop';
        setTimeout(() => {
          if (!gyro) {
            removeEventListener('deviceorientation', onOrient);
            tiltBtn.setAttribute('aria-pressed', 'false');
            tiltBtn.textContent = 'Tilt is not available here. Drag sideways to turn the watch.';
          }
        }, 1500);
      } catch {
        tiltBtn.textContent = 'Tilt is not available here. Drag sideways to turn the watch.';
      }
    });
    // Offer it briefly, then step out of the way.
    setTimeout(() => { if (!gyro) tiltBtn.hidden = true; }, 9000);
  }

  // ------------------------------------------------------------------- tags
  const tagLayer = $('[data-tags]');
  const tags = TAGS.map((t) => {
    const el = document.createElement('div');
    el.className = 'tag';
    el.innerHTML = '<span class="tag__dot"></span><span class="tag__line"></span><span class="tag__text"></span>';
    el.querySelector('.tag__text').textContent = t.text;
    tagLayer.appendChild(el);
    return { ...t, el, on: false };
  });
  let railRight = 0;
  const measureRail = () => { const b = $('.beat__cap'); railRight = b ? b.getBoundingClientRect().right + 24 : 0; };
  measureRail();
  addEventListener('resize', measureRail);
  function placeTags(s) {
    const center = view.project('__target');
    for (const t of tags) {
      const want = s >= t.from && s <= t.to && !(t.wide && narrowMQ.matches);
      if (want !== t.on) { t.on = want; t.el.classList.toggle('is-on', want); }
      if (!want) continue;
      const p = view.project(t.id);
      // Hidden when off-stage, or when it would land under the caption rail.
      if (!p || !p.visible || (!narrowMQ.matches && p.x < railRight)) { t.el.classList.remove('is-on'); t.on = false; continue; }
      // Leader line points away from the subject's centre, so labels fan out
      // around the object instead of piling onto it.
      let dx = p.x - (center ? center.x : innerWidth / 2), dy = p.y - (center ? center.y : innerHeight / 2);
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const L = narrowMQ.matches ? 30 : 54;
      const ex = dx * L, ey = dy * L - 6;
      const st = t.el.style;
      st.setProperty('--x', p.x.toFixed(1) + 'px');
      st.setProperty('--y', p.y.toFixed(1) + 'px');
      st.setProperty('--dx', ex.toFixed(1) + 'px');
      st.setProperty('--dy', ey.toFixed(1) + 'px');
      st.setProperty('--len', Math.hypot(ex, ey).toFixed(1) + 'px');
      st.setProperty('--ang', Math.atan2(ey, ex).toFixed(3) + 'rad');
      // Keep the text inside the viewport: flip it to the other side of its
      // leader when it would run off an edge.
      if (!t.w) t.w = t.el.querySelector('.tag__text').offsetWidth || 90;
      let left = dx < 0;
      if (!left && p.x + ex + t.w > innerWidth - 8) left = true;
      else if (left && p.x + ex - t.w < 8) left = false;
      st.setProperty('--tx', left ? '-100%' : '0%');
    }
  }

  // ---------------------------------------------------------------- subdial
  const subdial = $('[data-subdial]');
  const hand = $('[data-subdial-hand]');
  const ticks = $('.subdial__ticks');
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, r0 = i % 15 === 0 ? 24 : 26.5, r1 = 28;
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', 32 + Math.sin(a) * r0); l.setAttribute('y1', 32 - Math.cos(a) * r0);
    l.setAttribute('x2', 32 + Math.sin(a) * r1); l.setAttribute('y2', 32 - Math.cos(a) * r1);
    ticks.appendChild(l);
  }
  const subLabels = $$('.subdial__label', subdial);
  let subOn = false, subStage = -1;

  // --------------------------------------------------------------- nav state
  const navLinks = $$('.masthead__nav a');
  const navFor = (s) => (s < 0.9 ? -1 : s < 7.5 ? 0 : s < 13.2 ? 1 : s < 15.2 ? 2 : 3);
  let navIdx = -2;

  const models = $$('.model');
  let activeModel = -1;

  // ------------------------------------------------------------ render loop
  let sCur = 0;
  let last = performance.now();
  const clock0 = 10 * 3600 + 10 * 60 + 31;    // the still shows 10:10:31
  let introStart = -1;
  let slow = 0, fast = 0;
  const t0 = performance.now();

  function frame() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const tSec = (now - t0) / 1000;

    // Scroll -> story time, with a short critical damping on top of Lenis so
    // touch scrolling (which Lenis leaves native) is smoothed too.
    const target = storyAt(window.scrollY);
    sCur += (target - sCur) * (1 - Math.exp(-dt / 0.09));
    if (Math.abs(target - sCur) < 1e-4) sCur = target;
    storyTl.time(Math.min(STORY_END, Math.max(0, sCur)));

    // Pointer damping; idle sway on touch so light keeps moving over the metal.
    const idle = now - lastInput > 2500;
    if (!fine && idle && !gyro && !drag) {
      pointer.tx = Math.sin(tSec * 0.45) * 0.35;
      pointer.ty = Math.sin(tSec * 0.31 + 1.3) * 0.18;
    }
    const k = 1 - Math.exp(-dt / 0.14);
    pointer.x += (pointer.tx - pointer.x) * k;
    pointer.y += (pointer.ty - pointer.y) * k;
    pointer.spin += (pointer.tspin - pointer.spin) * (1 - Math.exp(-dt / (drag ? 0.06 : 0.35)));

    // The watch sets itself: from the still's 10:10 to Mumbai time.
    const live = mumbaiSeconds();
    if (introStart >= 0) {
      const q = Math.min(1, (now - introStart) / 1800);
      const e = q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
      let delta = live - clock0;
      if (delta < 0) delta += 43200;
      S.clock = clock0 + delta * e;
      if (q >= 1) introStart = -2;
    } else S.clock = introStart === -2 ? live : clock0;

    view.render(S, tSec, pointer);
    placeTags(sCur);

    // Sub-dial: visible through the disassembly, its hand sweeping the stages.
    const inDis = sCur > 0.95 && sCur < 7.2;
    if (inDis !== subOn) { subOn = inDis; subdial.classList.toggle('is-on', inDis); }
    if (inDis) {
      const p = Math.min(1, Math.max(0, (sCur - 1) / 6));
      hand.style.transform = `rotate(${(p * 360).toFixed(1)}deg)`;
      const stg = sCur < 2 ? 0 : sCur < 5 ? 1 : sCur < 6 ? 2 : 3;
      if (stg !== subStage) { subStage = stg; subLabels.forEach((l, i) => l.classList.toggle('is-on', i === stg)); }
    }
    const ni = navFor(sCur);
    if (ni !== navIdx) { navIdx = ni; navLinks.forEach((a, i) => a.toggleAttribute('aria-current', i === ni)); }
    const am = Math.round(S.model);
    if (sCur > 7.4 && sCur < 13.6) {
      if (am !== activeModel) { activeModel = am; models.forEach((m, i) => m.classList.toggle('is-active', i === am)); }
    } else if (activeModel !== -1) { activeModel = -1; models.forEach((m) => m.classList.remove('is-active')); }

    // Adaptive quality: sustained frames over 22 ms (under ~45 fps) step the
    // resolution down; sustained headroom steps it back up. Only after a
    // continuous run, so one long frame never demotes the scene.
    if (!qa && tier === 1) {
      if (dt > 0.022) { slow++; fast = 0; } else { fast++; slow = Math.max(0, slow - 1); }
      if (slow > 90) {
        slow = 0;
        const d = view.getDPR();
        if (d > 1.01) view.setDPR(Math.max(1, d - 0.25));
        else degrade('slow');
      } else if (fast > 600) {
        fast = 0;
        view.setDPR(view.getDPR() + 0.25);
      }
    }
  }

  // Context loss or a GPU that cannot keep up: drop to the Canvas 2D tier,
  // which traces the same disassembly. Content never depends on either.
  let degrading = false;
  async function degrade() {
    if (degrading || tier !== 1) return;
    degrading = true;
    const old = view;
    try { view = await mountTier2(); } catch { degrading = false; return; }
    root.dataset.tier = '2';
    try { old.destroy(); } catch { /* context may already be gone */ }
    root.classList.add('scene-ready');
  }

  // Resize: the renderer follows the stage; ScrollTrigger refreshes itself.
  const ro = new ResizeObserver(() => view.resize());
  ro.observe(stage);

  // Compile shaders before the first visible frame, then reveal.
  if (view.warm) await view.warm(S);
  ScrollTrigger.refresh();
  rebuildAnchors();
  sCur = storyAt(window.scrollY);
  storyTl.time(sCur);
  frame();
  gsap.ticker.add(frame);

  // If the visitor arrived on a #section, take them there in the new layout.
  if (location.hash && location.hash.length > 1) {
    const el = document.querySelector(location.hash);
    if (el) lenis.scrollTo(el, { immediate: true });
  }

  requestAnimationFrame(() => {
    root.classList.add('scene-ready');
    introStart = performance.now() + 400;
  });

  window.__orrin = { S, get s() { return sCur; }, lenis, ScrollTrigger, get tier() { return tier; }, _storyAt: storyAt };
  return { view, lenis };
}
