// Inspect the lens, live (markup from src/site/inspect-html.js). A beat
// (src/site/beats.js) with six stops: the whole lens, then 01 Glass, 02
// Iris, 03 Scale, 04 Mount and 05 Signed. Scroll moves the camera, q 0 to
// 5: the live viewer glides to each pose (el.__inspect), or the stills
// cross-fade; the map's camera and the caption follow, beside the stage,
// never over it. At the last stop "Your turn": the list and the map's
// numbers jump to a detail, and the live lens can be dragged to look round
// it. With reduced motion nothing moves by itself: the list is the way
// round, one tap a view.
import { addBeat } from './beats.js';
import { mapOf } from '../app/inspect.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const put = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };

function enhance(root) {
  const k = +root.dataset.model || 0, M = mapOf(k), N = 6;
  const stage = root.querySelector('.insp__stage');
  const shots = [...root.querySelectorAll('.insp__shot')];
  const btns = [...root.querySelectorAll('.insp__btn')];
  const spots = [...root.querySelectorAll('.insp__spot')];
  const cam = root.querySelector('.insp__cam'), cone = root.querySelector('.insp__cone'), aim = root.querySelector('.insp__aim');
  const sayNo = root.querySelector('.insp__say .insp__no'), sayName = root.querySelector('.insp__say .insp__name'), sayT = root.querySelector('.insp__t');
  const copy = [{ no: sayNo.textContent, name: sayName.textContent, text: sayT.textContent },
    ...shots.map((s) => ({ no: s.querySelector('.insp__no').textContent, name: s.querySelector('.insp__name').textContent, text: s.querySelector('.insp__shot-t').textContent }))];
  let q = -1, shown = -1, tw = 0, beat = null;

  function render(x) {
    if (x === q) return;
    q = x;
    if (stage.__inspect) stage.__inspect(q);
    // The stills: each detail fades in over the one before as q reaches it.
    shots.forEach((s, i) => { s.style.opacity = Math.max(0, Math.min(1, 1 - (i + 1 - q) * 1.8)).toFixed(3); });
    const c = M.cam(q);
    cam.setAttribute('transform', `translate(${c.x} ${c.y}) rotate(${c.deg})`);
    cone.setAttribute('d', c.cone);
    aim.setAttribute('cx', c.tx); aim.setAttribute('cy', c.ty);
    const n = Math.round(q);
    if (n !== shown) {
      shown = n;
      root.dataset.stop = String(n);
      put(sayNo, copy[n].no); put(sayName, copy[n].name); put(sayT, copy[n].text);
      btns.forEach((b, i) => { if (i === n) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
      spots.forEach((s, i) => s.classList.toggle('is-on', i + 1 === n));
    }
  }
  function tween(to) {
    cancelAnimationFrame(tw);
    const from = q, dur = reduce.matches ? 0 : 500 + 260 * Math.abs(to - from);
    if (!dur) { render(to); return; }
    const t0 = performance.now();
    const step = (now) => { const f = Math.min(1, (now - t0) / dur); render(from + (to - from) * ease(f)); if (f < 1) tw = requestAnimationFrame(step); };
    tw = requestAnimationFrame(step);
  }
  const go = (i) => { if (beat) beat.mine(); tween(i); };
  btns.forEach((b, i) => b.addEventListener('click', () => go(i)));
  spots.forEach((s, i) => s.addEventListener('click', () => go(i + 1)));
  // Dragging the live lens is the visitor's; a press alone is not. On a
  // phone a swipe that starts on the lens scrolls the page (touch-action:
  // pan-y) and must leave scroll in charge of the camera.
  let press = null;
  stage.addEventListener('pointerdown', (e) => { if (e.target.tagName === 'CANVAS') press = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
  stage.addEventListener('pointermove', (e) => {
    if (!press || e.pointerId !== press.id) return;
    const dx = e.clientX - press.x, dy = e.clientY - press.y;
    const sideways = Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy);
    if (sideways || (e.pointerType === 'mouse' && Math.hypot(dx, dy) > 6)) { press = null; if (beat) beat.mine(); }
  });
  const lift = (e) => { if (press && e.pointerId === press.id) press = null; };
  stage.addEventListener('pointerup', lift);
  stage.addEventListener('pointercancel', lift);
  // The live viewer comes up after the page: give it the camera's place.
  addEventListener('kessel:viewer', () => { if (stage.__inspect) stage.__inspect(q); });

  // The caption keeps the height of its longest stop, so the pin never
  // grows as it changes.
  const say = root.querySelector('.insp__say');
  function reserve() {
    say.style.minHeight = '';
    const keep = [sayNo.textContent, sayName.textContent, sayT.textContent];
    let h = 0;
    for (const c of copy) { sayNo.textContent = c.no; sayName.textContent = c.name; sayT.textContent = c.text; h = Math.max(h, say.offsetHeight); }
    [sayNo.textContent, sayName.textContent, sayT.textContent] = keep;
    say.style.minHeight = `${h}px`;
  }
  reserve();
  addEventListener('resize', reserve);
  if (document.fonts) document.fonts.ready.then(reserve);

  root.classList.add('is-live');
  render(0);
  // Six stops, about two thirds of a screen each; with reduced motion it
  // waits at the whole lens with its list.
  beat = addBeat(root, { drive: (t, still) => render(still ? 0 : t * (N - 1)), stops: N, hold: 0.7 * N });
}

export function startInspect() {
  document.querySelectorAll('.insp').forEach(enhance);
}
