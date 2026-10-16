// The lens, modelled in code. Units are millimetres; the optical axis is Z,
// the front of the lens at z = 0 facing +Z, the mount at z = -98.
//
// Every channel the scroll timeline animates is applied in update(), and
// nothing else moves the parts.

const TAU = Math.PI * 2;

// Glass elements: front vertex z, clear radius, surface radii (R1 > 0 is
// convex toward the front, R2 > 0 convex toward the back), centre
// thickness, and the coating's film thickness range (nm) so each element
// throws a slightly different reflection colour.
const ELEMENTS = [
  { z: -2, r: 33, R1: 95, R2: 260, t: 7, film: [110, 175], group: 0 },
  { z: -14, r: 30, R1: 70, R2: 400, t: 8, film: [180, 320], group: 1 },
  { z: -26, r: 27, R1: -300, R2: -60, t: 4, film: [300, 460], group: 1 },
  { z: -55, r: 21, R1: 55, R2: 55, t: 7, film: [200, 380], group: 2 },
  { z: -66, r: 23, R1: -80, R2: -200, t: 4, film: [240, 400], group: 3 },
  { z: -75, r: 25, R1: 120, R2: 70, t: 9, film: [170, 330], group: 3 },
  { z: -88, r: 24, R1: 200, R2: 200, t: 5, film: [280, 440], group: 4 },
];
// Reflection tints for the inner elements: the violet, blue, green and amber
// of a multicoated stack.
const TINTS = [0xffffff, 0xb6aaff, 0xa9e6d6, 0xaec4ff, 0xd2b4ff, 0xf2cf9c, 0xbab0ff];
export const IRIS_Z = -48;
// Barrel sections slide apart together with the glass they hold. `mid` is
// the section's centre; it moves to mid * (1 + SPREAD * spread).
export const SPREAD = 1.25;
const SECTIONS = [
  { id: 'front', mid: -5 },
  { id: 'focus', mid: -24 },
  { id: 'iris', mid: -50 },
  { id: 'rear', mid: -72 },
  { id: 'mount', mid: -92 },
];

export function buildLens(T, L, { quality = 'high', textures }) {
  const LQ = quality === 'low', HQ = quality === 'high';
  const seg = HQ ? 160 : LQ ? 72 : 112;
  const own = [];
  const keep = (x) => { own.push(x); return x; };
  const mesh = (g, m) => new T.Mesh(keep(g), m);

  // Lathe around Z. Profiles are (radius, z); three.js lathes around Y, so
  // the geometry is turned a quarter about X. Lathe normals point to the
  // right of the direction of travel, so every profile is walked with its
  // visible side on the right.
  const lathe = (pts, s = seg) => {
    const g = new T.LatheGeometry(pts.map(([r, z]) => new T.Vector2(r, z)), s);
    g.rotateX(Math.PI / 2);
    return g;
  };

  // ------------------------------------------------------------ materials
  // Black anodising: a dark metal with a satin finish and a thin clear
  // layer, which is what gives anodised parts their crisp edge highlight.
  const anodise = keep(LQ
    ? new T.MeshStandardMaterial({ color: 0x1d1f24, metalness: 0.85, roughness: 0.4 })
    : new T.MeshPhysicalMaterial({ color: 0x1c1e23, metalness: 0.85, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.18 }));
  // Machined edges cut through the anodising to bare aluminium.
  const bare = keep(new T.MeshStandardMaterial({ color: 0xd4d7db, metalness: 1, roughness: 0.18 }));
  // Interior: very dark satin rather than dead matte, so the baffle rings
  // pick up faint highlights and the tunnel reads when travelling through.
  const flock = keep(new T.MeshStandardMaterial({ color: 0x1a1c21, metalness: 0.3, roughness: 0.55, envMapIntensity: 0.5 }));
  const steel = keep(new T.MeshStandardMaterial({ color: 0xcfd2d6, metalness: 1, roughness: 0.1 }));
  const bladeMat = keep(new T.MeshStandardMaterial({ color: 0x15161a, metalness: 0.7, roughness: 0.38, side: T.DoubleSide }));
  const white = keep(new T.MeshStandardMaterial({ color: 0xf1efe9, metalness: 0, roughness: 0.5 }));
  const bandColours = [0xab9bff, 0xf0a64a, 0x62dcc0];
  const band = keep(new T.MeshStandardMaterial({ color: bandColours[0], metalness: 0.2, roughness: 0.45 }));
  const decal = (map) => keep(new T.MeshStandardMaterial({
    map, transparent: true, roughness: 0.55, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  }));

  // Coated glass, as two layers. The reflection layer is additive: diffuse
  // black, so it contributes only its Fresnel reflection, tinted by a thin
  // film (the multicoating) whose thickness range differs per element. The
  // body layer is a faint absorbing tint, so stacked glass darkens what is
  // behind it slightly, as real glass does.
  // Cost control: seen front-on, every glass surface covers most of the
  // screen, so overdraw multiplies whatever this shader costs. Only the
  // front element (the surfaces you look at) carries the thin-film
  // iridescence; inner elements get a cheaper tinted specular in the same
  // family of colours, and only their front surface is drawn.
  const coatMat = (film, tint, thinFilm) => keep(LQ
    ? new T.MeshStandardMaterial({ color: 0x000000, metalness: 0, roughness: 0.05, envMapIntensity: 1.6, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide })
    : new T.MeshPhysicalMaterial({
      color: 0x000000, metalness: 0, roughness: 0.035, ior: 1.62, specularIntensity: 1,
      envMapIntensity: 1.25, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      ...(thinFilm ? { iridescence: 1, iridescenceIOR: 1.38, iridescenceThicknessRange: film } : { specularColor: new T.Color(tint) }),
    }));
  const bodyMat = keep(new T.MeshBasicMaterial({ color: 0x0a0d12, transparent: true, opacity: 0.07, depthWrite: false, side: T.DoubleSide }));

  // --------------------------------------------------------------- groups
  const root = new T.Group();      // pointer tilt
  const lens = new T.Group();      // model scale / pose
  root.add(lens);
  const groups = SECTIONS.map(() => { const g = new T.Group(); lens.add(g); return g; });
  const [gFront, gFocus, gIris, gRear, gMount] = groups;
  const anchors = {};

  // ----------------------------------------------------------- front ring
  gFront.add(mesh(lathe([[40, -9.5], [40, -1.3]]), anodise));
  gFront.add(mesh(lathe([[40, -1.3], [39.5, -0.35], [38.7, 0]]), bare));
  gFront.add(mesh(lathe([[38.7, 0], [35.3, 0]]), anodise));
  gFront.add(mesh(lathe([[35.3, 0], [34.8, -0.45]]), bare));
  gFront.add(mesh(lathe(ribbed(34.8, -0.45, -9.5, 1.4)), flock));
  {
    const r = mesh(new T.RingGeometry(35.4, 38.6, seg, 1), decal(textures.front));
    r.position.z = 0.02;
    gFront.add(r);
  }

  // ----------------------------------------------------------- focus ring
  // Knurled grip: a ring of rounded ridges extruded along the axis, with the
  // centre left open so the glass can be seen through it.
  {
    const ridges = LQ ? 90 : 150;
    const s = new T.Shape();
    const n = ridges * 6;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      // Raised-cosine ridges, squared so the crests are broad and the
      // grooves narrow, like a cut knurl.
      const c = 0.5 + 0.5 * Math.cos(a * ridges);
      const rr = 41.4 - 0.75 * (1 - c * c);
      if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    const hole = new T.Path();
    hole.absarc(0, 0, 38.8, 0, TAU, true);
    s.holes.push(hole);
    const g = new T.ExtrudeGeometry(s, { depth: 13, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.35, bevelSegments: 2, curveSegments: 4 });
    g.translate(0, 0, -25);
    const sm = L.toCreasedNormals(g, Math.PI / 5);
    g.dispose();
    gFocus.add(mesh(sm, anodise));
  }
  gFocus.add(mesh(lathe([[40.6, -26.5], [40.6, -25.6], [41.0, -25.2]]), bare));
  gFocus.add(mesh(lathe([[41.0, -10.8], [40.6, -10.4], [40.6, -9.8]]), bare));
  // Smooth scale band, engraved with the distance marks.
  gFocus.add(mesh(lathe([[40.4, -37.5], [40.4, -26.5]]), anodise));
  {
    const d = mesh(lathe([[40.47, -37.2], [40.47, -26.8]]), decal(textures.scale));
    gFocus.add(d);
  }
  gFocus.add(mesh(lathe(ribbed(38.6, -9.8, -37.5, 1.6)), flock));
  anchors.focusRing = new T.Object3D(); anchors.focusRing.position.set(41.5, 0, -18); gFocus.add(anchors.focusRing);

  // ------------------------------------------------- index + aperture + iris
  gIris.add(mesh(lathe([[39.6, -44.5], [39.6, -38.2], [40.2, -37.8]]), anodise));
  // Index mark: a filled line at 12 o'clock, fixed while the scale turns.
  {
    // On the +X side, the side the focus puller (and the camera) faces.
    const m = mesh(new T.BoxGeometry(0.25, 0.7, 4.6), white);
    m.position.set(39.68, 0, -40.6);
    gIris.add(m);
    const tri = mesh(new T.ConeGeometry(0.9, 1.4, 3), white);
    tri.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
    tri.position.set(39.75, 0, -38.4);
    tri.scale.set(1, 0.25, 1);
    gIris.add(tri);
  }
  // Aperture ring: coarse ridges that turn as the iris opens.
  const apRing = new T.Group();
  gIris.add(apRing);
  {
    const s = new T.Shape();
    const ridges = 36, n = ridges * 8;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const f = (i % 8) / 8;
      const rr = f < 0.5 ? 40.1 : 39.4;
      if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    const hole = new T.Path(); hole.absarc(0, 0, 37.5, 0, TAU, true); s.holes.push(hole);
    const g = new T.ExtrudeGeometry(s, { depth: 10, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.25, bevelSegments: 1, curveSegments: 2 });
    g.translate(0, 0, -56.5);
    const sm = L.toCreasedNormals(g, Math.PI / 5);
    g.dispose();
    apRing.add(mesh(sm, anodise));
  }
  gIris.add(mesh(lathe(ribbed(37.0, -38.2, -57, 1.6)), flock));
  // Iris housing: a plate behind the blades and a cover ring in front, so
  // the blades slide out from under the housing as on a real iris.
  {
    const plate = mesh(new T.RingGeometry(21.6, 37.2, seg, 1), flock);
    plate.position.z = IRIS_Z - 0.6;
    gIris.add(plate);
    const cover = mesh(new T.RingGeometry(21.8, 37.2, seg, 1), flock);
    cover.position.z = IRIS_Z + 0.9;
    gIris.add(cover);
    const lip = mesh(lathe([[21.8, IRIS_Z + 0.9], [21.8, IRIS_Z + 1.6]], 96), bare);
    gIris.add(lip);
  }
  // Blades: each an arc-shaped plate pivoting near its leading end. Turning
  // them about their pivots swings their inner edges toward the axis, so the
  // aperture closes as a curved-sided polygon, as on a real iris.
  const N_BLADES = 11;
  const blades = [];
  {
    // Solved numerically: these close with full overlap (no light between
    // blades) to a ~1 mm pinhole at 0.7 rad, and open to the 21.5 mm aperture.
    const rIn = 21.5, rOut = 38, sweep = (80 / 180) * Math.PI, pivot = new T.Vector2(30, 0);
    const s = new T.Shape();
    const steps = 28;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * sweep;
      const x = Math.cos(a) * rIn - pivot.x, y = Math.sin(a) * rIn - pivot.y;
      if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
    }
    for (let i = steps; i >= 0; i--) {
      const a = (i / steps) * sweep;
      s.lineTo(Math.cos(a) * rOut - pivot.x, Math.sin(a) * rOut - pivot.y);
    }
    s.closePath();
    const g = keep(new T.ShapeGeometry(s, 2));
    for (let i = 0; i < N_BLADES; i++) {
      const phi = (i / N_BLADES) * TAU;
      const holder = new T.Group();           // placed at the pivot, round the axis
      holder.position.set(Math.cos(phi) * pivot.x, Math.sin(phi) * pivot.x, IRIS_Z + i * 0.035);
      holder.rotation.z = phi;
      const b = new T.Mesh(g, bladeMat);      // rotates about its pivot
      holder.add(b);
      gIris.add(holder);
      blades.push(b);
    }
  }
  anchors.iris = new T.Object3D(); anchors.iris.position.set(0, 0, IRIS_Z); gIris.add(anchors.iris);

  // ---------------------------------------------------------- rear barrel
  gRear.add(mesh(lathe([[34.2, -86], [36.4, -82], [38.6, -78.4], [38.6, -58.4], [38.2, -58]]), anodise));
  gRear.add(mesh(lathe([[38.2, -58], [37.6, -57.6]]), bare));
  {
    const d = mesh(lathe([[38.66, -77.8], [38.66, -58.8]]), decal(textures.rear));
    gRear.add(d);
  }
  // Model band: a coloured ring, the way cine sets mark one lens from another.
  gRear.add(mesh(lathe([[38.7, -58.9], [38.7, -58.5]]), band));
  gRear.add(mesh(lathe([[36.9, -81.4], [37.6, -80.2]]), band));
  gRear.add(mesh(lathe(ribbed(33.6, -57.6, -86, 1.6)), flock));
  anchors.signature = new T.Object3D(); anchors.signature.position.set(39, 0, -68); gRear.add(anchors.signature);

  // ---------------------------------------------------------------- mount
  gMount.add(mesh(lathe([[31.2, -98], [33.6, -97.6], [34.0, -90], [34.2, -86]]), steel));
  gMount.add(mesh(lathe([[29, -98], [31.2, -98]]), steel));
  for (let k = 0; k < 4; k++) {
    const lug = mesh(new T.BoxGeometry(12, 2.4, 2), steel);
    const a = (k / 4) * TAU + 0.4;
    lug.position.set(Math.cos(a) * 33.2, Math.sin(a) * 33.2, -95.5);
    lug.rotation.z = a + Math.PI / 2;
    gMount.add(lug);
  }
  gMount.add(mesh(lathe(ribbed(28.6, -86, -98, 1.6)), flock));

  // --------------------------------------------------------------- glass
  const elementMeshes = [];
  ELEMENTS.forEach((e, idx) => {
    const sag = (R, r) => Math.sign(R) * (Math.abs(R) - Math.sqrt(Math.max(0, R * R - r * r)));
    const s1 = sag(e.R1, e.r), s2 = sag(e.R2, e.r);
    const t = Math.max(e.t, s1 + s2 + 1.4);
    const front = [], back = [];
    for (let i = 0; i <= 24; i++) {
      const r = (i / 24) * e.r;
      front.push([r, e.z - sag(e.R1, r)]);
      back.push([r, e.z - t + sag(e.R2, r)]);
    }
    const fz = front[24][1], bz = back[24][1];
    const grp = new T.Group();
    const first = idx === 0;
    const coat = coatMat(e.film, TINTS[idx], first);
    // Front surface walked edge -> centre (faces +Z), back surface centre ->
    // edge (faces -Z), blackened edge walked back -> front (faces out).
    const fg = lathe(front.slice().reverse(), HQ ? 96 : 64);
    grp.add(new T.Mesh(keep(fg), coat));
    if (first) grp.add(new T.Mesh(keep(lathe(back, HQ ? 96 : 64)), coat));
    grp.add(new T.Mesh(fg, bodyMat));
    grp.add(mesh(lathe([[e.r, bz], [e.r, fz]], 64), flock));
    groups[e.group].add(grp);
    elementMeshes.push(grp);
  });
  anchors.front = new T.Object3D(); anchors.front.position.set(0, 0, 0); gFront.add(anchors.front);
  anchors.ringEdge = new T.Object3D(); anchors.ringEdge.position.set(43, 0, 0); gFront.add(anchors.ringEdge);

  // --------------------------------------------------------------- sensor
  // Where the camera leaves the lens: an image sensor behind the mount with
  // the lens's image circle glowing on it. Shown only on the trip through.
  const sensor = new T.Group();
  {
    const c = document.createElement('canvas'); c.width = 768; c.height = 512;
    const g = c.getContext('2d');
    // The image circle: what the lens projects, brightest at the centre.
    const rg = g.createRadialGradient(384, 256, 0, 384, 256, 360);
    rg.addColorStop(0, 'rgba(255,238,214,1)'); rg.addColorStop(0.45, 'rgba(214,190,255,0.55)'); rg.addColorStop(1, 'rgba(40,30,80,0)');
    g.fillStyle = '#000'; g.fillRect(0, 0, 768, 512);
    g.fillStyle = rg; g.fillRect(0, 0, 768, 512);
    // Photosite grid, very fine.
    g.fillStyle = 'rgba(0,0,0,0.35)';
    for (let x = 0; x < 768; x += 6) g.fillRect(x, 0, 1, 512);
    for (let y = 0; y < 512; y += 6) g.fillRect(0, y, 768, 1);
    const em = keep(new T.CanvasTexture(c)); em.colorSpace = T.SRGBColorSpace;
    const chip = keep(LQ
      ? new T.MeshStandardMaterial({ color: 0x14121c, metalness: 0.6, roughness: 0.25, emissive: 0xffffff, emissiveMap: em, emissiveIntensity: 0.9 })
      : new T.MeshPhysicalMaterial({ color: 0x14121c, metalness: 0.6, roughness: 0.2, iridescence: 1, iridescenceThicknessRange: [200, 520], emissive: 0xffffff, emissiveMap: em, emissiveIntensity: 0.9 }));
    const plate = new T.Mesh(keep(new T.PlaneGeometry(36, 24)), chip);
    const frame = new T.Mesh(keep(new T.PlaneGeometry(46, 34)), flock);
    frame.position.z = -0.3;
    sensor.add(plate, frame);
  }
  lens.add(sensor);

  // --------------------------------------------------------- light behind
  // A bright window far behind the lens: what the iris lets through.
  // Small enough to sit inside the lens silhouette from the front, so it is
  // only ever seen through the glass and the aperture.
  const lightMat = keep(new T.MeshBasicMaterial({ color: new T.Color(2.6, 2.45, 2.25), transparent: true, opacity: 1, depthWrite: false }));
  const lightDisc = new T.Mesh(keep(new T.CircleGeometry(80, 64)), lightMat);
  lightDisc.position.z = -700;
  lens.add(lightDisc);

  // Bloom at the aperture: a camera-facing sprite with a smooth falloff,
  // scaled with how much light is getting through.
  const glowTex = keep(radialTexture(T));
  const glowMat = keep(new T.SpriteMaterial({ map: glowTex, color: 0xfff1e2, transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending, opacity: 0 }));
  const glow = new T.Sprite(glowMat);
  glow.position.z = IRIS_Z;
  glow.renderOrder = 20;
  gIris.add(glow);

  // Light leaking through the gaps when the barrel sections part: a thin
  // glowing band exactly where each gap opens.
  const leakMat = keep(new T.MeshBasicMaterial({ color: 0xffe2c4, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
  const EDGES = [[-9.5, -9.8], [-37.5, -37.8], [-57, -57.6], [-86, -86]];   // back of section i, front of i+1
  const leaks = EDGES.map(() => {
    const m = new T.Mesh(keep(new T.CylinderGeometry(39.5, 39.5, 1, 64, 1, true)), leakMat);
    m.rotation.x = Math.PI / 2;
    lens.add(m);
    return m;
  });

  // ---------------------------------------------------------------- update
  let lastModel = -1;
  const ca = new T.Color(), cb = new T.Color();
  function update(S, tSec) {
    // Sections slide apart along the axis together with their glass.
    const sp = S.spread;
    groups.forEach((g, i) => { g.position.z = SECTIONS[i].mid * SPREAD * sp; });
    leaks.forEach((m, i) => {
      const za = EDGES[i][0] + SECTIONS[i].mid * SPREAD * sp, zb = EDGES[i][1] + SECTIONS[i + 1].mid * SPREAD * sp;
      m.position.z = (za + zb) / 2;
      m.scale.y = Math.max(0.01, za - zb);
    });
    leakMat.opacity = 0.12 * Math.min(1, sp * 2);

    // The sensor rides with the mount, 46.5 mm behind its flange.
    sensor.position.z = -98 - 46.5 + SECTIONS[4].mid * SPREAD * sp;
    sensor.visible = S.sensor > 0.01;
    sensor.scale.setScalar(Math.max(0.01, S.sensor));

    // Focus: the ring turns, the engraved scale turns with it.
    gFocus.rotation.z = (S.focus * THROW_RAD);

    // Iris: blade i starts after blade i-1, so it opens one blade at a time.
    const closedAngle = 0.7;       // radians about the pivot: about a 1 mm pinhole
    blades.forEach((b, i) => {
      const start = (i / N_BLADES) * 0.55;
      const e = smooth(start, start + 0.45, S.iris);
      b.rotation.z = closedAngle * (1 - e);
    });
    apRing.rotation.z = -S.iris * 0.9;

    // Light through the aperture: proportional to the open area, roughly the
    // square of the iris progress, plus a floor for the pinhole.
    const open = 0.015 + 0.985 * S.iris * S.iris;
    glowMat.opacity = Math.min(0.6, open * 0.7) * S.light;
    const gs = 40 + open * 70;
    glow.scale.set(gs, gs, 1);
    lightMat.opacity = S.light;

    // Model: barrel length and front size per lens, and its colour band.
    if (Math.abs(S.model - lastModel) > 1e-4) {
      lastModel = S.model;
      const i = Math.min(1, Math.floor(S.model)), f = S.model - i;
      const len = [0.82, 1, 1.22], front = [1.08, 1, 0.94];
      const lz = len[i] + (len[i + 1] - len[i]) * f;
      const fr = front[i] + (front[i + 1] - front[i]) * f;
      lens.scale.set(fr, fr, lz);
      band.color.copy(ca.set(bandColours[i])).lerp(cb.set(bandColours[i + 1]), f);
    }
  }

  function dispose() { own.forEach((x) => x.dispose && x.dispose()); }
  return { root, lens, update, anchors, dispose, glow, lightDisc };
}

const THROW_RAD = (160 / 180) * Math.PI;

function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

// Inner wall profile with light baffles: a shallow sawtooth so the inside
// of the barrel shows rings rushing past when the camera travels through.
// Walked front -> back (faces the axis).
function ribbed(r, z0, z1, pitch) {
  const pts = [];
  for (let z = z0; z > z1; z -= pitch) {
    pts.push([r, z]);
    pts.push([r - 0.5, z - pitch * 0.25]);
    pts.push([r, z - pitch * 0.5]);
  }
  pts.push([r, z1]);
  return pts;
}

// Radial falloff for the bloom sprite: (1 - d^2)^3 plus a faint wide tail.
// The compact kernel has no flat top and no visible rim (known-traps #2).
function radialTexture(T) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), img = g.createImageData(S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const x = (i + 0.5) / S * 2 - 1, y = (j + 0.5) / S * 2 - 1;
    const d2 = x * x + y * y;
    const k = Math.max(0, 1 - d2);
    const v = k * k * k * 0.85 + Math.exp(-d2 * 9) * 0.6;
    const o = (j * S + i) * 4;
    img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
    img.data[o + 3] = Math.min(255, v * 255);
  }
  g.putImageData(img, 0, 0);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}
