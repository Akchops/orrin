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
