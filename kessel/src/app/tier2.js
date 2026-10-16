// Tier 2: Canvas 2D. Same story state, same camera maths as the WebGL tier,
// drawn as flat-shaded rings, discs and blades. It traces the same move:
// the iris opens blade by blade, the camera dives through a tunnel of
// barrel rings and glass, turns at the back, and the focus scale rolls.
import { IRIS_Z, SPREAD } from './lens.js';
import { DISTANCES, throwPos } from './textures.js';

const TAU = Math.PI * 2, DEG = Math.PI / 180;
const SECTION_MID = [-5, -24, -50, -72, -92];
// Barrel rings per section: [z, outer r, inner r, shade].
const RINGS = [
  [0, [[0, 38.7, 35.3, 1.25], [-1.3, 40, 34.8, 0.9], [-5, 40, 34.6, 0.8], [-9.5, 40, 34.4, 0.7]]],
  [1, [[-10.4, 41, 38.8, 1.1], [-14, 41.4, 38.8, 0.95], [-18, 41.4, 38.8, 0.85], [-22, 41.4, 38.8, 0.95], [-25.5, 41, 38.8, 1.1], [-30, 40.4, 38.6, 0.8], [-36, 40.4, 38.6, 0.75]]],
  [2, [[-38.2, 40.2, 37, 1.0], [-42, 39.6, 37, 0.8], [-47, 40.1, 37, 0.9], [-52, 40.1, 37, 0.8], [-56.5, 40.1, 37, 0.9]]],
  [3, [[-58, 38.2, 33.6, 1.1], [-64, 38.6, 33.6, 0.8], [-71, 38.6, 33.6, 0.75], [-78, 38.6, 33.6, 0.8], [-83, 36, 33.6, 0.75]]],
  [4, [[-86, 34.2, 28.6, 1.4], [-92, 34, 28.6, 1.3], [-97.6, 33.6, 28.6, 1.2]]],
];
const ELEMENTS = [[-2, 33, 0], [-14, 30, 1], [-26, 27, 1], [-55, 21, 2], [-66, 23, 3], [-75, 25, 3], [-88, 24, 4]];
const COATS = ['#8f7dff', '#5fd6b8', '#c08bff', '#79b8ff', '#f0a64a', '#6fe0a0', '#a593ff'];

export function mount2D(container, { font }) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  let W = 1, H = 1, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  function resize() {
    W = Math.max(1, container.clientWidth); H = Math.max(1, container.clientHeight);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  resize();

  // Blade outline in blade space, identical to the WebGL tier.
  const blade = [];
  { const rIn = 21.5, rOut = 38, sw = (80 / 180) * Math.PI, px = 30;
    for (let i = 0; i <= 16; i++) { const a = (i / 16) * sw; blade.push([Math.cos(a) * rIn - px, Math.sin(a) * rIn]); }
    for (let i = 16; i >= 0; i--) { const a = (i / 16) * sw; blade.push([Math.cos(a) * rOut - px, Math.sin(a) * rOut]); } }

  const cam = { pos: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0], f: [0, 0, -1], tan: 0.2, sx: 0, sy: 0, tgt: [0, 0, 0] };
  let xf = (p) => p;
  function setCamera(S) {
    const tan = Math.tan((S.fov * DEG) / 2), fit = Math.min(tan, tan * (W / H));
    const dist = S.frame / fit;
    const op = [S.tx + dist * Math.sin(S.az * DEG) * Math.cos(S.el * DEG), S.ty + dist * Math.sin(S.el * DEG), S.tz + dist * Math.cos(S.az * DEG) * Math.cos(S.el * DEG)];
    const ot = [S.tx, S.ty, S.tz];
    const ap = [0, 0, S.cz], at = [Math.sin(S.yaw * DEG) * -60, 0, S.cz - Math.cos(S.yaw * DEG) * 60];
    const k = S.inside;
    const pos = op.map((v, i) => v + (ap[i] - v) * k), tgt = ot.map((v, i) => v + (at[i] - v) * k);
    const f = norm(sub(tgt, pos));
    const up = [Math.sin(S.roll * DEG), Math.cos(S.roll * DEG), 0];
    const r = norm(cross(f, up)), u = cross(r, f);
    Object.assign(cam, { pos, f, r, u, tan, sx: S.sx, sy: S.sy, tgt });
  }
  function proj(p) {
    const d = sub(p, cam.pos), z = dot(d, cam.f);
    if (z < 2) return null;
    const k = (H / 2) / (z * cam.tan);
    return [W / 2 + dot(d, cam.r) * k + cam.sx * W, H / 2 - dot(d, cam.u) * k - cam.sy * H, z, k];
  }

  const items = [];
  function circlePts(r, z, n = 56) { const o = []; for (let i = 0; i < n; i++) { const a = (i / n) * TAU; o.push([Math.cos(a) * r, Math.sin(a) * r, z]); } return o; }
  function push(pts3, draw, bias = 0) {
    const scr = [];
    for (const p of pts3) { const s = proj(xf(p)); if (!s) return; scr.push(s); }
    items.push({ depth: scr.reduce((a, s) => a + s[2], 0) / scr.length + bias, scr, draw });
  }
  const path = (scr, close = true) => { ctx.beginPath(); scr.forEach((s, i) => (i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]))); if (close) ctx.closePath(); };

  const anchorsLocal = { front: [0, 0, 0], ringEdge: [43, 0, 0], focusRing: [41.5, 0, -18], signature: [39, 0, -68], iris: [0, 0, IRIS_Z] };
  let lastS = null;

  function render(S, tSec, pointer) {
    lastS = S;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    setCamera(S);
    items.length = 0;
    const i0 = Math.min(1, Math.floor(S.model)), mf = S.model - i0;
    const lz = [0.82, 1, 1.22][i0] + ([0.82, 1, 1.22][i0 + 1] - [0.82, 1, 1.22][i0]) * mf;
    const fr = [1.08, 1, 0.94][i0] + ([1.08, 1, 0.94][i0 + 1] - [1.08, 1, 0.94][i0]) * mf;
    const tiltX = pointer.y * 0.12 * (1 - S.inside), tiltY = (pointer.x * 0.18 + pointer.spin) * (1 - S.inside);
    xf = (p) => rotXY(rotXY([p[0] * fr, p[1] * fr, p[2] * lz], S.rx, S.ry), tiltX, tiltY);
    const off = (g) => SECTION_MID[g] * SPREAD * S.spread;

    // Light far behind the lens.
    const lc = proj(xf([0, 0, -700]));
    if (lc && S.light > 0) {
      const rad = 80 * lc[3];
      items.push({ depth: 1e9, scr: [lc], draw: () => {
        const g = ctx.createRadialGradient(lc[0], lc[1], 0, lc[0], lc[1], rad);
        g.addColorStop(0, `rgba(255,246,232,${0.95 * S.light})`); g.addColorStop(0.6, `rgba(255,236,214,${0.55 * S.light})`); g.addColorStop(1, 'rgba(255,236,214,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lc[0], lc[1], rad, 0, TAU); ctx.fill();
      } });
    }

    // Barrel rings, stacked: from outside they read as a turned barrel, from
    // inside as a tunnel rushing past.
    for (const [g, rings] of RINGS) {
      for (const [z, ro, ri, sh] of rings) {
        const zz = z + off(g);
        const outer = circlePts(ro, zz), inner = circlePts(ri, zz).reverse();
        const metal = g === 4;
        push(outer.concat(inner), (it) => {
          path(it.scr);
          let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
          for (const s of it.scr) { x0 = Math.min(x0, s[0]); x1 = Math.max(x1, s[0]); y0 = Math.min(y0, s[1]); y1 = Math.max(y1, s[1]); }
          const gr = ctx.createLinearGradient(x0, y0, x1, y1);
          const base = metal ? [196, 200, 205] : [34, 36, 42];
          const c = (k) => `rgb(${base.map((v) => Math.min(255, Math.round(v * k * sh))).join(',')})`;
          gr.addColorStop(0, c(0.6)); gr.addColorStop(0.45, c(metal ? 1.15 : 1.9)); gr.addColorStop(0.62, c(0.9)); gr.addColorStop(1, c(0.5));
          ctx.fillStyle = gr; ctx.fill('evenodd');
          ctx.strokeStyle = metal ? 'rgba(255,255,255,0.25)' : 'rgba(210,214,220,0.12)'; ctx.lineWidth = 1; ctx.stroke();
        });
      }
    }

    // Glass: faint discs edged with the coating colours.
    ELEMENTS.forEach(([z, r, g], i) => {
      push(circlePts(r, z + off(g)), (it) => {
        path(it.scr);
        ctx.fillStyle = 'rgba(14,18,26,0.16)'; ctx.fill();
        ctx.strokeStyle = COATS[i]; ctx.globalAlpha = 0.55; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1;
        // A soft reflection arc, offset by the pointer, standing in for the
        // coating's reflection of the room.
        let cx = 0, cy = 0; it.scr.forEach((s) => { cx += s[0]; cy += s[1]; }); cx /= it.scr.length; cy /= it.scr.length;
        const rad = Math.hypot(it.scr[0][0] - cx, it.scr[0][1] - cy);
        const gr = ctx.createRadialGradient(cx - rad * (0.3 + pointer.x * 0.2), cy - rad * (0.35 + pointer.y * 0.2), 0, cx, cy, rad);
        gr.addColorStop(0, COATS[i] + '55'); gr.addColorStop(1, COATS[i] + '00');
        ctx.fillStyle = gr; path(it.scr); ctx.fill();
      }, -0.5);
    });

    // Iris blades, opening one at a time.
    const izz = IRIS_Z + off(2);
    for (let b = 0; b < 11; b++) {
      const phi = (b / 11) * TAU;
      const st = (b / 11) * 0.55, e = smooth(st, st + 0.45, S.iris);
      const th = 0.7 * (1 - e);
      const pts = blade.map(([x, y]) => {
        const xr = x * Math.cos(th) - y * Math.sin(th), yr = x * Math.sin(th) + y * Math.cos(th);
        const X = xr + 30, Y = yr;
        return [X * Math.cos(phi) - Y * Math.sin(phi), X * Math.sin(phi) + Y * Math.cos(phi), izz + b * 0.03];
      });
      push(pts, (it) => { path(it.scr); ctx.fillStyle = '#17181c'; ctx.fill(); ctx.strokeStyle = 'rgba(160,166,176,0.35)'; ctx.lineWidth = 1; ctx.stroke(); }, -1);
    }
    // Cover ring in front of the blades, as on the WebGL tier.
    push(circlePts(37.2, izz + 0.9).concat(circlePts(21.8, izz + 0.9).reverse()), (it) => { path(it.scr); ctx.fillStyle = '#0c0d10'; ctx.fill('evenodd'); }, -1.5);
    // Bloom at the aperture when looking into the front.
    const ic = proj(xf([0, 0, izz]));
    if (ic) {
      const facing = Math.max(0, dot(norm(sub(cam.pos, xf([0, 0, izz]))), [0, 0, 1]));
      const open = 0.015 + 0.985 * S.iris * S.iris;
      const a = Math.min(0.6, open * 0.7) * Math.pow(facing, 3) * S.light * Math.min(1, Math.max(0, (ic[2] - 20) / 120));
      if (a > 0.01) items.push({ depth: -1e9, scr: [ic], draw: () => {
        const rad = (40 + open * 70) * ic[3] * 0.6;
        const g = ctx.createRadialGradient(ic[0], ic[1], 0, ic[0], ic[1], rad);
        g.addColorStop(0, `rgba(255,244,228,${a})`); g.addColorStop(0.35, `rgba(255,236,214,${a * 0.45})`); g.addColorStop(1, 'rgba(255,236,214,0)');
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ic[0], ic[1], rad, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      } });
    }

    // Distance scale on the focus ring, and the fixed index mark.
    const rot = S.focus * 160 * DEG, fz = -31.5 + off(1);
    DISTANCES.forEach((d) => {
      const phi = (90 - throwPos(d.m) * 160) * DEG + rot;
      const p = [40.6 * Math.sin(phi), -40.6 * Math.cos(phi), fz];
      const n = [Math.sin(phi), -Math.cos(phi), 0];
      const wp = xf(p), wn = norm(sub(xf([p[0] + n[0], p[1] + n[1], p[2]]), wp));
      if (dot(wn, norm(sub(cam.pos, wp))) < 0.25) return;
      push([p], (it) => {
        const s = it.scr[0];
        ctx.fillStyle = '#f1efe9'; ctx.font = `500 ${Math.max(9, 3.2 * s[3])}px ${font}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(d.label, s[0], s[1]);
      }, -3);
    });
    push([[40.2, 0, -40.6 + off(2)]], (it) => { const s = it.scr[0]; ctx.fillStyle = '#f1efe9'; ctx.fillRect(s[0] - 1, s[1] - 2.3 * s[3], 2, 4.6 * s[3]); }, -3);
    // Maker's mark on the rear barrel.
    {
      const p = [38.8, 0, -66 + off(3)], wp = xf(p), wn = norm(sub(xf([p[0] + 1, 0, p[2]]), wp));
      if (dot(wn, norm(sub(cam.pos, wp))) > 0.3) push([p], (it) => {
        const s = it.scr[0]; ctx.fillStyle = '#f1efe9'; ctx.font = `600 ${Math.max(9, 3 * s[3])}px ${font}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('KESSEL', s[0], s[1]);
      }, -3);
    }

    // Sensor and its image circle, for the exit.
    if (S.sensor > 0.01) {
      const zs = -98 - 46.5 + off(4), w = 18 * S.sensor, h = 12 * S.sensor;
      push([[-w, -h, zs], [w, -h, zs], [w, h, zs], [-w, h, zs]], (it) => {
        path(it.scr); ctx.fillStyle = '#16131f'; ctx.fill();
        let cx = 0, cy = 0; it.scr.forEach((q) => { cx += q[0]; cy += q[1]; }); cx /= 4; cy /= 4;
        const rad = Math.hypot(it.scr[0][0] - cx, it.scr[0][1] - cy);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, 'rgba(255,238,214,0.95)'); g.addColorStop(0.5, 'rgba(214,190,255,0.45)'); g.addColorStop(1, 'rgba(40,30,80,0)');
        ctx.save(); path(it.scr); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); ctx.restore();
      }, 0);
    }

    items.sort((a, b) => b.depth - a.depth);
    for (const it of items) it.draw(it);
  }

  function project(name) {
    const a = anchorsLocal[name];
    if (!a && name !== '__target') return null;
    const s = name === '__target' ? proj(cam.tgt) : proj(xf(a));
    return s ? { x: s[0], y: s[1], visible: true } : null;
  }

  return {
    canvas, kind: '2d', render, resize, project,
    setDPR: (d) => { dpr = Math.min(d, 1.5); resize(); return dpr; }, getDPR: () => dpr,
    destroy: () => canvas.remove(),
  };
}

function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function rotXY(p, rx, ry) {
  let [x, y, z] = p;
  let c = Math.cos(ry), s = Math.sin(ry); [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(rx); s = Math.sin(rx); [y, z] = [y * c - z * s, y * s + z * c];
  return [x, y, z];
}
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
