# Kessel — final pass log

Running log for the overnight pass. Each numbered step ends with a build,
a check that the film, hero and badge still work, a commit, a push and a
republish of the same private preview
(https://claude.ai/artifact/Qw1M9HVgSkMimpHQmnsgKX).

No real GPU on the build machine: the 3D tier is only ever checked with
software WebGL (SwiftShader, `?gl=force`); the 2D tier and the stills are
checked as they are.

## Safety

- Restore point: commit `148a55d` (the last commit before this pass).
- Local tag `kessel-before-final-pass` created on it. Pushing the tag was
  refused by this session's git access (HTTP 403: only the working branch
  `claude/focused-allen-cn8r5h` may be pushed), so the tag exists locally
  only. The commit itself is on the remote branch, so it can be restored
  with `git checkout 148a55d -- kessel` or tagged from GitHub.

## Steps

### 1. Phone tier drop — done (built in the previous round, re-verified)

Why the iPhone stepped down: the watchdog, not memory or the device
check. It counted every frame slower than 22 ms as slow and, after about
90 of them, lowered the resolution (1.5x, 1.25x, 1x) and then switched to
2D. Safari runs page animation at 30 fps (33 ms) in Low Power Mode and in
embedded pages such as the preview, so a healthy phone read as slow. A
simulation of that clock reproduces the drop after about 17 s of scroll.

Now: `src/app/watchdog.js` judges frames against the display's own
cadence; missed frames step down a ladder (resolution, then clear coat
and thin film) and only a lowest rung under 15 fps falls back to 2D. A lost
WebGL context restarts once at low quality. The 2D tier draws solid,
shaded parts (`src/app/tier2*.js`).
Check: smoke test (2D at 390 and 1440, software WebGL at 1440, reduced
motion, no JS) all passed; the watchdog simulation (`wdsim.mjs`) keeps a
30 fps phone on 3D at full quality.

### 2. Phone text and badge — done (previous round, re-verified)

Phone captions are a compact gradient panel at the bottom with a one-line
short text: 14–25% of the screen at 390x844 and 390x664. The badge on
phones is a 26 px pill top right (3D / 2D / STILLS) that expands on tap.

### 3. Brighter — done

The page moved from near black (#06070a) to a deep charcoal gradient
(#272b33 at the top, #15171c, #101216 at the edges); every dark literal in
the styles follows it, and secondary text was lifted to keep about 7:1
contrast. 3D: tone-mapping exposure 1.22, a brighter studio shell in the
environment map, environment intensity 1.3, a stronger key light and a
soft rim light through the whole film. The 2D tier got the same lift. All
stills were re-rendered with transparent backgrounds so they sit on the
new page like the live canvas (they used to be flattened onto black).
Check: smoke test passed; reduced-motion stills checked at 390 and 1440.

### 4. Teardown clarity — done (built in the previous round, re-checked on the brighter build)

Parts rail listing the eight parts (vertical on the right on desktop, a
horizontal strip at the bottom on phones). The parts land in one
left-to-right line in rail order. While scrolling, the part being
explained is brightest (a light multiplier plus a soft violet rim) and the
others dim. Key, rim and a second warm rim light every part in the
teardown; the iris blades are brushed steel with bent normals so they
catch the light. Check: software-WebGL shot at story 19.6 and the smoke
test's teardown select on both tiers.

### 5. Distance scale — done

One set of ticks, all the way round, in both tiers: a short tick every 4
degrees and a long tick exactly at each metre numeral, with no short tick
within 1.6 degrees of a long one (the doubled look came from a fine
all-round set drawn on top of the throw ticks). The band was already a
full ring that turns with the focus ring. The chunky index wedge (a box
and a cone) is now a fine engraved line, 0.22 mm wide, flush with the
barrel. The stills that show the scale (focus, d-scale, d-knurl) still
show the old ticks until the stills are re-rendered after step 8.
Check: software-WebGL focus stage and scale close-up, 2D the same; smoke
test passed.

### 6. Natural close-ups and a live 3D feel — done

- Tapping a part (scene, label or rail) first lights it and dims the rest,
  then glides the camera in over 1.15 s (power3 ease) on an arc that lifts
  about 9 degrees on the way; no snap.
- In the close-up: a slow drift (about 6 degrees of orbit and 2.5 of
  elevation) so it never freezes; drag to orbit (kept within 65 degrees of
  the close-up angle so the neighbours never block it); pinch or the wheel
  zooms (0.6x to 1.6x) with inertia; the page stops scrolling while a part
  is open (Back, Escape, a second tap or a tap on empty space returns).
- Soft depth of field (3D): the scene goes into a half-float target with a
  depth texture and one 24-tap pass blurs by distance from the part, so it
  is sharp and the rest goes soft; only on quality rungs with the extras.
  Skipped on the 2D tier (a per-part canvas blur would cost too much on
  phones); there the other parts dim and drift back instead.
- The other parts dim and drift back up to 22 mm from the picked part along
  the axis, in both tiers, rather than vanishing.
- The whole lens: a drag (mouse, or a finger sliding sideways) turns it,
  it carries on a little when let go and settles back to the film's pose
  after 1.6 s at rest; a mouse at rest tilts it slightly. Text is not
  selected while turning.
Check: 2D orbit, zoom, Escape and the lens drag scripted at 1440;
software-WebGL close-up with depth of field and an orbit drag; smoke test
passed; real taps, chips, Back and Escape still pass (`tap.mjs`).

### 7. Materials up close — done

- Turning marks: a procedural texture of fine concentric grooves, used as
  a roughness and bump map on the lathed anodising and as roughness on the
  bare edges and steel, so highlights break into fine rings up close and
  average out at a distance.
- Bare machined edges and the steel mount are brushed (anisotropic), so
  their highlights stretch into soft streaks; every lathe profile already
  carries bare bevelled edges and smooth-shaded corners that catch light.
- Knurl wear: per-vertex colour leaves the crests a touch lighter, unevenly
  round the ring, where fingers would rub the anodising thin.
- Environment reflections come from the brighter studio map of step 3.
- The quality ladder's low rungs still drop the clear coat and thin film;
  the low-quality materials (rebuilt context) skip the new maps.
Check: software-WebGL hero, focus stage, signed barrel, focus-ring and
mount close-ups; smoke test passed.
