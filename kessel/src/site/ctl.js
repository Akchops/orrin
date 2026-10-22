// One touchable control: a value from 0 to 1 on an element with
// role="slider" (the markup from src/site/lab-svg.js). Two kinds:
//   slider  the handle goes where you point; tap the track to jump
//   ring    the focus ring: drag it sideways and the scale moves with your
//           finger (px: how many pixels make the whole throw)
// Touch never traps the page: the element has touch-action: pan-y, so a
// vertical swipe scrolls as usual and only a sideways drag moves the value.
// Keys: arrows, Page Up / Down, Home, End.
//
//   const c = control(el, { kind: 'slider', value: 0, onInput(v, user) {} });
//   c.set(v)      moves it without counting as the visitor's touch
//   c.value       the current value
// onInput gets user = true when the visitor moved it; onTouch(), once, the
// first time they do.
export function control(el, { kind = 'slider', value = 0, step = 0.02, px, onInput, onTouch }) {
  let v = value, touched = false, drag = null;
  const clamp = (x) => Math.min(1, Math.max(0, x));
  const user = () => { if (!touched) { touched = true; if (onTouch) onTouch(); } };
  const put = (x, isUser) => {
    x = clamp(x);
    if (isUser) user();
    if (x === v && !isUser) return;
    v = x;
    if (onInput) onInput(v, !!isUser);
  };
  const track = el.querySelector('.slider__track') || el;
  const at = (clientX) => { const r = track.getBoundingClientRect(); return (clientX - r.left) / Math.max(1, r.width); };

  el.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, v0: v, on: e.pointerType === 'mouse', type: e.pointerType };
    if (drag.on) {
      try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      if (kind === 'slider' && !e.target.closest('.ctl__handle')) put(at(e.clientX), true);
      drag.v0 = v;
      el.classList.add('is-dragging');
      e.preventDefault();
    }
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.on) {
      // Touch: a sideways drag takes the control; anything else is the
      // page scrolling (the browser cancels the pointer for that).
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return;
      drag.on = true;
      try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      el.classList.add('is-dragging');
    }
    if (kind === 'ring') put(drag.v0 - dx / (px ? px() : 400), true);
    else put(at(e.clientX), true);
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    // A tap on a touch screen: the slider jumps there.
    if (!drag.on && e.type === 'pointerup' && kind === 'slider') put(at(e.clientX), true);
    drag = null;
    el.classList.remove('is-dragging');
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('keydown', (e) => {
    const big = 0.1, keys = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: big, PageDown: -big };
    if (e.key in keys) put(v + keys[e.key], true);
    else if (e.key === 'Home') put(0, true);
    else if (e.key === 'End') put(1, true);
    else return;
    e.preventDefault();
  });
  return {
    set(x) { put(x, false); },
    get value() { return v; },
    get touched() { return touched; },
    touch: user,
  };
}

// Eased moves for buttons and demos: animate(from, to, ms, fn) -> cancel.
export function animate(from, to, ms, fn) {
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const t0 = performance.now();
  let raf = 0;
  const step = (now) => {
    const t = ms ? Math.min(1, (now - t0) / ms) : 1;
    fn(from + (to - from) * ease(t));
    if (t < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}
