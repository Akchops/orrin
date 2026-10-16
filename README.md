# Orrin Watch Co. — animation-led concept

Private, unofficial demo. One watch, modelled in code, taken apart by scroll.
Orrin Watch Co. is a fictional business; the contact details are placeholders.
The page is `noindex, nofollow`.

## Run it

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # dist/ (production) and artifact/ (preview host build)
npm run preview    # serves dist/ at http://127.0.0.1:4173
npm run stills     # re-render the fallback stills (needs `npm run dev` running)
```

## What it is

- **The watch** (`src/watch/`): case, lugs, bezel, domed sapphire crystal,
  knurled crown and stem, engraved caseback with a sapphire window, a
  hand-wound movement (plate with perlage, bridges with Côtes de Genève,
  gilt train, escape wheel, pallet fork, balance with hairspring, jewels,
  blued screws), sunburst dial with applied markers and small seconds,
  faceted dauphine hands, leather straps. All geometry and textures are
  generated at boot; nothing is downloaded.
- **Lighting**: a studio built in code (`env.js`) and baked into a PMREM
  environment map. No HDRI files.
- **Live details**: the hands show Mumbai time, the balance oscillates at
  3 Hz and the seconds step six times a second.
- **Scroll** (`src/story.js`, `src/experience.js`): one GSAP timeline holds
  every scene channel; scroll position maps to story time through anchors on
  the ScrollTrigger pins. Lenis smooths the wheel and shares GSAP's ticker.
- **Pointer**: mouse tilts the watch and turns the environment, so
  reflections slide over the steel. On touch, horizontal drags turn the
  watch; an opt-in button uses device tilt where the browser allows it.

## Scenes and scrub distances

| scene | beats | distance | why |
|---|---|---|---|
| Disassembly (pinned) | 6 | 6 × 700 px desktop, 6 × 420 px phone | crown; caseback off and lift; gears separate; hold; dial; reassembly and strap |
| Models (pinned) | 5 | 5 × 560 px desktop, 5 × 336 px phone | one model per beat: half held, half morphing |

Beat size is `min(700 | 420, 0.95 × viewport height)` and is re-read on resize.

## Tiers and fallbacks

1. **WebGL** (Three.js) when the silent capability probe passes.
   Phones and small-memory machines get DPR 1.5 and lighter materials.
   Sustained frames over 22 ms step the resolution down, then drop to tier 2.
2. **Canvas 2D** (`src/tier2/canvas2d.js`) when WebGL is missing, software
   emulated, too slow, or the context is lost. Same timeline, same
   disassembly, same pointer tilt; flat shading instead of image lighting.
3. **Stills** for no-JS and `prefers-reduced-motion`: every stage as an
   image with its caption and parts list, rendered from the same scene by
   `scripts/render-stills.mjs`.

First load (HTML + inlined CSS + bootstrap) is about 10 kB gzip. Three.js,
GSAP, ScrollTrigger and Lenis load lazily after the probe.

## QA flags

These exist for capture in GPU-less containers and are not linked anywhere.

- `?gl=force` — accept a software WebGL renderer as tier 1 and disable the
  frame-rate watchdog.
- `?tier=2` — force the Canvas 2D tier.
- `?static` — force the stills layout.
- `?debug` — log boot errors instead of failing silently to stills.

## Screenshots

`docs/screenshots/` holds laptop (1440 × 900 @2x) and phone (390 × 844 @3x)
captures of the disassembly, rendered with SwiftShader.
