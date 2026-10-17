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
| `#home` (or none) | Scroll film intro, then hero, the three lenses, craft, workshop, contact |
| `#lenses` | The three lenses, with a side-by-side table |
| `#lens-shaniwar`, `#lens-parvati`, `#lens-sinhagad` | One lens: large still, one line, specifications, enquire |
| `#craft` | How a lens is made, five steps with stills from the scene |
| `#workshop` | The workshop in Pune |
| `#contact` | Email and phone (no form) |

The first script in `<head>` picks the route from the address before first
paint. Without JavaScript the same routes work through CSS `:target`.

The film (the lens scene and its scroll move) lives on home only and ends
after Focus; the site's hero takes over there. A fresh load always plays the
film from the top; coming back to home from another page lands on the hero.
"Skip film" jumps to the hero without changing the address. Other pages are
plain HTML with stills: the lens code does not start until home is shown,
and stops drawing while another page is up.

## Source

- `src/content/*.js` — all words and figures (site, home, film captions,
  lenses and their sample specs, craft steps, workshop, contact, image alt
  text). Edit these, not the templates.
- `src/site/render.js` — build-time templates that turn the content into
  the routes. `src/site/site.js` — the router, menu, copy buttons, badge pill.
- `src/app/*` — the lens: scene, story timeline, live/2D tiers, tier badge.
- `src/page.html`, `src/styles.css` — the shell and all styles.

## Build

```bash
node kessel/scripts/build.mjs      # writes kessel/index.html
node kessel/scripts/stills.mjs     # re-renders kessel/stills/*.webp from the scene (then rebuild)
node kessel/scripts/verify.mjs     # offline, host-policy, no-WebGL and boot-failure checks
node kessel/scripts/pages.mjs out 390x844 "lenses,craft" --full   # page screenshots
node kessel/scripts/home.mjs out 1440x900 --gl                     # home walk-through with the live film
node kessel/scripts/shots.mjs out 1440x900 "1.95,4.6" --gl         # film frames at story times
```

Uses the repo's `node_modules` (three, gsap, lenis, esbuild, the two
@fontsource-variable fonts, playwright).

## How the film runs

The badge (home only) always says which version is running:

- **LIVE 3D**: Three.js lens, scroll-driven camera move.
- **2D FALLBACK**: Canvas 2D drawing of the same move, with the reason
  (no WebGL, software-only WebGL, too slow, or context lost).
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
closes up (pinned, 1.5 beats) · 9.6–11.2 focus ring turns (pinned, 2 beats),
end of film. One beat is 700 px on desktop, 420 px on phones. The rest of
the timeline (11.2–16.5) is only used to pose stills for the site.

## QA flags

`?gl=force` accepts software WebGL (for GPU-less test machines) and disables
the frame-rate watchdog; `?tier=2` forces the 2D version; `?static` forces
stills; `?still=name` renders one still frame (build tool).
