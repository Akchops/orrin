// Renders the fallback stills from the live scene (dev tool, not shipped).
// The same geometry, materials and timeline produce the images that the
// no-JS and reduced-motion layouts show, so the two never drift apart.
//   /stills.html?name=movement
import gsap from 'gsap';
import { buildStory, createState } from './story.js';
import { mountWebGL } from './watch/stage3d.js';

// Story time and per-still overrides. sx/sy are zeroed so the subject sits
// centred in a square frame; frame is tightened where the live layout left
// room for captions.
const POSES = {
  hero: { s: 0, sx: 0, sy: 0 },
  crown: { s: 1.95, sx: 0, sy: 0, frame: 16, tx: 28 },
  movement: { s: 4.85, sx: 0, sy: 0, frame: 31 },
  dial: { s: 5.9, sx: 0, sy: 0, frame: 27 },
  strap: { s: 7.0, sx: 0, sy: 0 },
  caseback: { s: 14.6, sx: 0, sy: 0, frame: 27 },
  'model-01': { s: 8.2, sx: 0, sy: 0, model: 0, ry: -0.18 },
  'model-02': { s: 8.2, sx: 0, sy: 0, model: 1, ry: -0.18 },
  'model-03': { s: 8.2, sx: 0, sy: 0, model: 2, ry: -0.18 },
  'model-04': { s: 8.2, sx: 0, sy: 0, model: 3, ry: -0.18 },
  'model-05': { s: 8.2, sx: 0, sy: 0, model: 4, ry: -0.18 },
};

const q = new URLSearchParams(location.search);
const pose = POSES[q.get('name')] || POSES.hero;
await document.fonts.load('600 32px Archivo').catch(() => {});
const stage = document.getElementById('stage');
const S = createState();
const tl = buildStory(gsap, S, 'wide');
const view = mountWebGL(stage, { tier: 'high', preserve: true }, { fontFamily: 'Archivo, Arial, sans-serif' });
stage.appendChild(view.canvas);
await view.warm(S);
tl.time(pose.s);
for (const [k, v] of Object.entries(pose)) if (k !== 's') S[k] = v;
S.clock = 10 * 3600 + 10 * 60 + 31;      // 10:10:31, the watchmaker's resting time
const pointer = { x: 0, y: 0, spin: 0 };
view.render(S, 0.37, pointer);
view.render(S, 0.37, pointer);
window.__still = view.canvas.toDataURL('image/png');
