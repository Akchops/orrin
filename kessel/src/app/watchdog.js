// The adaptive-quality watchdog for the 3D tier, on its own so its rule can
// be tested with simulated frame timings.
//
// It judges drawn frames against the display's own cadence, not a fixed
// budget. Safari runs animation frames at 30 fps in Low Power Mode and in
// embedded pages, and a 30 fps clock is not a slow GPU: the old watchdog
// counted every frame over 22 ms as slow and walked an iPhone down to 2D.
// The cadence is learnt from ticks that drew nothing (they show the display
// clock alone); a drawn frame is missed when the next tick comes more than
// 1.6 cadences later. Many misses step the 3D quality down a rung
// (resolution first, then the per-pixel extras); 2D only when the lowest
// rung still runs under 15 fps.
export function createWatchdog({ stepDown, degrade, report, now0 = 0 }) {
  const wd = { idle: [], cadence: 1000 / 60, n: 0, miss: 0, ivs: [], t0: 0, cool: now0 + 2000, judged: 0, missed: 0, steps: [] };
  // now: tick time (ms); iv: time since the previous tick; drew: whether the
  // previous tick drew a frame.
  function tick(now, iv, drew) {
    // A gap over a second is a hidden tab or a stall, not a frame.
    if (iv > 1000) return;
    if (!drew) {
      wd.idle.push(iv);
      if (wd.idle.length > 40) wd.idle.shift();
      if (wd.idle.length >= 8) {
        const a = wd.idle.slice().sort((x, y) => x - y);
        wd.cadence = Math.min(50, Math.max(6, a[a.length >> 1]));
      }
      return;
    }
    // Judge nothing until the display's cadence is known: a scroll that
    // starts at load on a 30 fps clock would otherwise read as misses.
    if (now < wd.cool || wd.idle.length < 8) return;
    if (!wd.n) wd.t0 = now;
    wd.n++; wd.judged++;
    if (iv > wd.cadence * 1.6) { wd.miss++; wd.missed++; }
    wd.ivs.push(iv);
    // Judge every 60 drawn frames, or every 3 s on a device that draws few.
    if (wd.n < 60 && !(wd.n >= 12 && now - wd.t0 > 3000)) return;
    const missRate = wd.miss / wd.n;
    const med = wd.ivs.sort((x, y) => x - y)[wd.ivs.length >> 1];
    wd.n = 0; wd.miss = 0; wd.ivs = [];
    if (missRate < 0.4) return;
    const q = stepDown();
    const cannot = med > Math.max(66, wd.cadence * 2.5);
    wd.steps.push(q ? 'rung ' + q.rung : cannot ? '2d' : 'hold');
    if (q) {
      wd.cool = now + 1500;      // let recompiles and the new size settle
      report(`running at reduced quality to stay smooth here (${q.dpr.toFixed(2).replace(/0$/, '')}× resolution${q.fx ? '' : ', simpler materials'})`);
    } else if (cannot) {
      degrade('3D could not hold 15 frames a second here, even at its lowest quality');
    } else wd.cool = now + 4000;
  }
  const stats = () => ({ cadence: +wd.cadence.toFixed(1), judged: wd.judged, missed: wd.missed, steps: wd.steps.slice() });
  return { tick, stats };
}
