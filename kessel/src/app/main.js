// Bootstrap. Owns the tier badge: it always says which version of the page
// is running, and when it is the stills it always says why. Nothing here
// fetches anything; the libraries are inlined in the page, wrapped in a
// function (window.__kesselLibs) so they only compile when needed.
import { mountWebGL } from './stage3d.js';
import { mount2D } from './tier2.js';
import { renderStill } from './stills.js';
import { showViewers } from './viewer.js';

const root = document.documentElement;
const params = new URLSearchParams(location.search);
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const badge = document.getElementById('tier');
const kindEl = badge.querySelector('.tier__kind');
const whyEl = badge.querySelector('.tier__why');
const playBtn = badge.querySelector('.tier__play');
const notice = document.getElementById('notice');
const FONT = '"Saira", "Arial Narrow", Arial, sans-serif';

let state = 'booting';
let teardown = null;

function setTier(kind, why = '') {
  badge.dataset.kind = kind;
  kindEl.textContent = kind === 'live' ? 'LIVE 3D' : kind === '2d' ? '2D FALLBACK' : 'STILLS';
  whyEl.textContent = why;
  root.dataset.tier = kind;
}

// Stills are a reported state, never a silent default: the badge and a
// notice at the top both say why the live lens is not running.
function stills(why, { offerPlay = false } = {}) {
  state = 'stills';
  if (teardown) { try { teardown(); } catch { /* best effort */ } teardown = null; }
  root.classList.remove('live');
  setTier('stills', why);
  notice.textContent = `Still frames, not the live lens: ${why}`;
  notice.hidden = false;
  playBtn.hidden = !offerPlay;
}

function short(err) {
  const m = String((err && (err.message || err.reason)) || err || 'unknown error');
  return m.length > 110 ? m.slice(0, 107) + '…' : m;
}

// Errors anywhere during boot are reported, not swallowed.
addEventListener('error', (e) => { if (state === 'booting') stills('the live lens hit an error while starting (' + short(e.error || e.message) + ').'); });
addEventListener('unhandledrejection', (e) => { if (state === 'booting') stills('the live lens hit an error while starting (' + short(e.reason) + ').'); });

// ---------------------------------------------------------------- probe
// Silent: no console output on any failure path. Returns a reason when
// WebGL cannot be used, which becomes the 2D badge's explanation.
function probe(allowSoftware) {
  if (typeof WebGLRenderingContext === 'undefined') return { ok: false, reason: 'this browser has no WebGL' };
  const c = document.createElement('canvas');
  let gl = null;
  try {
    gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: !allowSoftware }) ||
         c.getContext('webgl', { failIfMajorPerformanceCaveat: !allowSoftware });
  } catch { return { ok: false, reason: 'WebGL threw while starting' }; }
  if (!gl) {
    // Distinguish "no WebGL" from "only a slow software WebGL".
    let soft = null;
    try { soft = c.getContext('webgl2') || c.getContext('webgl'); } catch { /* ignore */ }
    try { soft?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* ignore */ }
    return { ok: false, reason: soft ? 'WebGL here is software-only (no GPU acceleration)' : 'WebGL is turned off or blocked here' };
  }
  const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  let renderer = '';
  try { const d = gl.getExtension('WEBGL_debug_renderer_info'); if (d) renderer = String(gl.getParameter(d.UNMASKED_RENDERER_WEBGL) || ''); } catch { /* ignore */ }
  try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* ignore */ }
  const softGL = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
  if (softGL && !allowSoftware) return { ok: false, reason: 'WebGL here is software-only (no GPU acceleration)' };
  if (maxTexture < 4096 && !allowSoftware) return { ok: false, reason: 'this GPU is too limited for the 3D lens' };
  const coarse = matchMedia('(pointer: coarse)').matches;
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  const tier = softGL ? 'high' : (coarse || mem <= 4 || cores <= 4 || maxTexture < 8192) ? 'medium' : 'high';
  return { ok: true, tier, soft: softGL };
}

// ----------------------------------------------------------------- start
async function start({ force = false } = {}) {
  if (params.has('static')) return stills('still frames were requested in the address (?static).');
  if (reduce.matches && !force) {
    return stills('reduced motion is on in your system settings.', { offerPlay: true });
  }
  state = 'booting';
  notice.hidden = true;
  playBtn.hidden = true;
  setTier('stills', 'Starting the live lens…');

  // If boot has not finished in 12 s, say so rather than leave stills up
  // looking like a finished page. A late success still switches over.
  const timer = setTimeout(() => {
    if (state === 'booting') stills('the live lens did not start within 12 seconds.');
  }, 12000);

  try {
    if (typeof window.__kesselLibs !== 'function') throw new Error('the animation libraries are missing from the page');
    const L = window.__kesselLibs();
    const forceGL = params.get('gl') === 'force';
    let caps = params.get('tier') === '2' ? { ok: false, reason: 'the 2D version was requested (?tier=2)' } : probe(forceGL);
    if (caps.ok && forceGL) caps.qa = true;
    await document.fonts.ready;

    const { bootLive } = await import('./live.js');
    const tier = await bootLive(L, {
      caps,
      font: FONT,
      report: (kind, why) => setTier(kind === '3d' ? 'live' : kind, why),
      mount3D: (stage, onLost, quality) => mountWebGL(L.THREE, L, stage, quality ? { ...caps, tier: quality } : caps, { font: FONT, onContextLost: onLost }),
      mount2D: (stage) => mount2D(stage, { font: FONT }),
    });
    clearTimeout(timer);
    state = 'live';
    if (tier === '3d') setTier('live', caps.qa ? 'software WebGL, forced for testing (?gl=force)' : '');
    else setTier('2d', caps.reason || '');
  } catch (err) {
    clearTimeout(timer);
    stills('the live lens failed to start (' + short(err) + ').');
  }
}

playBtn.addEventListener('click', () => start({ force: true }));
reduce.addEventListener?.('change', () => location.reload());

// The lens belongs to the home page only: other pages are plain and
// fast, so it starts the first time home is shown (src/site/site.js
// announces every route change).
if (params.get('still')) renderStill(params.get('still'), FONT);
else if (root.dataset.route === 'home') start();
else addEventListener('kessel:route', function once(e) {
  if (e.detail.route !== 'home') return;
  removeEventListener('kessel:route', once);
  start();
});

// The lens viewers on the Lenses pages (src/app/viewer.js) run on the same
// terms as the film: WebGL on a GPU (or forced for testing), motion
// allowed. Otherwise their stills stay. Each route change frees the
// viewers of the route left behind.
let viewerCaps = null, viewersOn = false;
function viewers(route) {
  if (params.get('still') || params.has('static') || reduce.matches || params.get('tier') === '2') return;
  if (!viewersOn && !document.querySelector(`#${CSS.escape(route)} [data-viewer]`)) return;
  if (!viewerCaps) viewerCaps = probe(params.get('gl') === 'force');
  if (!viewerCaps.ok || typeof window.__kesselLibs !== 'function') return;
  viewersOn = true;
  document.fonts.ready.then(() => {
    try { showViewers(root.dataset.route, window.__kesselLibs(), viewerCaps, { font: FONT }); } catch { /* the stills stay */ }
  });
}
addEventListener('kessel:route', (e) => viewers(e.detail.route));
viewers(root.dataset.route);
