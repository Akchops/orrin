// Still-frame renderer (build tool, reached only with ?still=name). The
// stills shown to no-JS and reduced-motion visitors are rendered from the
// same scene, timeline and materials as the live lens.
import { mountWebGL } from './stage3d.js';
import { buildStory, createState } from './story.js';

const POSES = {
  hero: { s: 0 },
  aperture: { s: 2.95 },
  through: { s: 4.9 },
  exit: { s: 9.0 },
  focus: { s: 10.5 },
  'model-1': { s: 12.4, sx: 0, sy: 0, light: 0 },
  'model-2': { s: 13.3, sx: 0, sy: 0, light: 0 },
  'model-3': { s: 14.15, sx: 0, sy: 0, light: 0 },
  signed: { s: 15.2, sx: 0, sy: 0 },
  // Site pages: the same lens, posed off the film's path. Product shots
  // (the models, the exploded view) are lit without the light coming
  // through the iris, which otherwise shows as a halo behind the barrel.
  'model-1-lg': { s: 12.4, sx: 0, sy: 0, light: 0 },
  'model-2-lg': { s: 13.3, sx: 0, sy: 0, light: 0 },
  'model-3-lg': { s: 14.15, sx: 0, sy: 0, light: 0 },
  beauty: { s: 16.5, sx: 0, sy: 0 },
  exploded: { s: 16.5, noLeaks: true, spread: 1, az: 64, el: 12, frame: 82, tx: 0, ty: 0, tz: -112, iris: 0.6, focus: 0.3, sx: 0, sy: 0 },
  iris34: { s: 16.5, iris: 0.42, az: 16, el: 9, frame: 30, tx: 0, ty: 0, tz: -30, sx: 0, sy: 0 },
};

export async function renderStill(name, font) {
  const L = window.__kesselLibs();
  const pose = POSES[name] || POSES.hero;
  document.body.innerHTML = '<div id="still-stage" style="position:fixed;inset:0"></div>';
  document.body.style.padding = '0';
  const stage = document.getElementById('still-stage');
  await document.fonts.ready;
  // The exploded view hides the light-leak sleeves between the parted
  // sections: they are made for the trip through the barrel and read as a
  // solid sleeve from outside. Build tool only; the live scene is untouched.
  if (pose.noLeaks) {
    L.THREE.Scene.prototype.onBeforeRender = function () {
      this.traverse((o) => { if (o.isMesh && o.material && o.material.blending === L.THREE.AdditiveBlending && o.geometry.type === 'CylinderGeometry') o.visible = false; });
    };
  }
  const view = mountWebGL(L.THREE, L, stage, { ok: true, tier: 'high', preserve: true }, { font });
  view.canvas.style.cssText = 'width:100%;height:100%;display:block';
  stage.appendChild(view.canvas);
  view.resize();
  const S = createState();
  const tl = buildStory(L.gsap, S, 'wide');
  await view.warm(S);
  tl.time(pose.s);
  for (const [k, v] of Object.entries(pose)) if (k !== 's' && k !== 'noLeaks') S[k] = v;
  const p = { x: 0, y: 0, spin: 0 };
  view.render(S, 0.4, p);
  view.render(S, 0.4, p);
  window.__still = view.canvas.toDataURL('image/png');
}
