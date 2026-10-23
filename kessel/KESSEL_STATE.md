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
| 6 | Inspect the lens: pinned close-up beat (built to Part 9's spec, which wins) | in progress |
| 7 | Company: bench, timeline, checks each pin and stop at every milestone | next |
| 8 | One shared lens stage; Contact rebuilt; white dot and glare fixed at source; guard test in the build | next |
| 9 | Home tab in the nav; automatic close-ups on every lens page | next |

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
