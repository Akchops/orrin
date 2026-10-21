// The lens viewers on the Lenses pages: the three lenses standing side by
// side at one scale (#lenses), and each lens on its own page as a model to
// turn and zoom. The same lens, materials and studio as the film, in a
// small scene of their own. WebGL only, on the same terms as the film
// (src/app/main.js decides); otherwise the rendered still under each
// viewer is what the visitor sees, and it is also what shows until the
// first frame is drawn.
//
// Markup (src/site/pages/lenses.js, lens.js): an element with
// data-viewer="lineup" or data-viewer="0" | "1" | "2" (the model) holding
// the still <img>. The canvas covers the still exactly, so the swap does
// not move the picture: the lens pages use the stills' own camera.
import { buildEnvironment } from './env.js';
import { buildLens } from './lens.js';
import { scaleTexture, frontRingTexture, rearBarrelTexture } from './textures.js';
import { createState } from './story.js';

const DEG = Math.PI / 180;
// The stills' pose (src/app/stills.js lens-1..3): camera angles, the
// half-height in mm that fills the frame, and the point it aims at. The
// three lenses are a matched set, one body, so they share it.
const POSE = [0, 1, 2].map(() => ({ az: 38, el: 11, frame: 54, ty: 0, tz: -50 }));
// Lens length in mm, mount to front, the same for all three.
const LEN = [99, 99, 99];
// The lineup: where each lens stands across the still, as a share of its
// width (the label columns on #lenses follow the same three places).
const LINEUP_X = [0.1594, 0.5, 0.8406];
const SLUG = ['shaniwar', 'parvati', 'sinhagad'];

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function mountViewer(el, L, caps, { font }) {
  const T = L.THREE;
  const lineup = el.dataset.viewer === 'lineup';
  const models = lineup ? [0, 1, 2] : [Math.max(0, Math.min(2, +el.dataset.viewer || 0))];
  const img = el.querySelector('img');
  const quality = caps.tier === 'high' ? 'high' : 'medium';

  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  const deviceDPR = window.devicePixelRatio || 1;
  let dpr = Math.min(deviceDPR, quality === 'high' ? 2 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.NeutralToneMapping;
  renderer.toneMappingExposure = 1.22;
  const canvas = renderer.domElement;
  canvas.className = 'viewer__gl';
  canvas.setAttribute('aria-hidden', 'true');

  // The film's studio, with a little of the teardown's light, so a lens
  // turned by hand never sinks into the page on its dark side.
  const scene = new T.Scene();
  const env = buildEnvironment(T, renderer, quality === 'high' ? 512 : 256);
  scene.environment = env.texture;
  scene.environmentIntensity = 1.45;
  const key = new T.DirectionalLight(0xfff3e6, 2.6);
  key.position.set(40, 70, 120);
  const rim = new T.DirectionalLight(0xdfe6ff, 1.9);
  rim.position.set(-140, 120, -160);
  const rim2 = new T.DirectionalLight(0xffe2c4, 0.8);
  rim2.position.set(150, -90, -60);
  scene.add(key, key.target, rim, rim.target, rim2, rim2.target);

  // Only the lenses on show get their scale and front label.
  const textures = {
    scale: [0, 1, 2].map((k) => (models.includes(k) ? scaleTexture(T, font, k) : null)),
    front: [0, 1, 2].map((k) => (models.includes(k) ? frontRingTexture(T, font, quality === 'high' && !lineup ? 2048 : 1024, k) : null)),
    rear: rearBarrelTexture(T, font),
  };
  const items = models.map((m, i) => {
    const lens = buildLens(T, L, { quality, textures, font });
    const S = Object.assign(createState(), { model: m, iris: 0.4, irisEven: true, focus: 0.3, light: 0 });
    lens.update(S, 0);
    lens.lightDisc.visible = false; lens.glow.visible = false;
    const pivot = new T.Group();
    pivot.add(lens.root);
    if (lineup) {
      // Stood on its mount, front up, its engraving toward the camera.
      lens.root.rotation.x = -Math.PI / 2;
      lens.root.position.y = LEN[m];
    } else {
      const p = POSE[m];
      pivot.position.set(0, p.ty, p.tz);
      lens.root.position.set(0, -p.ty, -p.tz);
    }
    scene.add(pivot);
    return { m, i, lens, pivot, lift: 0, liftTo: 0 };
  });

  const camera = new T.PerspectiveCamera(26, 1, 1, 6000);
  // View state: yaw (turn, degrees) and pitch, their velocities, the zoom
  // and where it is easing to, and a slow idle sway.
  const v = { yaw: 0, pitch: 0, vy: 0, vp: 0, zoom: 1, zoomTo: 1, hx: 0, hy: 0, hxTo: 0, hyTo: 0 };
  let W = 1, H = 1, frame = 1, lastInput = performance.now(), dragging = null, hover = -1;
  const pose = POSE[models[0]];

  function layout() {
    const r = img.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    canvas.style.left = (r.left - el.getBoundingClientRect().left) + 'px';
    canvas.style.top = (r.top - el.getBoundingClientRect().top) + 'px';
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    if (lineup) {
      // One frame for all three (they are the same height), with a margin;
      // the mounts stand on one line near the bottom.
      frame = 59.5;
      const halfW = frame * camera.aspect;
      items.forEach((it) => it.pivot.position.set((LINEUP_X[it.i] - 0.5) * 2 * halfW, -frame + 4, 0));
    } else frame = pose.frame;
    dirty = true;
  }

  const target = new T.Vector3(), right = new T.Vector3(), qa = new T.Quaternion(), qb = new T.Quaternion(), Y = new T.Vector3(0, 1, 0);
  function place() {
    const az = (lineup ? 0 : pose.az) * DEG, el0 = (lineup ? 7 : pose.el) * DEG;
    const fit = Math.min(Math.tan(13 * DEG), Math.tan(13 * DEG) * camera.aspect);
    const dist = (frame / v.zoom) / fit;
    if (lineup) target.set(0, 0, 0);
    else target.set(0, pose.ty, pose.tz);
    const elv = el0 + (lineup ? (v.pitch + v.hy) * DEG : 0);
    camera.position.set(
      target.x + dist * Math.sin(az) * Math.cos(elv),
      target.y + dist * Math.sin(elv),
      target.z + dist * Math.cos(az) * Math.cos(elv));
    camera.lookAt(target);
    if (lineup) {
      // Each lens turns on its own axis, which stands upright.
      for (const it of items) {
        it.lens.lens.rotation.z = -Math.PI / 2 + (v.yaw + v.hx) * DEG;
        it.pivot.position.y = -frame + 4 + it.lift;
      }
    } else {
      // The lens turns under the lights (not the camera round it): yaw
      // about the vertical, pitch about the camera's own horizontal.
      right.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      qa.setFromAxisAngle(Y, (v.yaw + v.hx) * DEG);
      qb.setFromAxisAngle(right, (v.pitch + v.hy) * DEG);
      items[0].pivot.quaternion.multiplyQuaternions(qb, qa);
    }
  }

  // ------------------------------------------------------------- input
  const reset = () => { lastInput = performance.now(); wake(); };
  const pts = new Map();
  let pinch0 = 0, zoom0 = 1;
  canvas.addEventListener('pointerdown', (e) => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch0 = Math.hypot(a.x - b.x, a.y - b.y) || 1; zoom0 = v.zoomTo; dragging = null;
    } else dragging = { x: e.clientX, y: e.clientY, t: e.timeStamp, moved: 0 };
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    v.vy = v.vp = 0;
    reset();
  });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    if (e.pointerType === 'mouse' && !dragging) {
      // Hover: a slight tilt toward the pointer, and in the lineup, which
      // lens a click would open.
      v.hxTo = ((e.clientX - r.left) / r.width - 0.5) * 8;
      v.hyTo = ((e.clientY - r.top) / r.height - 0.5) * 5;
      if (lineup) setHover(pickAt(e.clientX - r.left));
      wake();
    }
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2 && !lineup) {
      const [a, b] = [...pts.values()];
      v.zoomTo = clampZoom(zoom0 * (Math.hypot(a.x - b.x, a.y - b.y) / pinch0));
      reset();
      return;
    }
    if (!dragging) return;
    const dx = e.clientX - dragging.x, dy = e.clientY - dragging.y, dt = Math.max(8, e.timeStamp - dragging.t);
    dragging.moved += Math.abs(dx) + Math.abs(dy);
    dragging.x = e.clientX; dragging.y = e.clientY; dragging.t = e.timeStamp;
    const k = 300 / Math.max(240, r.width);
    v.yaw += dx * k; v.vy = (dx * k) / dt * 16;
    // Touch keeps vertical moves for scrolling the page (touch-action:
    // pan-y); a mouse also tilts.
    if (e.pointerType === 'mouse') { v.pitch = clampPitch(v.pitch + dy * k * 0.6); v.vp = (dy * k * 0.6) / dt * 16; }
    reset();
  });
  const up = (e) => {
    const was = dragging;
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch0 = 0;
    if (pts.size === 0) dragging = null;
    // A tap or a click on a lens in the lineup opens it.
    if (lineup && e.type === 'pointerup' && was && was.moved < 6) {
      const r = canvas.getBoundingClientRect(), i = pickAt(e.clientX - r.left);
      if (i >= 0) location.hash = '#lens-' + SLUG[i];
    }
    reset();
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse') return;
    v.hxTo = v.hyTo = 0; setHover(-1); wake();
  });
  // A trackpad pinch arrives as a wheel with ctrlKey; a plain scroll
  // passes on to the page.
  canvas.addEventListener('wheel', (e) => {
    if (lineup || !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    v.zoomTo = clampZoom(v.zoomTo * Math.exp(-e.deltaY * 0.01));
    reset();
  }, { passive: false });
  const clampZoom = (z) => Math.min(2.4, Math.max(0.75, z));
  const clampPitch = (p) => Math.min(lineup ? 26 : 50, Math.max(lineup ? -6 : -50, p));

  // Lineup: the lens nearest the pointer across, within its own width.
  const pv = new T.Vector3();
  function pickAt(x) {
    let best = -1, bd = Infinity;
    for (const it of items) {
      pv.copy(it.pivot.position).project(camera);
      const sx = (pv.x * 0.5 + 0.5) * W, d = Math.abs(sx - x);
      if (d < bd && d < W * 0.16) { bd = d; best = it.i; }
    }
    return best;
  }
  const labels = lineup ? [...document.querySelectorAll('#lenses .lx-hero__label')] : [];
  function setHover(i) {
    if (i === hover) return;
    hover = i;
    items.forEach((it) => { it.liftTo = it.i === i ? 4 : 0; });
    labels.forEach((l, j) => l.classList.toggle('is-hot', j === i));
    canvas.style.cursor = i >= 0 ? 'pointer' : '';
    wake();
  }

  // The buttons under the viewer: turn and zoom without a pointer.
  const tools = document.querySelector(`.viewer-tools[data-for="${el.id}"]`);
  if (tools) {
    tools.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      const a = b.dataset.act;
      if (a === 'left') v.vy = -6;
      else if (a === 'right') v.vy = 6;
      else if (a === 'in') v.zoomTo = clampZoom(v.zoomTo * 1.3);
      else if (a === 'out') v.zoomTo = clampZoom(v.zoomTo / 1.3);
      else if (a === 'reset') { v.zoomTo = 1; v.vy = v.vp = 0; resetTo = performance.now(); }
      reset();
    });
  }
  let resetTo = 0;

  // -------------------------------------------------------------- loop
  let raf = 0, dirty = true, visible = true, alive = true, last = performance.now(), first = true, slow = 0, frames = 0;
  function wake() { if (!raf && alive && visible) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function tick(now) {
    raf = 0;
    if (!alive || !visible) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    let moving = false;
    if (!dragging) {
      // Inertia, then a slow sway while nobody touches it, fading out
      // after half a minute so the page goes still.
      v.yaw += v.vy * dt * 60; v.pitch = clampPitch(v.pitch + v.vp * dt * 60);
      const f = Math.pow(0.9, dt * 60); v.vy *= f; v.vp *= f;
      if (Math.abs(v.vy) > 0.01 || Math.abs(v.vp) > 0.01) moving = true;
      if (resetTo) {
        const k = 1 - Math.pow(0.88, dt * 60);
        v.yaw += (Math.round(v.yaw / 360) * 360 - v.yaw) * k; v.pitch += -v.pitch * k;
        if (Math.abs(v.pitch) < 0.05 && Math.abs(v.yaw - Math.round(v.yaw / 360) * 360) < 0.05) resetTo = 0; else moving = true;
      }
    } else moving = true;
    const idle = (now - lastInput) / 1000;
    const sway = (1 - smooth(22, 30, idle)) * smooth(2, 4, idle);
    if (sway > 0.001) { v.hx += (Math.sin(now / 2300) * 9 * sway - v.hx) * 0.05; moving = true; }
    else { const k = 1 - Math.pow(0.85, dt * 60); v.hx += (v.hxTo - v.hx) * k; }
    v.hy += (v.hyTo - v.hy) * (1 - Math.pow(0.85, dt * 60));
    v.zoom += (v.zoomTo - v.zoom) * (1 - Math.pow(0.84, dt * 60));
    for (const it of items) { it.lift += (it.liftTo - it.lift) * 0.2; if (Math.abs(it.liftTo - it.lift) > 0.02) moving = true; }
    if (Math.abs(v.zoomTo - v.zoom) > 1e-4 || Math.abs(v.hxTo - v.hx) > 0.01 || Math.abs(v.hyTo - v.hy) > 0.01) moving = true;
    if (moving || dirty) {
      const t0 = performance.now();
      place();
      renderer.render(scene, camera);
      dirty = false;
      if (first) { first = false; el.classList.add('is-live'); if (tools) tools.hidden = false; }
      // A slow GPU: drop the resolution once, then give the still back.
      frames++;
      if (frames > 8 && performance.now() - t0 > 60) slow++; else slow = Math.max(0, slow - 1);
      if (slow > 12) {
        if (dpr > 1) { dpr = 1; renderer.setPixelRatio(1); layout(); slow = 0; }
        else { destroy(); return; }
      }
    }
    if (moving) raf = requestAnimationFrame(tick);
  }

  const ro = new ResizeObserver(() => { layout(); wake(); });
  ro.observe(img);
  const io = new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) { dirty = true; wake(); } });
  io.observe(el);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); destroy(); });

  el.appendChild(canvas);
  layout();

  async function start() {
    place();
    try {
      if (renderer.extensions.has('KHR_parallel_shader_compile')) await renderer.compileAsync(scene, camera);
      else renderer.compile(scene, camera);
    } catch { /* compile on first draw instead */ }
    dirty = true; lastInput = performance.now(); wake();
  }
  start();

  function destroy() {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(raf);
    ro.disconnect(); io.disconnect();
    el.classList.remove('is-live');
    if (tools) tools.hidden = true;
    labels.forEach((l) => l.classList.remove('is-hot'));
    items.forEach((it) => it.lens.dispose());
    env.dispose(); Object.values(textures).flat().forEach((t) => t && t.dispose());
    renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
  }
  return { destroy, el };
}

// One set of viewers at a time: those on the route being shown. Leaving a
// route frees its WebGL contexts.
let live = [];
export function showViewers(route, L, caps, opts) {
  live = live.filter((x) => { if (x.el.closest('.route').id === route) return true; x.destroy(); return false; });
  const sec = document.getElementById(route);
  if (!sec) return;
  for (const el of sec.querySelectorAll('[data-viewer]')) {
    if (live.some((x) => x.el === el)) continue;
    try { live.push(mountViewer(el, L, caps, opts)); } catch { /* the still stays */ }
  }
}
