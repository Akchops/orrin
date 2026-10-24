# Kessel Optics — single-file concept site

Private, unofficial demo for a fictional lens maker. Contact details are
placeholders, the three lens names are proposals and every specification is
a sample figure (the pages say so). `noindex, nofollow`.

**Deliverable:** `kessel/index.html`, one self-contained file. Libraries,
app code, fonts and still frames are inlined; the page makes no network
requests, so it works opened from disk, offline, or on a host that only
allows inline scripts.

## Pages

One file, hash routes (plain fragment tokens, so they survive hosts that
only pass the fragment through):

| Address | Page |
| --- | --- |
| `#home` (or none) | One continuous page: the hero (the film's first frame), the scroll film (iris, glass, back together, focus, the three lenses, the signed barrel, contact), then the teardown |
| `#lenses` | The three lenses, with a side-by-side table |
| `#lens-shaniwar`, `#lens-parvati`, `#lens-sinhagad` | One lens: large still, one line, specifications, enquire |
| `#craft` | How a lens is made, five steps with stills from the scene |
| `#workshop` | The workshop in Pune |
| `#contact` | Email and phone (no form) |

The first script in `<head>` picks the route from the address before first
paint. Without JavaScript the same routes work through CSS `:target`.

Home is one continuous scroll. The hero is the film's first frame (the
lens cropped by the screen edges, iris closed to a pinhole); the first
scroll opens the iris and the film runs in full. When its Contact stage
fills the screen, the same move carries straight on into the teardown:
the lens comes apart into one line, then each screen of scroll stops the
camera at the next part (front element, glass groups, iris blades, focus
ring, distance scale, barrel, mount, signature plate), close, the others
dimmed and drawn back, its name and caption beside the stage (below it on
phones) with a small map of where the camera is. Then it goes back
together, and the visitor can tap a part or drag the lens. The section is a
screen per stop with a sticky stage and one snap anchor per stop
(`src/site/td-steps.js` reads the active stop from the anchors; nothing
moves the page). The header jumps to Teardown, Company and Contact on this page;
the earlier pages (Lenses, Craft, Workshop and the lens details) are linked
from the footer. They are plain HTML with stills: the lens code does not
start until home is shown, and stops drawing while another page is up.

## Source

- `src/content/*.js` — all words and figures (site, home, film captions,
  lenses and their sample specs, craft steps, workshop, contact, image alt
  text). Edit these, not the templates.
- `src/site/render.js` — assembles the routes; `src/site/pages/*.js` — one
  template per page; `src/site/film.js` — the film's markup (do not
  restyle); `src/site/parts.js` — shared pieces (images, footer, tables).
  `src/site/site.js` — the router, menu, copy buttons, badge pill.
  `src/site/td-steps.js` — steps the teardown by scroll in every tier;
  `src/site/debug.js` — the readout shown with `?debug=1` or `#debug`.
- `src/app/*` — the lens: scene, story timeline, live/2D tiers, tier badge.
  `src/app/teardown.js` — each part's path in the teardown, shared by both
  tiers; `src/app/td-stops.js` — the teardown's stops (poses, framing in
  the stage box, the map); its words are in `src/content/teardown.js`.
- `src/page.html` — the shell. `src/styles/*.css` — `base.css` (shared),
  `film.css` (the film, as it was), then one stylesheet per page.

## Build

```bash
node kessel/scripts/build.mjs      # writes kessel/index.html (--out=path to write elsewhere)
node kessel/scripts/stills.mjs     # re-renders kessel/stills/*.webp from the scene (then rebuild)
python3 kessel/scripts/lineup.py   # composes the three-lens lineup from lineup-1..3
node kessel/scripts/verify.mjs     # offline, host-policy, no-WebGL and boot-failure checks
node kessel/scripts/pages.mjs out 390x844 "lenses,craft" --full   # page screenshots
node kessel/scripts/home.mjs out 1440x900 --gl                     # home walk-through with the live film
node kessel/scripts/shots.mjs out 1440x900 "1.95,4.6" --gl         # film frames at story times
```

Uses the repo's `node_modules` (three, gsap, lenis, esbuild, the two
@fontsource-variable fonts, playwright).

## How the film runs

The badge (home only) always says which version is running:

- **LIVE 3D**: Three.js lens, scroll-driven camera move. A watchdog
  (`src/app/watchdog.js`) judges drawn frames against the display's own
  cadence (learnt from idle ticks, so Safari's 30 fps clock in Low Power
  Mode or an embedded page is not mistaken for a slow GPU). Missed frames
  step the quality down a ladder: resolution first, then the clear coat and
  thin film; the badge then says it is running at reduced quality. A lost
  WebGL context restarts once at low quality.
- **2D FALLBACK**: Canvas 2D drawing of the same move as solid, shaded
  parts (`src/app/tier2*.js`), with the reason: no WebGL, software-only
  WebGL, the lowest 3D quality still under 15 fps, or the context lost twice.
- **STILLS**: still frames with captions, with the reason: JavaScript off,
  reduced motion (with a button to play the live version anyway), or the
  exact error if the live lens failed to start. A notice at the top of the
  page repeats it. A 12 s boot timeout also reports instead of leaving
  stills up silently.

On phones the badge is a pill in the header band; tap it for the reason.
On desktop it folds to the same pill once the site has taken over from the
film. The libraries are wrapped in a function in the page, so they are only
compiled when the live lens starts. The scene renders only when scroll or
the pointer changes it.

Story units, scroll-mapped: 0–1 hero, iris closed · 1–3 iris opens blade by
blade (pinned, 2 beats) · 3–3.6 dive onto the axis · 3.6–7.2 through the
barrel (pinned, 4 beats) · 7.2–7.8 out to the sensor, turn · 7.8–9 lens
closes up (pinned, 1.5 beats) · 9.6–11.2 focus ring turns (pinned, 2 beats) ·
11.8–14.2 the three lenses (pinned, 3 beats) · 14.2–15.2 the signed barrel
· 15.2–16.5 contact, end of film · 16.5–25.3 teardown (pinned, 8.3 beats):
the parts leave, eight captions, back together. One beat is 700 px on
desktop, 420 px on phones.

In the glass stage the camera passes the iris and sees the sensor as a
small light at the far end; it sits at the bottom of a short camera throat
lit by its own image circle, and is close only at the exit. Its photosite
grid is drawn only when it fills the frame.

Site imagery is rendered from the same scene (`src/app/stills.js` poses):
close crops of the iris, coated glass, knurled ring, engraved scale,
signature and mount, the three lenses, an exploded view and a lineup. These
keep a transparent background so they sit on the page with no box.

## QA flags

`?gl=force` accepts software WebGL (for GPU-less test machines) and disables
the frame-rate watchdog (`&watchdog` keeps it on; `&slow=N` adds N ms of
work to each drawn frame, to fake a slow phone); `?tier=2` forces the 2D version; `?static` forces
stills; `?still=name` renders one still frame (build tool).
