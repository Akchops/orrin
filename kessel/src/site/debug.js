// The debug readout, for screenshots from a phone. Shown when the address
// has ?debug=1 or #debug (#lens-parvati&debug works too), or after five
// quick taps on the tier badge (a page opened inside a frame, whose address
// cannot be changed); hidden otherwise. A small fixed panel at the bottom
// left: the tier badge and its reason, reduced motion on or off, the scroll
// position, the teardown's active stop on the home page (0 to 9; -1 above
// it, 10 below it) and the viewport height (100svh and 100dvh in pixels,
// and innerHeight).
export function startDebug() {
  let on = /[?&]debug(=1)?(&|$)/.test(location.search) || /(^#|&)debug(=1)?$/.test(location.hash);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let panel = null, svh = null, dvh = null, timer = 0;

  const probe = (unit) => {
    const p = document.createElement('div');
    p.style.cssText = `position:fixed;top:0;left:0;width:0;height:100${unit};visibility:hidden;pointer-events:none`;
    document.body.appendChild(p);
    return p;
  };
  function paint() {
    if (!panel) return;
    const badge = document.getElementById('tier');
    const kind = badge ? (badge.querySelector('.tier__kind') || {}).textContent : '?';
    const why = badge ? ((badge.querySelector('.tier__why') || {}).textContent || '').trim() : '';
    const route = document.documentElement.dataset.route;
    const td = document.getElementById('teardown');
    const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const rows = [
      ['tier', `${kind}${why ? ` (${why})` : ''}`],
      ['reduced motion', reduce.matches ? 'on' : 'off'],
      ['scroll', `${Math.round(scrollY)} / ${Math.round(max)} px`],
      ['teardown stop', route === 'home' && td ? `${td.dataset.stop} of 0-9${td.dataset.show ? ` (showing ${td.dataset.show}, tapped)` : ''}` : 'none on this page'],
      ['viewport', `100svh ${svh.offsetHeight || 'n/a'} px, 100dvh ${dvh.offsetHeight || 'n/a'} px, innerHeight ${innerHeight} px`],
      ['route', route],
    ];
    panel.textContent = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  }
  function show(yes) {
    on = yes;
    if (on && !panel) {
      svh = probe('svh'); dvh = probe('dvh');
      panel = document.createElement('pre');
      panel.className = 'dbg';
      panel.setAttribute('aria-hidden', 'true');
      panel.style.cssText = 'position:fixed;z-index:9999;left:0.75rem;bottom:calc(4.5rem + env(safe-area-inset-bottom, 0px));margin:0;'
        + 'max-width:calc(100vw - 1.5rem);padding:0.5rem 0.65rem;border-radius:6px;background:rgba(8,9,11,0.86);color:#e8e6e1;'
        + 'font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap;pointer-events:none;border:1px solid rgba(255,255,255,0.18)';
      document.body.appendChild(panel);
      timer = setInterval(paint, 250);
      addEventListener('scroll', paint, { passive: true });
      addEventListener('resize', paint);
    } else if (!on && panel) {
      clearInterval(timer);
      removeEventListener('scroll', paint); removeEventListener('resize', paint);
      panel.remove(); svh.remove(); dvh.remove(); panel = svh = dvh = null;
    }
    paint();
  }
  // Five taps on the badge within three seconds toggle it.
  const badge = document.getElementById('tier');
  if (badge) {
    let taps = [];
    badge.addEventListener('click', () => {
      const now = performance.now();
      taps = taps.filter((t) => now - t < 3000).concat(now);
      if (taps.length >= 5) { taps = []; show(!on); }
    });
  }
  if (on) show(true);
}
