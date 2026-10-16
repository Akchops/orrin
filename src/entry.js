// Bootstrap. This is the only script on the critical path: it fills in the
// live Mumbai time, decides whether the cinematic layer may run, probes WebGL
// silently and lazy-loads everything else. If anything fails, the page stays
// in its stills layout, which already carries all of the content.
import { probeWebGL } from './probe.js';

const root = document.documentElement;
const params = new URLSearchParams(location.search);
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

// --- Mumbai time (no motion, so it runs for everyone with JS) -------------
const fmt = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
function paintTime() {
  const t = fmt.format(new Date()).replace(/\s?(am|pm)$/i, (m) => ' ' + m.trim().toLowerCase());
  document.querySelectorAll('[data-time]').forEach((el) => {
    el.querySelector('[data-time-text]').textContent = t;
    el.hidden = false;
  });
}
paintTime();
setInterval(paintTime, 20000);

// --- Copy email ------------------------------------------------------------
const copyBtn = document.getElementById('copy-email');
if (copyBtn) {
  copyBtn.hidden = false;
  copyBtn.addEventListener('click', async () => {
    const text = copyBtn.dataset.copy;
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = 'Copied';
    } catch {
      // Clipboard refused (some embedded views): select the address instead.
      const a = copyBtn.parentElement.querySelector('[data-copy-target]');
      const r = document.createRange();
      r.selectNodeContents(a);
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      copyBtn.textContent = 'Selected';
    }
    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1800);
  });
}

// --- Live layer ------------------------------------------------------------
async function start() {
  if (params.has('static') || reduce.matches) return;      // stills are the designed state
  const forceGL = params.get('gl') === 'force';
  let caps = params.get('tier') === '2' ? null : probeWebGL({ allowSoftware: forceGL });
  if (caps && caps.tier === 'low') caps = null;              // tier 2 beats a struggling GPU
  if (caps && forceGL) caps.qa = true;
  try {
    const { boot } = await import('./experience.js');
    await boot({ caps, params });
  } catch (err) {
    // Leave the stills layout in place. Surface the error only when asked.
    root.classList.remove('live', 'scene-ready');
    if (params.has('debug')) console.error(err);
  }
}

// Start once the hero has painted, so the still is the first thing seen.
if (document.readyState === 'complete') start();
else addEventListener('load', start, { once: true });

// The setting can change while the page is open; the safest response that
// keeps every fact on screen is a reload into the matching layout.
reduce.addEventListener?.('change', () => location.reload());
