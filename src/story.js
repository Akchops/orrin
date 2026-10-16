// The whole page as one scene timeline. Time is measured in story units:
// one unit is one beat of scroll (see experience.js for the px per beat).
//
//   0 -  1  hero scrolls away; camera swings round to the crown
//   1 -  7  DISASSEMBLY (pinned, 6 beats)
//            1-2  crown unscrews, stem draws out
//            2-4  caseback off, movement lifts out, gears separate
//            4-5  hold on the exploded movement
//            5-6  dial falls away, hands float clear
//            6-7  parts fly home, straps swing back on
//   7 -  8  hand-off to the models
//   8 - 13  MODELS (pinned, 5 beats): dial, hands and strap morph through 5 finishes
//  13 - 14  watch turns over to show the movement through the caseback
//  14 - 16  workshop story, then contact: face-on, showing Mumbai time
//
// Every channel is a plain number on S. Both render tiers read S; nothing
// else animates the watch.

export const STORY_END = 16;

export const CHAPTERS = {
  hero: [0, 1], disassembly: [1, 7], models: [8, 13], workshop: [13, 15], contact: [15, 16],
};

export function createState() {
  return {
    az: 24, el: 10, frame: 30, tx: 0, ty: 0, tz: -1.5, sx: 0, sy: 0,
    rx: 0, ry: 0, rz: -0.16,
    crownTurn: 0, crownOut: 0, crownPark: 0, backTurn: 0, backOff: 0,
    lift: 0, caseOff: 0, strapOff: 0, strapFlat: 0, explode: 0, dialOff: 0, handsOff: 0,
    model: 0, warm: 0,
  };
}

export function buildStory(gsap, S, layout) {
  const N = layout === 'narrow';
  const v = (wide, narrow) => (N ? narrow : wide);
  Object.assign(S, createState(), { sx: v(0.15, 0), sy: v(0, 0.17) });

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  const to = (t0, t1, vals, ease = 'power1.inOut') => tl.to(S, { ...vals, duration: t1 - t0, ease }, t0);

  // Hero -> crown: the camera swings round and dollies in until the crown
  // fills the frame, seen from the front so the stem draws out across it.
  to(0, 1, { az: 44, el: 14, frame: v(10, 11), tx: 23, ty: 0, tz: -2.1, rz: 0, sx: v(0.16, 0), sy: v(0, 0.13) }, 'power2.inOut');

  // Crown: three turns out, then the stem draws clear; the camera pans with it.
  to(1.1, 1.55, { crownTurn: 1 }, 'sine.inOut');
  to(1.55, 1.95, { crownOut: 1 }, 'power1.inOut');
  to(1.45, 2.0, { tx: v(33, 37), frame: v(15, 21) }, 'power1.inOut');

  // Round to the back. The straps swing off first (curled, they would hide
  // the caseback), the crown parks beside the watch, and the caseback
  // unscrews and flies clear.
  to(2.0, 2.6, { strapOff: 1 }, 'power1.inOut');
  to(2.05, 2.5, { crownPark: 1 }, 'power1.inOut');
  to(2.0, 2.6, { az: 165, el: 20, frame: v(24, 28), tx: 0, ty: 0, tz: -4 }, 'power2.inOut');
  to(2.4, 2.85, { backTurn: 1 }, 'sine.inOut');
  to(2.8, 3.15, { backOff: 1 }, 'power1.in');
  to(2.6, 3.1, { az: 172, el: 14, frame: v(21, 25) }, 'sine.inOut');

  // Movement lifts out; the case leaves on its own path.
  to(3.05, 3.6, { lift: 1, tz: -18 }, 'power1.inOut');
  to(3.1, 3.7, { caseOff: 1 }, 'power1.inOut');

  // The explosion: linear channel, each part applies its own smoothstep and
  // departure order. The camera rises to a three-quarter view so the stack
  // opens diagonally across the frame.
  to(3.55, 4.75, { explode: 1 }, 'none');
  to(3.6, 4.75, { az: v(140, 152), el: v(28, 40), frame: v(27, 40), tx: v(0, -5), ty: -2, tz: -33 }, 'sine.inOut');
  to(4.75, 5.0, { az: v(134, 146) }, 'none');

  // Dial stage: orbit round to the front of the exploded stack. The dial
  // falls away under it and the hands float clear.
  to(5.0, 5.95, { az: 18, el: 12, frame: v(26, 31), tx: 0, ty: -7, tz: -10 }, 'power1.inOut');
  to(5.12, 5.8, { dialOff: 1 }, 'power1.in');
  to(5.05, 5.75, { handsOff: 1 }, 'sine.inOut');

  // Strap stage: everything flies home in reverse order, then the straps
  // swing back on and curl round the wrist.
  to(5.95, 6.35, { dialOff: 0 }, 'power1.inOut');
  to(5.95, 6.3, { handsOff: 0 }, 'power1.inOut');
  to(6.0, 6.5, { explode: 0 }, 'none');
  to(6.15, 6.6, { caseOff: 0 }, 'power1.inOut');
  to(6.25, 6.6, { lift: 0 }, 'power1.inOut');
  to(6.3, 6.6, { crownPark: 0 }, 'power1.inOut');
  to(6.5, 6.72, { backOff: 0 }, 'power1.out');
  to(6.55, 6.75, { crownOut: 0 }, 'power1.inOut');
  to(6.72, 6.88, { backTurn: 0 }, 'power1.inOut');
  to(6.75, 6.9, { crownTurn: 0 }, 'power1.out');
  to(6.5, 7.0, { strapOff: 0 }, 'power2.out');
  to(6.0, 6.75, { az: 36, el: 16, frame: v(36, 44), tx: 0, ty: 2, tz: -8 }, 'power1.inOut');

  // Into the models: face the viewer, step aside for the list.
  to(7.0, 8.0, { az: 15, el: 6, frame: v(27, 36), tx: 0, ty: 0, tz: -1.5, sx: v(0.2, 0), sy: v(0, 0.14) }, 'power1.inOut');

  // Models: hold each finish for half a beat, morph in the other half. The
  // watch turns a little each time so the new dial catches the light.
  const sway = [-0.22, 0.16, -0.12, 0.2, 0];
  for (let i = 0; i < 5; i++) {
    if (i < 4) to(8 + i + 0.45, 8 + i + 1, { model: i + 1 }, 'power1.inOut');
    to(8 + i, 8 + i + 1, { ry: sway[i] }, 'sine.inOut');
  }

  // Turn over: the movement shows through the sapphire caseback under warm
  // workshop light.
  to(13, 14, { ry: Math.PI, strapFlat: 1, az: 0, el: 10, frame: v(25, 34), sx: v(-0.2, 0), sy: v(0, 0.3), warm: 1 }, 'power1.inOut');
  to(14, 15, { ry: Math.PI + 0.35, el: 16, frame: v(23, 32) }, 'sine.inOut');
  // Back to No. 01 while the dial faces away, so the colours never flicker.
  to(13.35, 14.4, { model: 0 }, 'none');
  // Contact: face-on again, showing the time in Mumbai.
  to(15, 16, { ry: Math.PI * 2, strapFlat: 0, el: 8, frame: v(26, 30), sx: v(0.2, 0), sy: v(0, 0.2), warm: 0.35 }, 'power1.inOut');

  tl.set({}, {}, STORY_END);
  // Render once to the end and back so every tween records its start value
  // now, rather than lazily on first scrub (which would make a jump straight
  // to the middle of the page read the wrong start values).
  tl.progress(1).progress(0);
  return tl;
}
