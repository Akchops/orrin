// Still-frame renderer (build tool, reached only with ?still=name). The
// stills shown to no-JS and reduced-motion visitors are rendered from the
// same scene, timeline and materials as the live lens.
import { mountWebGL } from './stage3d.js';
import { buildStory, createState } from './story.js';
import { TEAR_ANCHORS } from './teardown.js';

import { MODEL_SPHERE, sphereFrame } from './fit.js';
import { inspectPoses } from './inspect.js';

const POSES = {
  hero: { s: 0 },
  aperture: { s: 2.95 },
  through: { s: 4.9 },
  exit: { s: 9.0 },
  // The end of the focus stage: the closest mark, 0.45 m, at the index.
  focus: { s: 11.1 },
  'model-1': { s: 12.4, sx: 0, sy: 0, light: 0 },
  'model-2': { s: 13.3, sx: 0, sy: 0, light: 0 },
  'model-3': { s: 14.15, sx: 0, sy: 0, light: 0 },
  signed: { s: 15.2, sx: 0, sy: 0 },
  // Site pages: the same lens, posed off the film's path. Product shots
  // (the models, the exploded view) are lit without the light coming
  // through the iris, which otherwise shows as a halo behind the barrel.
  'model-1-lg': { irisEven: true, s: 12.4, sx: 0, sy: 0, light: 0 },
  'model-2-lg': { irisEven: true, s: 13.3, sx: 0, sy: 0, light: 0 },
  'model-3-lg': { irisEven: true, s: 14.15, sx: 0, sy: 0, light: 0 },
  beauty: { s: 16.5, irisEven: true, sx: 0, sy: 0 },
  exploded: { s: 16.5, irisEven: true, noLeaks: true, spread: 1, az: 64, el: 12, frame: 82, tx: 0, ty: 0, tz: -112, iris: 0.6, focus: 0.3, sx: 0, sy: 0 },
  iris34: { s: 16.5, irisEven: true, iris: 0.42, az: 16, el: 9, frame: 30, tx: 0, ty: 0, tz: -30, sx: 0, sy: 0 },
  // Site imagery, rendered with a transparent background so it sits on the
  // page with no box. Close crops on details the scene already has.
  'hero-lens': { s: 16.5, irisEven: true, az: 26, el: 9, frame: 64, tx: 0, ty: 0, tz: -44, iris: 0.5, sx: 0, sy: 0 },
  // The three lenses, each framed whole (with its hood and collar) as the
  // live viewer frames it; the iris stopped down evenly, as a real one
  // closes. The lineup profiles share one frame, so lineup.py stands them
  // side by side at one scale.
  ...[1, 2, 3].reduce((o, k) => {
    // Framed as the live viewer frames it: the lens's bounding sphere
    // (fit.js MODEL_SPHERE) whole by both axes, aimed at its centre.
    const sph = MODEL_SPHERE[k - 1];
    const P = { frame: sphereFrame(sph.r), tx: sph.c[0], ty: sph.c[1], tz: sph.c[2] };
    return Object.assign(o, {
      [`lens-${k}`]: { s: 16.5, model: k - 1, ownScale: true, az: 38, el: 11, frame: P.frame, tx: P.tx, ty: P.ty, tz: P.tz, iris: 0.4, irisEven: true, light: 0, focus: 0.3, sx: 0, sy: 0 },
      [`lineup-${k}`]: { s: 16.5, model: k - 1, ownScale: true, az: 90, el: 0, frame: 76, tx: 0, ty: P.ty, tz: P.tz, iris: 0.4, irisEven: true, light: 0, focus: 0.3, sx: 0, sy: 0 },
      // Inspect the lens (src/app/inspect.js): its five details, as the
      // live viewer glides to them. The iris stopped down evenly and no
      // light behind the lens, so no pinhole dot, no glare, and no ragged
      // half-open shape through the glass or the rear element.
      ...Object.fromEntries(inspectPoses(k - 1).slice(1).map((p) => [`i-${k}-${p.key}`, {
        s: 16.5, model: k - 1, ownScale: true, irisEven: true, light: 0, az: p.az, el: p.el, frame: p.frame,
        tx: p.t[0], ty: p.t[1], tz: p.t[2], iris: p.iris, focus: p.focus, sx: 0, sy: 0,
      }])),
    });
  }, {}),
  'd-knurl': { s: 16.5, az: 90, el: 5, frame: 15, tx: 40, ty: 0, tz: -24, focus: 0.5, light: 0, sx: 0, sy: 0 },
  // One-page site: the hero (the film's first frame) and the teardown.
  // The hero's box (no JS, reduced motion, the stills tier): the lens as
  // the film's first frame fits it, whole by its bounding sphere.
  'hero-stage': { s: 0, model: 1, az: 20, el: 8, frame: sphereFrame(MODEL_SPHERE[1].r), tx: MODEL_SPHERE[1].c[0], ty: MODEL_SPHERE[1].c[1], tz: MODEL_SPHERE[1].c[2], sx: 0, sy: 0, iris: 0, light: 0 },
  // The stills have no rail or caption panel to make room for: centred.
  'td-apart': { s: 21.1, sx: 0, sy: 0.02 },
  'td-apart-tall': { s: 21.1, layout: 'narrow', sy: -0.04, frame: 126 },
  'exploded-wide': { s: 16.5, irisEven: true, noLeaks: true, spread: 1, az: 66, el: 10, frame: 64, tx: 0, ty: 0, tz: -112, iris: 0.6, focus: 0.3, sx: 0, sy: 0 },
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
  const tl = buildStory(L.gsap, S, pose.layout || 'wide');
  await view.warm(S);
  tl.time(pose.s);
  for (const [k, v] of Object.entries(pose)) if (!['s', 'noLeaks', 'layout'].includes(k)) S[k] = v;
  const p = { x: 0, y: 0, spin: 0 };
  view.render(S, 0.4, p);
  view.render(S, 0.4, p);
  // Where each teardown label points, as a fraction of the frame, so the
  // stills page can number the parts (kessel/scripts/stills.mjs saves it).
  const W = stage.clientWidth, H = stage.clientHeight, marks = {};
  for (const id of Object.keys(TEAR_ANCHORS)) {
    const q = view.project('td-' + id);
    if (q) marks['td-' + id] = [+(q.x / W).toFixed(4), +(q.y / H).toFixed(4), q.visible && q.x > 0 && q.x < W && q.y > 0 && q.y < H];
  }
  window.__stillMarks = marks;
  window.__still = view.canvas.toDataURL('image/png');
}
