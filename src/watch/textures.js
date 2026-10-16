// Procedural textures, generated at boot. Nothing here is downloaded.
import {
  CanvasTexture, DataTexture, RGBAFormat, UnsignedByteType, LinearFilter,
  LinearMipmapLinearFilter, RepeatWrapping, SRGBColorSpace, NoColorSpace,
} from 'three';

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Integer hash -> [0,1). Cheap and stateless, so textures are identical on
// every boot and in the stills.
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function dataTex(data, size, { repeat = false, color = false } = {}) {
  const t = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  t.colorSpace = color ? SRGBColorSpace : NoColorSpace;
  t.wrapS = t.wrapT = repeat ? RepeatWrapping : t.wrapS;
  t.magFilter = LinearFilter;
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

// Anisotropy direction field for a sunburst dial. Each texel stores the
// circumferential direction around the dial centre (RG in tangent space, as
// three.js expects), so the stretched highlight runs across the radial
// brushing and forms the "propeller" a real sunburst dial throws. Rotating
// the material's anisotropyRotation by 90deg turns it into a concentric
// (azurage) field for the sub-dial.
export function sunburstMap(size = 512) {
  const d = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i + 0.5) / size - 0.5;
      const y = (j + 0.5) / size - 0.5;
      const r = Math.hypot(x, y) || 1e-6;
      const k = (j * size + i) * 4;
      d[k] = Math.round((-y / r * 0.5 + 0.5) * 255);
      d[k + 1] = Math.round((x / r * 0.5 + 0.5) * 255);
      // Strength fades to zero over the centre 2% so the direction
      // singularity at r = 0 does not render as a pinpoint artefact.
      d[k + 2] = Math.round(Math.min(1, r / 0.02) * 255);
      d[k + 3] = 255;
    }
  }
  return dataTex(d, size);
}

// Normal map for Cotes de Geneve. Bands run along X. Across each band the
// surface tilts steadily (the cut of the rotating tool), which is what makes
// alternate bands flash light and dark as the watch turns; a fine arc pattern
// inside each band adds the tool marks seen at close range.
export function cotesNormalMap(size = 512, bands = 8) {
  const d = new Uint8Array(size * size * 4);
  const period = size / bands;
  for (let j = 0; j < size; j++) {
    const f = (j % period) / period;                  // 0..1 across a band
    // Tilt ramps from -A to +A across the band. The last 6% eases back so
    // the seam between bands is a crisp but antialiased line.
    const ramp = f < 0.94 ? (f / 0.94) * 2 - 1 : 1 - ((f - 0.94) / 0.06) * 2;
    const band = Math.floor(j / period);
    for (let i = 0; i < size; i++) {
      // Arc tool marks: concentric circles centred one band-width below the
      // band, sampled as a small high-frequency ripple on the normal.
      const cx = (band % 2 ? 0.5 : 0) * period;
      const dy = (j % period) + period * 1.4;
      const dx = ((i + cx) % (period * 2)) - period;
      const arc = Math.sin(Math.hypot(dx, dy) * 1.9) * 0.07;
      const nx = arc * (dx / (Math.hypot(dx, dy) + 1e-3));
      const ny = ramp * 0.2 + arc * 0.5;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const k = (j * size + i) * 4;
      d[k] = (nx * 0.5 + 0.5) * 255;
      d[k + 1] = (ny * 0.5 + 0.5) * 255;
      d[k + 2] = nz * 255;
      d[k + 3] = 255;
    }
  }
  return dataTex(d, size, { repeat: true });
}

// Perlage: overlapping spots of circular graining, laid in rows. Later spots
// cover earlier ones exactly as the real tool does. Inside a spot the normal
// ripples radially, so each spot catches a small ring of light.
export function perlageNormalMap(size = 512, perRow = 7) {
  const d = new Uint8Array(size * size * 4);
  const step = size / perRow;
  const R = step * 0.78;
  const spots = [];
  for (let row = -1; row <= perRow + 1; row++) {
    for (let col = -1; col <= perRow + 1; col++) {
      spots.push([col * step + (row % 2) * step * 0.5, row * step * 0.86]);
    }
  }
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let nx = 0, ny = 0;
      // Walk spots in reverse placement order; the first one that covers the
      // texel is the one on top.
      for (let s = spots.length - 1; s >= 0; s--) {
        // Wrap so the texture tiles seamlessly.
        let dx = i - spots[s][0], dy = j - spots[s][1];
        dx -= Math.round(dx / size) * size;
        dy -= Math.round(dy / size) * size;
        const r = Math.hypot(dx, dy);
        if (r < R) {
          const ripple = Math.sin(r * 0.9) * 0.16 * (1 - r / R);
          nx = (dx / (r + 1e-3)) * ripple;
          ny = (dy / (r + 1e-3)) * ripple;
          break;
        }
      }
      const nz = Math.sqrt(1 - nx * nx - ny * ny);
      const k = (j * size + i) * 4;
      d[k] = (nx * 0.5 + 0.5) * 255;
      d[k + 1] = (ny * 0.5 + 0.5) * 255;
      d[k + 2] = nz * 255;
      d[k + 3] = 255;
    }
  }
  return dataTex(d, size, { repeat: true });
}

// Leather grain: cellular (Worley F2-F1) noise gives the pebbled cells of
// calfskin with creases between them. Jittered feature points avoid the
// axis-aligned lattice that value noise would show on a flat strap.
export function leatherNormalMap(size = 256, cells = 22) {
  const h = new Float32Array(size * size);
  const cs = size / cells;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const gx = Math.floor(i / cs), gy = Math.floor(j / cs);
      let f1 = 1e9, f2 = 1e9;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const cx = gx + ox, cy = gy + oy;
          const wx = ((cx % cells) + cells) % cells, wy = ((cy % cells) + cells) % cells;
          const px = (cx + hash2(wx, wy)) * cs, py = (cy + hash2(wy + 91, wx + 17)) * cs;
          const dd = Math.hypot(i - px, j - py);
          if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) f2 = dd;
        }
      }
      h[j * size + i] = Math.min(1, (f2 - f1) / cs);
    }
  }
  const d = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      // Central differences of the height field, wrapped for tiling.
      const l = h[j * size + ((i - 1 + size) % size)], r = h[j * size + ((i + 1) % size)];
      const u = h[((j - 1 + size) % size) * size + i], b = h[((j + 1) % size) * size + i];
      let nx = (l - r) * 1.6, ny = (u - b) * 1.6, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const k = (j * size + i) * 4;
      d[k] = (nx / len * 0.5 + 0.5) * 255;
      d[k + 1] = (ny / len * 0.5 + 0.5) * 255;
      d[k + 2] = (nz / len) * 255;
      d[k + 3] = 255;
    }
  }
  return dataTex(d, size, { repeat: true });
}

// Strap colour detail: stitching along both edges of the top face. The strap
// geometry maps v in [0, 0.4] across the top, so the stitch rows sit at the
// v values matching 1.3 mm in from each edge of an 18 mm strap.
export function strapStitchMap(length = 80) {
  const w = 2048, hgt = 64;
  const c = canvas(w, hgt);
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, w, hgt);
  const dashes = Math.round(length / 3.2);
  const rows = [0.029, 0.371];
  g.fillStyle = 'rgba(0,0,0,0.52)';
  for (const v of rows) {
    const y = v * hgt;
    for (let n = 0; n < dashes; n++) {
      const x0 = (n / dashes) * w;
      g.beginPath();
      g.ellipse(x0 + w / dashes * 0.5, y, w / dashes * 0.34, 1.05, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  // A darker painted edge (edge paint) on the side walls.
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(0, 0.4 * hgt, w, 0.1 * hgt);
  g.fillRect(0, 0.9 * hgt, w, 0.1 * hgt);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Dial print: minute track, wordmark and sub-dial track as an alpha mask, so
// the print colour can change per model without regenerating anything.
export function dialPrintMap(fontFamily, size = 1024) {
  const c = canvas(size);
  const g = c.getContext('2d');
  const s = size / 33.2;                       // px per mm; plane is 33.2 mm
  const cx = size / 2, cy = size / 2;
  g.fillStyle = '#000';
  g.fillRect(0, 0, size, size);
  g.fillStyle = '#fff';
  g.strokeStyle = '#fff';
  g.lineCap = 'butt';
  // Minute track: 60 ticks, every fifth longer and heavier.
  for (let m = 0; m < 60; m++) {
    const a = (m / 60) * Math.PI * 2;
    const major = m % 5 === 0;
    const r0 = (major ? 14.9 : 15.35) * s, r1 = 16.05 * s;
    g.lineWidth = (major ? 0.32 : 0.16) * s;
    g.beginPath();
    g.moveTo(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0);
    g.lineTo(cx + Math.sin(a) * r1, cy - Math.cos(a) * r1);
    g.stroke();
  }
  g.lineWidth = 0.1 * s;
  g.beginPath(); g.arc(cx, cy, 16.05 * s, 0, Math.PI * 2); g.stroke();

  g.textAlign = 'center';
  g.textBaseline = 'middle';
  // Wordmark under 12, set wide like an engraved name.
  g.font = `600 ${2.15 * s}px ${fontFamily}`;
  if ('letterSpacing' in g) g.letterSpacing = `${0.5 * s}px`;
  g.fillText('ORRIN', cx + 0.25 * s, cy - 6.7 * s);
  g.font = `500 ${0.78 * s}px ${fontFamily}`;
  if ('letterSpacing' in g) g.letterSpacing = `${0.32 * s}px`;
  g.fillText('MUMBAI', cx + 0.16 * s, cy - 4.75 * s);

  // Sub-dial track at 6 o'clock.
  const sx = cx, sy = cy + 8.2 * s;
  for (let m = 0; m < 60; m++) {
    const a = (m / 60) * Math.PI * 2;
    const major = m % 15 === 0, mid = m % 5 === 0;
    const r0 = (major ? 2.85 : mid ? 3.1 : 3.4) * s, r1 = 3.75 * s;
    g.lineWidth = (major ? 0.22 : 0.11) * s;
    g.beginPath();
    g.moveTo(sx + Math.sin(a) * r0, sy - Math.cos(a) * r0);
    g.lineTo(sx + Math.sin(a) * r1, sy - Math.cos(a) * r1);
    g.stroke();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = NoColorSpace;
  t.anisotropy = 8;
  return t;
}

// Ambient occlusion for the dial: the rehaut and bezel shade the outer rim,
// and every applied index sits in a small soft contact shadow.
export function dialAOMap(indexAngles, size = 512) {
  const c = canvas(size);
  const g = c.getContext('2d');
  const s = size / 33.2, cx = size / 2, cy = size / 2;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, size, size);
  const rim = g.createRadialGradient(cx, cy, 13.8 * s, cx, cy, 16.6 * s);
  rim.addColorStop(0, 'rgba(0,0,0,0)');
  rim.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = rim;
  g.fillRect(0, 0, size, size);
  for (const a of indexAngles) {
    const r = 12.6 * s;
    const x = cx + Math.sin(a) * r, y = cy - Math.cos(a) * r;
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.filter = `blur(${0.35 * s}px)`;
    g.fillStyle = 'rgba(0,0,0,0.38)';
    g.fillRect(-0.85 * s, -2.1 * s, 1.7 * s, 4.4 * s);
    g.restore();
  }
  const sub = g.createRadialGradient(cx, cy + 8.2 * s, 3.4 * s, cx, cy + 8.2 * s, 4.1 * s);
  sub.addColorStop(0, 'rgba(0,0,0,0)');
  sub.addColorStop(1, 'rgba(0,0,0,0.3)');
  g.fillStyle = sub;
  g.fillRect(0, 0, size, size);
  const t = new CanvasTexture(c);
  t.colorSpace = NoColorSpace;
  return t;
}

// Caseback engraving, as an alpha mask for a matte etched layer.
export function casebackMap(fontFamily, size = 1024) {
  const c = canvas(size);
  const g = c.getContext('2d');
  const s = size / 36.8, cx = size / 2, cy = size / 2;
  g.fillStyle = '#000';
  g.fillRect(0, 0, size, size);
  g.fillStyle = '#fff';
  const text = 'ORRIN WATCH CO.  ·  BANDRA, MUMBAI  ·  SAPPHIRE CASEBACK  ·  ';
  g.font = `500 ${1.05 * s}px ${fontFamily}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const chars = [...text];
  const R = 14.65 * s;
  for (let n = 0; n < chars.length; n++) {
    const a = (n / chars.length) * Math.PI * 2;
    g.save();
    g.translate(cx + Math.sin(a) * R, cy - Math.cos(a) * R);
    g.rotate(a);
    g.fillText(chars[n], 0, 0);
    g.restore();
  }
  // Six notches for the case wrench.
  for (let n = 0; n < 6; n++) {
    const a = (n / 6) * Math.PI * 2 + Math.PI / 6;
    g.save();
    g.translate(cx + Math.sin(a) * 16.9 * s, cy - Math.cos(a) * 16.9 * s);
    g.rotate(a);
    g.fillRect(-0.9 * s, -0.55 * s, 1.8 * s, 1.1 * s);
    g.restore();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = NoColorSpace;
  t.anisotropy = 8;
  return t;
}
