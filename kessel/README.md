# Kessel Optics — single-file concept

Private, unofficial demo for a fictional lens maker. Contact details are
placeholders and the three model names are proposals (the page says so).
`noindex, nofollow`.

**Deliverable:** `kessel/index.html`, one self-contained file. Libraries,
app code, fonts and still frames are inlined; the page makes no network
requests, so it works opened from disk, offline, or on a host that only
allows inline scripts.

## Build

```bash
node kessel/scripts/build.mjs      # writes kessel/index.html
node kessel/scripts/stills.mjs     # re-renders kessel/stills/*.webp from the scene (then rebuild)
node kessel/scripts/verify.mjs     # offline, host-policy, no-WebGL and boot-failure checks
node kessel/scripts/shots.mjs out 1440x900 "1.95,4.6" --gl   # screenshots at story times
```

Uses the repo's `node_modules` (three, gsap, lenis, esbuild, the two
@fontsource-variable fonts).

## How it runs

The badge in the bottom-left corner always says which version is running:

- **LIVE 3D**: Three.js lens, scroll-driven camera move.
- **2D FALLBACK**: Canvas 2D drawing of the same move, with the reason
  (no WebGL, software-only WebGL, too slow, or context lost).
- **STILLS**: still frames with captions, with the reason: JavaScript off,
  reduced motion (with a button to play the live version anyway), or the
  exact error if the live lens failed to start. A notice at the top of the
  page repeats it. A 12 s boot timeout also reports instead of leaving
  stills up silently.

The libraries are wrapped in a function in the page, so they are only
compiled when the live lens starts. The scene renders only when scroll or
the pointer changes it.

## The move (story units, scroll-mapped)

0–1 hero, iris closed · 1–3 iris opens blade by blade (pinned, 2 beats) ·
3–3.6 dive onto the axis · 3.6–7.2 through the barrel past each element and
the iris (pinned, 4 beats) · 7.2–7.8 out to the sensor, turn · 7.8–9 lens
closes up while the camera backs away (pinned, 1.5 beats) · 9.6–11.2 focus
ring turns, scale rolls (pinned, 2 beats) · 11.8–14.2 three lenses (pinned,
3 beats) · signed barrel · contact. One beat is 700 px on desktop, 420 px
on phones.

## QA flags

`?gl=force` accepts software WebGL (for GPU-less test machines) and disables
the frame-rate watchdog; `?tier=2` forces the 2D version; `?static` forces
stills; `?still=name` renders one still frame (build tool).
