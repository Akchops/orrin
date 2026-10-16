// Development harness: renders the scene at a given story time.
//   /lab.html?s=4.7&tier=high&px=0.3&py=-0.2
import gsap from 'gsap';
import { buildStory, createState } from './story.js';
import { mountWebGL } from './watch/stage3d.js';

const q = new URLSearchParams(location.search);
const stage = document.getElementById('stage');
const S = createState();
const layout = innerWidth < 768 ? 'narrow' : 'wide';
const tl = buildStory(gsap, S, layout);
const view = mountWebGL(stage, { tier: q.get('tier') || 'high', preserve: true }, { fontFamily: 'Arial, sans-serif' });
stage.appendChild(view.canvas);
const pointer = { x: +(q.get('px') || 0), y: +(q.get('py') || 0), spin: 0 };
const s = +(q.get('s') || 0);
// Material experiments: ?tweak=name
const tweaks = {
  noaniso: () => view.scene.traverse((o) => { if (o.material && o.material.anisotropy) o.material.anisotropy = 0.0001; }),
  nocoat: () => view.scene.traverse((o) => { if (o.material && o.material.clearcoat) o.material.clearcoat = 0.0001; }),
  noao: () => view.scene.traverse((o) => { if (o.material && o.material.aoMap) { o.material.aoMap = null; o.material.needsUpdate = true; } }),
  nocrystal: () => view.scene.traverse((o) => { if (o.material && o.material.ior === 1.77) o.visible = false; }),
  noiri: () => view.scene.traverse((o) => { if (o.material && o.material.ior === 1.77) o.material.iridescence = 0.0001; }),
  nomip: () => view.scene.traverse((o) => { const m = o.material; if (m && m.anisotropyMap) { m.anisotropyMap.generateMipmaps = false; m.anisotropyMap.minFilter = 1006; m.anisotropyMap.needsUpdate = true; } }),
};
(q.get('tweak') || '').split(',').filter(Boolean).forEach((k) => tweaks[k] && tweaks[k]());
tl.time(s);
const t = +(q.get('t') || 0.4);
await view.warm(S);
tl.time(s);
// Any state channel can be overridden from the query string.
for (const [k, val] of q) if (k in S && k !== 's') S[k] = +val;
view.render(S, t, pointer);
view.render(S, t, pointer);
window.__ready = true;
