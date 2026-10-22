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
| 3 | Street viewer as centrepiece (already built in the last follow-up: verify) | in progress |
| 4 | Lens pages as pinned, scroll-led experiences (focus pull, aperture and bokeh, what it sees, specs and enquire); Lenses hover tint, bokeh preview, compare strip | next |
| 5 | Craft and Company illustrated centrepieces (already built: verify, vary layouts) | next |
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
