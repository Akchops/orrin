# Kessel: work state

Live preview (same link every step): https://claude.ai/artifact/Qw1M9HVgSkMimpHQmnsgKX
Branch: claude/focused-allen-cn8r5h. Build: `node kessel/scripts/build.mjs`.
Checks: `kessel/scripts/audit.mjs` (overflow at seven widths and a framed
pane), the smoke test in the session scratchpad (film, teardown, badge,
reduced motion, no-JS). Last passing commit before this follow-up: c40841b.

## Follow-up "nine parts" (current)

Last passing commit before it: 91945ca (preview version 28).

| Part | What | State |
|---|---|---|
| 1 | Distance scale numerals: gutters, nothing clipped, collision rule, 2x texture, one closest-focus value in film and teardown | done |
| 2 | Fit every lens by both axes (bounding sphere, width and height, ResizeObserver, DPR); stage separate from text | done |
| 3 | Lenses page street viewer: fit one screen, pin, dwell on 24 / 50 / 100 | done |
| 4 | Craft build-up pins and dwells on five stages; every multi-step beat fits, pins and dwells; "Your turn" contrast | done (Company in Part 7, Contact layout in Part 8) |
| 5 | Craft finale: the lens seals and turns face-on, scrubbed both ways | done |
| 6 | Inspect the lens: pinned close-up beat (built to Part 9's spec, which wins) | done (Part 9's close-up half included) |
| 7 | Company: bench, timeline, checks each pin and stop at every milestone | done |
| 8 | One shared lens stage; Contact rebuilt; white dot and glare fixed at source; guard test in the build | done |
| 9 | Home tab in the nav; automatic close-ups on every lens page | close-ups done in Part 6; Home tab next |

### Part log

- 1 done: one scale layout in millimetres on each lens (textures.js
  scaleLayout), shared by the 3D texture, the 2D tier and the lens-page
  ring: margin | metres (ending at their gutter) | gutter | ticks | gutter
  | feet | margin; numerals sized to the band from Saira's measured
  advances and drawn true to shape on each lens (Shaniwar's band is 0.72x
  as long, Sinhagad's 1.45x); a label closer than 1.3 numeral heights to
  its neighbour is dropped (ends kept); marks re-picked at nearly even
  dioptre steps; texture at 2x (8192 px) where the GPU allows. The film and
  teardown keep Parvati's scale only (closest mark 0.45 m) through the
  three-lens morph; stills of one lens ask for its own (S.ownScale). The
  "0.8" was the film's readout (toFixed(1)): it now reads the engraved
  mark (0.45 m at the end). Focus still posed at the closest mark; close-
  focus tiles at each lens's closest mark; the Craft and bench drawings take
  their marks from the same tables. scripts/verify-scale.mjs runs in every
  build and fails it if a numeral touches a tick, leaves its band or
  crowds its neighbour. Evidence: kessel/screenshots/scale/. Audit 64 of
  64; smoke passed.
- 2 done: each lens's measured bounding sphere (fit.js MODEL_SPHERE: the
  centre of its visible box and its farthest vertex) is fitted by both
  axes: distance = r x margin / sin(atan(min(tan(v/2), tan(v/2) x
  aspect))), margin 1.06. The film's three-lens chapter (the 2576x1105
  Sinhagad crop) now fits the lens to its own stage box, .models__stage,
  between the heading and the list (no taller than 70% of the screen),
  blended in and out over the timeline (S.fit), and the heading and list
  fade before the stage leaves, so the lens never meets the text. The
  lineup still was recomposed with each lens at 20 / 50 / 80% and room
  above and below, and the live lineup is solved by both axes from the
  same shares; single-lens viewers centre the visible box and fit its
  sphere, so the lens stays whole at any turn. Canvas size from
  ResizeObserver at device pixel ratio (unchanged). Tested in software
  WebGL (no real GPU): Lenses page and Sinhagad page at 2576x1105,
  2560x1440, 3440x1440, 1920x1080, 1728x1117, 1440x900, 1280x720, 768x1024
  and 390x844, lens inside its canvas and clear of all text at every size;
  the film chapter at the same 9 sizes in 2D and 3 in WebGL, no crop or
  overlap. Evidence: kessel/screenshots/fit/. Audit 64 of 64; smoke passed.
- 3 done: the street viewer fits one screen at every size: heading and
  intro in one row; the frame no taller than 55% of the screen with the
  dial under it; beside it the lens cards, what the lens sees, the cue
  and a "Show the whole street" toggle holding the overview and the
  sample note ("Lens · sample figures, full frame" stays visible); on
  phones the cards sit in a row under the dial. Pinned pins keep clear of
  the tier badge and the tried pill. It pins as a beat for about two
  screens with three dwell stops (Shaniwar 24 mm, Parvati 50 mm, Sinhagad
  100 mm: card, angle and crop follow, gliding between) and reverses on
  the way back; "Your turn" with the 4 s nudge at the last stop. beats.js:
  stops with rests and glides, settle on the nearest stop in the direction
  of travel, ease in when stopping just short, a flick over the whole beat
  lands on its start (once, one retry if cut short); a pin that grows (the
  toggle opened) is laid out again in place and drops into the flow; the
  cue leaves only when the press ends, so the first tap is never lost.
  Lens pages use the same viewer with a fourth stop home to their own lens.
  Reduced motion: 50 mm with the cue, nothing pinned. No JS: three
  captioned stills, the whole street in the toggle. Tested (2D tier) at
  2576x1105, 1920x1080, 1728x1117, 1440x900, 1280x720, 1024x768, 768x1024
  and 390x844: pinned, every stop read back, nothing under the badge or
  past the screen; snapping, flick, toggle, reduced motion and no-JS
  checked at 1440x900 and 390x844. Evidence: kessel/screenshots/street/.
  Audit 64 of 64; smoke passed.
- 4 done: Craft's build-up fits one screen at every size (heading in one
  row, the drawing about 55% of the screen, 2:1 with the caption beside it
  on wider screens, the controls under it; the caption keeps the height of
  its longest stage and the stage buttons their short names, so nothing
  grows mid-scroll) and pins for about five screens with a stop at each
  of 01 Glass, 02 Iris, 03 Barrel and focus ring, 04 Assembly and 05
  Signing; scroll back undoes them; "Your turn" with the nudge at 05.
  Lens pages: focus pull stops at near (scooter), mid (person) and far
  (fort); aperture at wide open, half way and stopped right down; what it
  sees at 24 / 50 / 100 mm then home (Part 3). Lenses page compare strip:
  wide / mid / closed. Contact picker: a stop at each lens. Every pinned
  pin keeps clear of the tier badge; a pin that grows a little into its
  own bottom padding still pins. "Your turn" pills are dark text on the
  bright pill everywhere (7.6:1; the Craft one was grey, overridden by its
  label's span colour). Reduced motion: each control at its middle value
  with the cue, nothing pinned (Craft: stage 3). No JS: unchanged stills
  and captions. Tested (2D tier) at 2576x1105, 1920x1080, 1728x1117,
  1440x900, 1280x720, 1024x768, 768x1024 and 390x844: Craft, focus,
  aperture, sees, compare and the Contact picker pin and read back each
  stop, nothing under the badge or past the screen, except the Contact
  picker at 390x844, which is too tall to pin (974 px for 776) and plays
  in the flow until Part 8 rebuilds that page. Company's beats are Part
  7's (it gives them their own stops). Evidence: kessel/screenshots/beats/.
  Audit 64 of 64; smoke passed.
- 5 done: after 05 the Craft beat runs about one and a half screens more,
  scrubbed both ways. CLOSE: the shell (the cut half drawn from outside,
  as the bottom half is) sweeps on from the mount to the front behind a
  moving clip with a bright leading edge; the glass, iris, light, pen,
  iris detail and labels go; the engraving, the amber ring, the scale,
  KESSEL HAND ASSEMBLED PUNE and the signature stay. TURN: the sealed lens
  turns about 90 degrees to face the viewer with a little perspective,
  drawn in code section by section (craft-lens.js turnShapes: each ring an
  ellipse r sin(yaw) by r, the far half the visible side, back to front;
  the knurl, step faces and near-side marks go with it; the front, face on,
  is the lens pages' drawing with its engraved ring and half-open iris),
  ending centred and a little larger while the desk, lamp and window dim.
  Then "Sealed" top left, "Your turn · Drag to open it up again"; dragging
  the drawing sideways scrubs it (left opens, right closes and turns; let
  go and it settles), the stage buttons and slider still work (from sealed
  they animate it open). Fits one screen in the same frame. Reduced motion:
  sealed, still, with a "Show inside" toggle. No JS: two captioned stills,
  inside (all five stages) and sealed face on. Tested (2D tier) at
  2576x1105, 1920x1080, 1440x900, 1280x720, 1024x768, 768x1024 and 390x844:
  pinned, mid-close, sealed, mid-turn and final read back and nothing past
  the screen; drag both ways, buttons from sealed, reduced and no-JS
  checked at 1440x900. Evidence: kessel/screenshots/finale/. Audit 64 of
  64; smoke passed.
- 6 done, built to Part 9's spec (one build for both): "Inspect the lens"
  replaces the Craft close-up mosaic and the lens pages' detail tiles. A
  beat with six stops (the whole lens, 01 Glass, 02 Iris, 03 Scale, 04
  Mount, 05 Signed), driven by scroll: live, the lens viewer's new inspect
  mode glides the camera between the poses (src/app/inspect.js: angle,
  look-at point, distance fitted to the stage by both axes, the lens's own
  iris and focus), dwelling at each; the stage is one fixed box. Beside it,
  never over it: a map of the lens from above (to its own length) with the
  five details numbered and the camera moving round it with its view, the
  caption (height reserved), and the list. Then "Your turn": the list and
  the map's numbers jump to a detail and the live lens can be dragged to
  look round it. Each lens page shows its own lens, colour and scale;
  Craft shows Parvati. 2D and stills tiers: the same views as stills,
  cross-fading. Reduced motion: the whole lens and a tappable list. No JS:
  the whole lens and five captioned stills. The images were fixed at the
  source: the old close-ups had the iris closed to a pinhole (the white dot)
  or opening one blade at a time (the notched blob through the glass and
  the blue shape in the mount view), with the light behind on (glare);
  the new stills and the live views stop the iris down evenly with no light
  behind, and the faulty stills are gone (the Lenses compare strip and
  Contact use the new ones). Tested: 2D tier at 2576x1105, 1920x1080,
  1440x900, 1280x720, 1024x768, 768x1024 and 390x844 on two lens pages and
  Craft (pinned, six stops read back, nothing under the badge or past the
  screen); software WebGL at 1440x900 (live badge, the camera moved at
  every stop, the whole lens inside its stage); no-JS and reduced motion
  at 1440x900 and 390x844; WebGL also at 390x844. Evidence: kessel/screenshots/inspect/. Audit 64
  of 64; smoke passed.
- 7 done: Company. Bench: four stops, one note each; the note goes where
  it covers no other marker and none of the heading's copy (above, below,
  left, right, shifted, or raised above all the markers, pointing down at
  its own), checked at every stop at seven sizes; on phones it docks under
  the drawing (the drawing 16:10, the lead making room, the slot the
  height of the longest note). From 900px the heading sits on the
  drawing's wall so the bench holds in one screen. Timeline: five stops at
  2017, 2019, 2021, 2023 and 2025; the heading and its notes in one row and
  the whole centred, so the gap under the heading is gone. Checks: six
  stops, one tick each (the next tile filling on the way), all six and the
  signature at the last, "Run it again" then reruns them, hand ticking
  still works; compact tiles with the line of the check just ticked in one
  caption under them, the drawing sized to the screen. Contrast and
  snapping as in Part 4. Found and fixed on the way: the browser's scroll
  anchoring could jump the page when a pinned beat was re-measured (it is
  off now, and the beats keep their heights while measuring). Tested (2D
  tier) every stop at 2576x1105, 1920x1080, 1440x900, 1280x720, 1024x768,
  768x1024 and 390x844: pinned, read back, nothing under the badge or past
  the screen; notes clear of other markers at all seven; "Run it again"
  and hand ticking at 1440x900 and 390x844. Evidence:
  kessel/screenshots/company/. Audit 64 of 64; smoke passed.
- 8 done: one shared lens stage (`.lstage` with `data-lstage`, in
  base.css). The Home hero, the Lenses lineup, each lens page, Inspect (lens
  pages and Craft) and Contact show the lens in a box of its own, never
  taller than 70% of the screen and apart from any text. The lens is fitted
  inside it by both axes: live, from its bounding sphere (fit.js, with
  ResizeObserver and the pixel ratio); as a still, by object-fit: contain.
  Per-page framing removed:
  - The hero's per-breakpoint framing is gone (the hero-wide and hero-tall
    stills and their offsets). The film's first frame now fits the lens to
    the hero's stage box (live.js), and one square still (hero-stage,
    centred) stands in for no-JS, reduced motion and the stills tier.
  - The lens-page stage was taller than 70% at 2576x1105; it is now capped.

  Contact rebuilt as one pinned beat. The lens is whole in its stage: the
  three together until one is picked, then that lens. The heading, "Which
  lens is it about?", the chips and the email card sit beside it (below it
  on phones). Removed: the full-bleed glass with the email over it, and the
  two other background-image frames. The phone number and "What helps us
  answer" follow on the plain page. The tried pill is hidden on any page
  with one control.

  Inspect: the five close-ups moved out of the stage box. With JS they lie
  over it; without JS they stand in a row under it, so the stage keeps the
  same 4:3 box.

  The white dot and the glare, fixed at the source:
  1. The white disc was the inner glass elements' stacked reflections, seen
     face on through the open iris. They are now drawn at 45%: opacity
     scales the additive layer. envMapIntensity had no effect, because
     with scene.environment three.js uses the scene's intensity for every
     material.
  2. The glare at the top right was the key light, a directional light,
     landing as a blown-out spot on the near-mirror glass. The glass now
     takes 6% of the lights' direct reflection, via a shader patch that is
     also carried into the emphasis copies, and keeps the studio's soft
     strips at roughness 0.07. The studio's pinpoint is softer (15 instead
     of 50, and larger). The rim lights are unchanged.
  3. The film's light behind the lens shows only once the iris opens, so a
     closed iris shows no point of light.
  4. On the 2D tier, the highlight no longer has a hard core.

  Stills re-rendered with the new glass: hero-stage, lens-1..3,
  lineup-1..3 (lineup recomposed), the 15 close-ups, model-1..3, the film
  frames and the teardown.

  Guard: scripts/verify-stage.mjs runs in every build, and the page is
  written only if it passes. It covers Home, Lenses, the three lens pages,
  Craft and Contact (80 stages in the 2D tier) at 2576x1105, 1920x1080,
  1728x1117, 1440x900, 1280x720, 1024x768, 768x1024 and 390x844. It
  checks three things:
  - the lens's box on screen lies inside its stage;
  - the stage is no taller than 70% of the screen;
  - no visible text touches the lens. Every text node's line boxes count,
    including the badge and the tried pill.

  The lens's box comes from a still's opaque pixels mapped through
  object-fit, from the 2D film's canvas, or from a live viewer's or the
  live film's own projection of the model. It found two real faults, both
  fixed: the lens-page stage above, and the Lenses title's type box
  running into the lineup.

  Also run by hand: no-JS, reduced motion, the stills tier (?static) and
  software WebGL (?gl=force).

  Beats: Contact pins at all eight sizes, including 390x844 (before, 974 px
  for 776). On short wide screens it comes down a size.

  Tested:
  - Build guard: 80 of 80 stages pass in the 2D tier. The same 80 pass with
    no JS, with reduced motion and in the stills tier.
  - Software WebGL (?gl=force), every stage at 2576x1105, 1440x900,
    1024x768 and 390x844: the live film hero and the live viewers each
    measure their own lens inside the stage. Run one browser at a time;
    four software renderers at once starve the CPU.
  - Beat regression at the eight sizes: Craft, the three lens-page labs,
    the Lenses street viewer and compare strip, and Contact all pin and
    stop.
  - Audit 64 of 64; smoke passed (scroll moves the film and the teardown
    answers a click under software WebGL).

  Evidence: kessel/screenshots/stage/ (Contact, hero 2D and live, no-JS,
  close-ups before and after).
## Earlier follow-up "frame, three lenses, lens experiences, beats" (done)

| Step | What | State |
|---|---|---|
| 1 | Frame the whole lens; fix overflow; screenshot every page at every width | done |
| 2 | Three different lenses again (restore silhouettes, hood, collar); lineup at one scale | done |
| 3 | Street viewer as centrepiece (already built in the last follow-up: verify) | done |
| 4 | Lens pages as pinned, scroll-led experiences (focus pull, aperture and bokeh, what it sees, specs and enquire); Lenses hover tint, bokeh preview, compare strip | done |
| 5 | Craft and Company illustrated centrepieces (already built: verify, vary layouts) | done |
| 6 | Scroll stops at every interactive milestone; handles, cues, nudges, progress; the checks run under scroll | done |
| 7 | Final QA at every width, reduced motion, no-JS | done |

## Notes for resuming
- Each step ends with: build, smoke test, commit, push, republish the
  preview, then this table updated.

## Step log
- 1 done: Lenses sections rebuilt as lens + copy side by side (alternating;
  the third centred with its copy under it), each lens whole and at most
  70% of the screen tall, type sized to its column; lens pages open on the
  whole lens (turning slowly in the live viewer, drag to turn) with name,
  focal length and line beside it (under it on phones). Audit 64 of 64;
  contact sheets per page in kessel/screenshots/widths/.
- 2 done: the three lenses are three shapes again (geometry restored from
  8f40c52 and tuned): Shaniwar short and stubby (0.72 x length, 1.2 x
  front) with a big bulging front glass and a small petal hood; Parvati
  plain, no hood; Sinhagad the longest (1.45 x) and narrower (0.86 x) with
  a long tube hood and a tripod collar. Hoods start in front of the
  engraved name, so it shows. Per-lens framing in the viewers and stills;
  the lineup still and the live lineup at one common scale, at most 70%
  of the screen tall, labels under each lens. Specs differ (front
  diameter, length, hood, tripod collar, weight; sample figures). Every
  "matched set" line removed (pages, alts, Company timeline and FAQ). The
  Company bench tray draws the three at their own sizes. Audit 64 of 64,
  smoke passed, live lineup and turning Sinhagad checked in software
  WebGL.
- 3 done (checked, no code change): "See the difference" opens each lens
  page with that lens chosen and leads the Lenses page; on Sinhagad the
  shops behind the person blur (mid layer 5.0) and the readout says 20
  degrees with the angle fan; switching to Shaniwar glides to 74 degrees
  with no blur. Checked at 1440 and 390, no errors.
- 4 notes: new files src/site/lab-math.js (depth of field, f-stops, iris,
  discs) and src/site/lab-svg.js (beat markup); fov.js scene() now lists
  its points of light (L.lights) for the bokeh.
- 4 done: each lens page after the hero runs four beats: 01 focus pull
  (drag the unrolled ring or tap Scooter / Person / Fort; the street's
  layers blur by the thin-lens circle of confusion; metres and feet),
  02 aperture and bokeh (slider T2.1 to T16 closes the drawn iris and, when
  the 3D viewer is live, the model's iris face on; shop lights become
  discs that shrink and turn eleven-sided), 03 what it sees (the street
  viewer, scroll sweeps the focal length then settles on the lens; the
  angle and one line on when to use it), 04 specs (sample figures) and
  Enquire, then previous / next. Each page in its lens's colour (glow,
  track, handles, buttons, focus). Lenses page: hover or tap a lens tints
  the page, shows its bokeh swatch, "Open this lens"; compare strip, one
  slider for three irises. Beats engine (src/site/beats.js): pin for one
  screen, scroll drives the control, "Your turn" and one pulse, one nudge
  after 4 s, soft snap only when scrolling down, flow when the pin would
  not fit, "n of m tried" pill. Files: lab-math.js, lab-svg.js, lab.js,
  ctl.js, beats.js, styles/lab.css. Audit 64 of 64; smoke passed; 3D iris
  checked in software WebGL; reduced motion and no-JS checked.
- Known: the Lenses page's full street viewer and the lens pages' "what it
  sees" at 1024x768, tablets and phones are taller than one screen, so
  they play in the flow (scroll still drives them, cue and nudge still).
- 5 done (checked, no code change beyond step 2's bench tray): Craft opens
  on the bench drawing with the five-stage build-up (steps and slider) and
  close-ups; Company opens on the bench with four hotspots (loupe, iris
  tool, signing pen, finished-lens tray, now three different sizes), the
  2017-2025 timeline scrub, the PUNE / 2017 / THREE strip, the six checks
  and the FAQ; every invented part says "Sample content for this
  concept"; layouts differ section to section. Audit 64 of 64.
- 6 done: every interactive piece on Lenses, the lens pages, Craft,
  Company and Contact is a beat. Craft's build-up and Company's bench open
  their pages and pin at the top (scroll builds the lens stage by stage;
  opens the bench notes one by one); the timeline and the six checks pin
  under the masthead (scroll moves the year index; fills each check tile
  and ticks it, then "Run it again" reruns all six). Contact gains "Which
  lens is it about?": scroll walks the three lenses into an email preview
  (subject and first line), tap to choose, "Write this email" (mailto).
  "Your turn" pills on every instruction line, glow on every handle, one
  pulse and one nudge, "n of m tried" on every page. Checked: soft snap
  when scrolling down only, nudge once after 4 s, a tap takes over and
  scroll leaves the visitor's value alone. Pieces taller than the screen
  (e.g. checks at 1280x800, most pieces on phones) play in the flow.
  Audit 64 of 64 (Contact fixed and re-audited); smoke passed.
- 7 done: audit 64 of 64 (eight pages at 390, 768, 900, 1024, 1280, 1440,
  1728 and a 900 px framed pane: no horizontal scroll, nothing clipped);
  contact sheets per page refreshed in kessel/screenshots/widths/. Every
  slider, chip, hotspot and button at least 40 px on a phone (sliders 56,
  ring 70 to 84). Reduced motion: nothing pins, drives, snaps or nudges;
  controls wait at their middle value with the cue (fixed: the compare
  strip drew T2.1 with its slider at the middle). No JS: every page reads
  with captioned stills and each experience's first frame. Smoke passed.
- Not done: no real GPU here, so the live 3D (film, viewers, the face-on
  iris) was seen only in software WebGL (?gl=force); the Lenses page's full
  street viewer, and several pieces on phones and short screens, are taller
  than one screen and play in the flow instead of pinning.
