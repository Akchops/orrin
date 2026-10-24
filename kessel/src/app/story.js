// The whole page as one camera move, in story units (one unit ~ one beat
// of scroll). Gaps between pinned sections carry camera moves too, so no
// stretch of scroll is dead.
//
//   0.0 -  1.0  hero scrolls away: front-on, iris closed to a pinhole
//   1.0 -  3.0  APERTURE (pinned, 2 beats): blades open one by one, light blooms
//   3.0 -  3.6  dive: elements slide apart, camera drops onto the axis, FOV widens
//   3.6 -  7.2  THROUGH (pinned, 4 beats): travel down the barrel, through the iris
//   7.2 -  7.8  out at the mount, turn round
//   7.8 -  9.0  BACK TOGETHER (pinned, 1.5 beats): lens closes up as the camera pulls back
//   9.0 -  9.6  orbit round to the side
//   9.6 - 11.2  FOCUS (pinned, 2 beats): focus ring turns, distance scale rolls
//  11.2 - 11.8  pull back to three-quarters
//  11.8 - 14.2  LENSES (pinned, 3 beats): three proposals
//  14.2 - 15.2  close on the signed barrel
//  15.2 - 16.5  contact: front three-quarters, iris half open
//  ---- into the teardown (the About section), continuing the same move ----
//  16.5 - 17.0  the film's last frame eases to a three-quarter view as the
//               teardown scrolls in, the teardown light coming up. From
//               there the teardown is stepped by scroll, one stop at a time
//               (src/site/td-steps.js, src/app/td-stops.js, live.js).
export const FILM_END = 16.5;
export const STORY_END = 17.0;

export function createState() {
  return {
    az: 0, el: 0, frame: 46, tx: 0, ty: 0, tz: -10, sx: 0, sy: 0, fov: 26,
    inside: 0, cz: 160, yaw: 0, roll: 0, rx: 0, ry: 0,
    iris: 0, spread: 0, focus: 0, model: 1, light: 1, sensor: 0, throat: 0, tear: 0, oroll: 0, tlight: 0, tspread: 1,
    // How far the camera is fitted to the chapter's stage box (fit.js).
    fit: 0,
    // Set by live.js, not by the timeline: the part to emphasise and how
    // much the others dim; the picked part and how far the others drift
    // back from it; the depth of field in a close-up and its depth range.
    hl: '', dim: 0, pick: '', pe: 0, dof: 0, dofR: 40,
  };
}

export function buildStory(gsap, S, layout) {
  const N = layout === 'narrow';
  const v = (w, n) => (N ? n : w);
  // The first frame is the hero: the whole lens in its own box beside the
  // headline (fit 1: live.js fits its bounding sphere to .hero__stage),
  // turned a little to show its barrel, the iris closed. As the hero
  // scrolls away it turns face on and the camera moves in on the front,
  // pushed right (wide) or up (phones) so the
  // headline never covers the bright centre.
  Object.assign(S, createState(), { frame: v(35, 34), sx: v(0.22, 0), sy: v(0, 0.14), tspread: v(1, 0.8), fit: 1, az: 20, el: 8 });
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  const to = (a, b, vals, ease = 'power1.inOut') => tl.to(S, { ...vals, duration: b - a, ease }, a);

  // Hero: a slow push toward the pinhole.
  to(0, 1, { frame: v(36, 37.5) }, 'sine.inOut');
  to(0, 0.9, { fit: 0, az: 0, el: 0 }, 'power1.inOut');
  // Aperture: the iris channel is linear; each blade applies its own
  // smoothstep with a staggered start, so they open one at a time.
  to(1.05, 2.85, { iris: 1 }, 'none');
  to(1, 3, { frame: v(37, 40), el: 3 }, 'sine.inOut');

  // Dive. The orbit camera is already on the axis (az 0, el 0), so blending
  // into the axis camera is a pure move along Z; the FOV widens at the same
  // time for a dolly-zoom into the glass.
  to(3.0, 3.6, { el: 0, sx: 0, sy: 0 }, 'sine.inOut');
  to(3.0, 3.9, { spread: 1 }, 'power1.inOut');
  to(3.0, 3.35, { inside: 1 }, 'power1.inOut');
  // Phones see the barrel through a portrait frame, so the trip uses a
  // wider lens there: the walls and rings stay in view around the camera.
  to(3.0, 3.75, { cz: 32, fov: v(64, 84) }, 'power2.in');
  // Through the barrel, past each element and through the open iris.
  to(3.75, 7.2, { cz: -236 }, 'sine.inOut');
  // The sensor appears beyond the mount for the exit, then is put away.
  // The sensor lights up at the far end of the barrel once the camera is
  // past the iris, small and distant; it is only close at the exit. Its
  // throat surrounds it so it never floats on its own.
  to(5.3, 5.9, { sensor: 1, throat: 1 }, 'power1.out');
  to(7.7, 7.85, { sensor: 0 }, 'power1.in');
  to(7.75, 8.15, { throat: 0 }, 'power1.inOut');
  to(3.6, 7.2, { roll: 18 }, 'sine.inOut');

  // Out at the mount, turn round to face the way we came.
  // Out past the mount, facing the sensor and the image circle on it; then
  // the camera turns round and backs away as the lens closes up.
  to(7.2, 7.8, { yaw: 180, cz: -240, roll: 0 }, 'power1.inOut');
  // Back together: the lens closes up as the camera pulls away and the FOV
  // narrows back to a portrait lens.
  to(7.8, 8.8, { spread: 0 }, 'power1.inOut');
  to(7.8, 9.0, { cz: -310, fov: 26 }, 'power1.inOut');
  // The orbit camera is parked behind the lens while the axis camera is in
  // charge, so the hand-back at 8.6 - 9.0 lands on the same viewpoint.
  to(7.3, 7.35, { az: 180, el: 0, frame: v(58, 64), tx: 0, ty: 0, tz: -50 }, 'none');
  to(8.6, 9.0, { inside: 0 }, 'power1.inOut');

  // Round to the side for the focus ring.
  to(9.0, 9.6, { az: 90, el: 6, frame: v(30, 34), tx: v(30, 26), ty: 0, tz: -30, sy: v(0, 0.16) }, 'power1.inOut');
  to(9.75, 11.1, { focus: 1 }, 'sine.inOut');
  to(9.6, 11.2, { az: 84 }, 'none');

  // Lenses: pull back to three-quarters; the model channel morphs length,
  // front size and colour band between the three proposals.
  to(11.2, 11.8, { az: 52, el: 14, frame: v(78, 92), tx: 0, ty: 0, tz: -50, sx: v(-0.14, 0), sy: v(0, 0.14), focus: 0.35 }, 'power1.inOut');
  // Each shape fits whole in the chapter's stage box, clear of its heading
  // and list, by both width and height (live.js reads the box).
  to(11.3, 11.8, { fit: 1 }, 'power1.inOut');
  to(14.3, 14.5, { fit: 0 }, 'power1.inOut');
  to(11.8, 12.2, { model: 0 }, 'power1.inOut');
  to(12.6, 13.1, { model: 1 }, 'power1.inOut');
  to(13.4, 13.9, { model: 2 }, 'power1.inOut');
  to(11.8, 14.2, { az: 40 }, 'none');

  // The signed barrel.
  to(14.2, 15.2, { az: 90, el: 2, frame: v(15, 20), tx: 39, ty: 0, tz: -68, sx: v(-0.2, 0), sy: v(0, 0.2), model: 1 }, 'power1.inOut');
  // Contact: front three-quarters, iris settled half open.
  to(15.2, 16.5, { az: 24, el: 8, frame: v(56, 62), tx: 0, ty: 0, tz: -40, sx: v(0.18, 0), sy: v(0, 0.16), iris: 0.55 }, 'power1.inOut');

  // ---- Into the teardown. The camera eases from the film's last frame
  // into a three-quarter view, a little above, and a teardown light comes
  // up to separate the dark parts from the dark page; live.js fits it into
  // the teardown's stage box as the section scrolls in, and the teardown's
  // own stops take over from there.
  to(16.5, 17.0, { az: 40, el: 14, frame: v(80, 74), tx: 0, ty: -4, tz: -40, sx: v(0.03, 0), sy: v(0.04, 0.08), iris: 1, focus: 0 }, 'power1.inOut');
  to(16.5, 17.0, { tlight: 1, light: 0 }, 'power1.inOut');   // no iris, no light through it

  tl.set({}, {}, STORY_END);
  // Render to the end and back so every tween records its start value now.
  tl.progress(1).progress(0);
  return tl;
}
