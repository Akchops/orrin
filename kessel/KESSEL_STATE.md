# Kessel: work state

Live preview (same link every step): https://claude.ai/artifact/Qw1M9HVgSkMimpHQmnsgKX
Branch: claude/focused-allen-cn8r5h. Build: `node kessel/scripts/build.mjs`.
Checks: `kessel/scripts/audit.mjs` (overflow at seven widths and a framed
pane), the smoke test in the session scratchpad (film, teardown, badge,
reduced motion, no-JS). Last passing commit before this follow-up: c40841b.

## Follow-up "frame, three lenses, lens experiences, beats"

| Step | What | State |
|---|---|---|
| 1 | Frame the whole lens; fix overflow; screenshot every page at every width | done |
| 2 | Three different lenses again (restore silhouettes, hood, collar); lineup at one scale | done |
| 3 | Street viewer as centrepiece (already built in the last follow-up: verify) | done |
| 4 | Lens pages as pinned, scroll-led experiences (focus pull, aperture and bokeh, what it sees, specs and enquire); Lenses hover tint, bokeh preview, compare strip | done |
| 5 | Craft and Company illustrated centrepieces (already built: verify, vary layouts) | in progress |
| 6 | Scroll stops at every interactive milestone; handles, cues, nudges, progress; the checks run under scroll | next |
| 7 | Final QA at every width, reduced motion, no-JS | next |

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
