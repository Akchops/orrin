// The lens, modelled in code. Units are millimetres; the optical axis is Z,
// the front of the lens at z = 0 facing +Z, the mount at z = -98.
//
// Every channel the scroll timeline animates is applied in update(), and
// nothing else moves the parts.

import { TEAR_PARTS, TEAR_ANCHORS, tearProgress, tearOffset, bladeOffset, railId, pickDrift } from './teardown.js';
import { LENS_MARKS } from './textures.js';

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
// The three lenses' proportions (Shaniwar, Parvati, Sinhagad): length along
// the axis and diameter, as multiples of Parvati's.
export { LEN_K, FRONT_K } from './shape.js';
import { LEN_K, FRONT_K } from './shape.js';
const SECTIONS = [
  { id: 'front', mid: -5 },
  { id: 'focus', mid: -24 },
  { id: 'iris', mid: -50 },
  { id: 'rear', mid: -72 },
  { id: 'mount', mid: -92 },
];

export function buildLens(T, L, { quality = 'high', textures, font = '"Saira", "Arial Narrow", sans-serif' }) {
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
  // Turning marks: the fine concentric grooves a lathe tool leaves, as a
  // roughness and bump pattern repeated along every lathed profile (lathe
  // UVs run v along the profile), so metal up close shows its machining and
  // highlights break into fine rings. Far away the mipmaps average it out.
  const turned = keep(turningTexture(T));
  // Black anodising: a dark metal with a satin finish and a thin clear
  // layer, which is what gives anodised parts their crisp edge highlight.
  const anodise = keep(LQ
    ? new T.MeshStandardMaterial({ color: 0x1d1f24, metalness: 0.85, roughness: 0.4 })
    : new T.MeshPhysicalMaterial({ color: 0x1c1e23, metalness: 0.85, roughness: 0.46, clearcoat: 0.5, clearcoatRoughness: 0.18,
      roughnessMap: turned, bumpMap: turned, bumpScale: 0.35 }));
  // Machined edges cut through the anodising to bare aluminium: brushed,
  // so their highlight stretches into a soft streak along the cut.
  const bare = keep(LQ
    ? new T.MeshStandardMaterial({ color: 0xd4d7db, metalness: 1, roughness: 0.18 })
    : new T.MeshPhysicalMaterial({ color: 0xd4d7db, metalness: 1, roughness: 0.22, anisotropy: 0.55, roughnessMap: turned }));
  // Interior: very dark satin rather than dead matte, so the baffle rings
  // pick up faint highlights and the tunnel reads when travelling through.
  const flock = keep(new T.MeshStandardMaterial({ color: 0x1a1c21, metalness: 0.3, roughness: 0.55, envMapIntensity: 0.5 }));
  const steel = keep(LQ
    ? new T.MeshStandardMaterial({ color: 0xcfd2d6, metalness: 1, roughness: 0.1 })
    : new T.MeshPhysicalMaterial({ color: 0xcfd2d6, metalness: 1, roughness: 0.14, anisotropy: 0.5, roughnessMap: turned, bumpMap: turned, bumpScale: 0.2 }));
  const bladeMat = keep(new T.MeshStandardMaterial({ color: 0x15161a, metalness: 0.7, roughness: 0.38, side: T.DoubleSide }));
  // The knurl: the same anodising, lighter underneath so per-vertex colour
  // can darken the grooves back to black and leave the crests a touch worn
  // (the anodising rubbed thin where fingers turn the ring, unevenly round
  // it).
  const knurlMat = keep(anodise.clone());
  knurlMat.color.setHex(0x3a3e46);
  knurlMat.vertexColors = true;
  const knurlWear = (geo, rTop, depth) => {
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), r = Math.hypot(x, y), a = Math.atan2(y, x);
      const crest = Math.min(1, Math.max(0, (r - (rTop - depth * 0.45)) / (depth * 0.45)));
      // Wear patches: a slow, uneven variation round the ring.
      const patch = 0.5 + 0.5 * Math.sin(a * 3 + 1.3) * Math.sin(a * 7 - 0.4);
      const v = 0.48 + crest * (0.14 + 0.22 * patch);
      col[i * 3] = v; col[i * 3 + 1] = v; col[i * 3 + 2] = v * 1.02;
    }
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    return geo;
  };
  const white = keep(new T.MeshStandardMaterial({ color: 0xf1efe9, metalness: 0, roughness: 0.5 }));
  // Accent rings: Shaniwar cool blue, Parvati warm amber, Sinhagad green.
  const bandColours = [0x6fa8ff, 0xf0a64a, 0x62dcc0];
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
  // Highlights: a directional light is a point at infinity, so on glass this
  // smooth it lands as a blown-out white spot. The glass takes only a little
  // of the lights' direct reflection and keeps the studio's soft strips (the
  // environment), with a roughness that softens its pinpoint too.
  // The inner elements are drawn at a fraction of their light (opacity
  // scales an additive layer): seen face on through the open iris, their
  // stacked reflections otherwise add up to a solid white disc in the middle
  // of the glass. (envMapIntensity would not do it: with scene.environment
  // three.js uses the scene's intensity for every material.)
  // (userData.softDirect survives the emphasis copies, which set their own
  // shader hook below and apply this too.)
  const softDirect = (m) => {
    m.userData.softDirect = true;
    m.onBeforeCompile = (sh) => { sh.fragmentShader = softDirectGLSL(sh.fragmentShader); };
    m.customProgramCacheKey = () => 'kessel-glass';
    return m;
  };
  const coatMat = (film, tint, thinFilm) => keep(softDirect(LQ
    ? new T.MeshStandardMaterial({ color: 0x000000, metalness: 0, roughness: 0.08, envMapIntensity: 1.6, transparent: true, opacity: thinFilm ? 1 : 0.45, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide })
    : new T.MeshPhysicalMaterial({
      color: 0x000000, metalness: 0, roughness: 0.07, ior: 1.62, specularIntensity: 1,
      envMapIntensity: 1.25, transparent: true, opacity: thinFilm ? 1 : 0.45, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      ...(thinFilm ? { iridescence: 1, iridescenceIOR: 1.38, iridescenceThicknessRange: film } : { specularColor: new T.Color(tint) }),
    })));
  const bodyMat = keep(new T.MeshBasicMaterial({ color: 0x0a0d12, transparent: true, opacity: 0.07, depthWrite: false, side: T.DoubleSide }));

  // --------------------------------------------------------------- groups
  const root = new T.Group();      // pointer tilt
  const lens = new T.Group();      // model scale / pose
  root.add(lens);
  const groups = SECTIONS.map(() => { const g = new T.Group(); lens.add(g); return g; });
  const [gFront, gFocus, gIris, gRear, gMount] = groups;
  const anchors = {};
  // Teardown parts: each part is a group inside its section, so it can
  // leave on its own path (teardown.js). A part can span sections.
  const parts = {};
  const part = (id, parent) => { const g = new T.Group(); parent.add(g); (parts[id] ||= []).push(g); return g; };
  const pBarrelFront = part('barrel-front', gFront);
  const pFocusRing = part('focus-ring', gFocus);
  const pScale = part('scale', gFocus);
  const pBarrelTube = part('barrel-front', gFocus);
  const pBarrelIris = part('barrel', gIris);
  const pIris = part('blades', gIris);
  const pBarrelRear = part('barrel', gRear);
  const pSignature = part('signature', gRear);
  const pMount = part('mount', gMount);
  // A round hole for the extruded rings, with as many points as the lathes
  // so it never shows a corner: an arc built from too few curve segments
  // turns into a square or an octagon whose faces poke into the light path.
  const roundHole = (r) => {
    const h = new T.Path();
    for (let i = 0; i <= seg; i++) { const a = -(i / seg) * TAU; if (i) h.lineTo(Math.cos(a) * r, Math.sin(a) * r); else h.moveTo(r, 0); }
    return h;
  };

  // ----------------------------------------------------------- front ring
  pBarrelFront.add(mesh(lathe([[40, -9.5], [40, -1.3]]), anodise));
  pBarrelFront.add(mesh(lathe([[40, -1.3], [39.5, -0.35], [38.7, 0]]), bare));
  pBarrelFront.add(mesh(lathe([[38.7, 0], [35.3, 0]]), anodise));
  pBarrelFront.add(mesh(lathe([[35.3, 0], [34.8, -0.45]]), bare));
  pBarrelFront.add(mesh(lathe(ribbed(34.8, -0.45, -9.5, 1.4)), flock));
  // The lens's name and its sample focal length, engraved round the front
  // barrel; one texture row per lens, chosen by offset.
  const nameTex = keep(nameTexture(T, font, HQ ? 4096 : 2048));
  // Each lens's front label and distance scale (textures.front[k],
  // textures.scale[k]), swapped in as S.model reaches it.
  // Entries a viewer does not need may be null.
  const firstOf = (list) => list[1] || list.find(Boolean);
  const frontMat = decal(firstOf(textures.front)), scaleMat = decal(firstOf(textures.scale));
  const nameMat = keep(decal(nameTex));
  pBarrelFront.add(mesh(lathe([[40.06, -8.7], [40.06, -2.9]]), nameMat));
  {
    const r = mesh(new T.RingGeometry(35.4, 38.6, seg, 1), frontMat);
    r.position.z = 0.02;
    pBarrelFront.add(r);
  }

  // ----------------------------------------------------------- focus ring
  // Knurled grip: a ring of rounded ridges extruded along the axis, with the
  // centre left open so the glass can be seen through it. One grip per lens
  // (knurls[model]); Parvati's is the one the film and teardown show.
  const knurls = [];
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
    s.holes.push(roundHole(38.8));
    const g = new T.ExtrudeGeometry(s, { depth: 13, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.35, bevelSegments: 2, curveSegments: 4 });
    g.translate(0, 0, -25);
    const sm = L.toCreasedNormals(g, Math.PI / 5);
    g.dispose();
    const k1 = mesh(knurlWear(sm, 41.4, 0.75), knurlMat);
    pFocusRing.add(k1);
    knurls[1] = k1;
    // Each lens has its own grip. Shaniwar: broad flat-topped ridges with
    // narrow cut grooves. Sinhagad: fewer, rounder, deeper ridges, like a
    // ribbed rubber grip on a long lens.
    const grip = (count, prof, depth) => {
      const s2 = new T.Shape(), n2 = count * 8;
      for (let i = 0; i <= n2; i++) {
        const a = (i / n2) * TAU, f = (a * count / TAU) % 1;
        const rr = 41.4 - depth * prof(f);
        if (i === 0) s2.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else s2.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      s2.holes.push(roundHole(38.8));
      const g2 = new T.ExtrudeGeometry(s2, { depth: 13, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.35, bevelSegments: 2, curveSegments: 4 });
      g2.translate(0, 0, -25);
      const sm2 = L.toCreasedNormals(g2, Math.PI / 5);
      g2.dispose();
      const m2 = mesh(knurlWear(sm2, 41.4, depth), knurlMat);
      m2.visible = false;
      pFocusRing.add(m2);
      return m2;
    };
    knurls[0] = grip(LQ ? 36 : 48, (f) => (f < 0.16 ? Math.sin((f / 0.16) * Math.PI) : 0), 0.9);
    knurls[2] = grip(LQ ? 48 : 64, (f) => 1 - Math.pow(Math.sin(f * Math.PI), 0.6), 1.1);
  }
  pFocusRing.add(mesh(lathe([[40.6, -26.5], [40.6, -25.6], [41.0, -25.2]]), bare));
  pFocusRing.add(mesh(lathe([[41.0, -10.8], [40.6, -10.4], [40.6, -9.8]]), bare));
  // Smooth scale band, engraved with the distance marks.
  pScale.add(mesh(lathe([[40.4, -37.5], [40.4, -26.5]]), anodise));
  {
    const d = mesh(lathe([[40.47, -37.2], [40.47, -26.8]]), scaleMat);
    pScale.add(d);
  }
  pBarrelTube.add(mesh(lathe(ribbed(38.6, -9.8, -37.5, 1.6)), flock));
  anchors.focusRing = new T.Object3D(); anchors.focusRing.position.set(41.5, 0, -18); gFocus.add(anchors.focusRing);

  // ------------------------------------------------- index + aperture + iris
  pBarrelIris.add(mesh(lathe([[39.6, -44.5], [39.6, -38.2], [40.2, -37.8]]), anodise));
  // Index mark: a fine engraved line, filled and flush with the barrel,
  // fixed while the scale turns. On the +X side, the side the focus puller
  // (and the camera) faces.
  {
    const m = mesh(new T.BoxGeometry(0.04, 0.22, 4.2), white);
    m.position.set(39.61, 0, -40.4);
    pBarrelIris.add(m);
  }
  // Aperture ring: coarse ridges that turn as the iris opens.
  const apRing = new T.Group();
  pBarrelIris.add(apRing);
  {
    const s = new T.Shape();
    const ridges = 36, n = ridges * 8;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const f = (i % 8) / 8;
      const rr = f < 0.5 ? 40.1 : 39.4;
      if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    s.holes.push(roundHole(37.5));
    const g = new T.ExtrudeGeometry(s, { depth: 10, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.25, bevelSegments: 1, curveSegments: 2 });
    g.translate(0, 0, -56.5);
    const sm = L.toCreasedNormals(g, Math.PI / 5);
    g.dispose();
    apRing.add(mesh(sm, anodise));
  }
  pBarrelIris.add(mesh(lathe(ribbed(37.0, -38.2, -57, 1.6)), flock));
  // Iris housing: a plate behind the blades and a cover ring in front, so
  // the blades slide out from under the housing as on a real iris.
  {
    const plate = mesh(new T.RingGeometry(21.6, 37.2, seg, 1), flock);
    plate.position.z = IRIS_Z - 0.6;
    pIris.add(plate);
    const cover = mesh(new T.RingGeometry(21.8, 37.2, seg, 1), flock);
    cover.position.z = IRIS_Z + 0.9;
    pIris.add(cover);
    const lip = mesh(lathe([[21.8, IRIS_Z + 0.9], [21.8, IRIS_Z + 1.6]], 96), bare);
    pIris.add(lip);
  }
  // Blades: each an arc-shaped plate pivoting near its leading end. Turning
  // them about their pivots swings their inner edges toward the axis, so the
  // aperture closes as a curved-sided polygon, as on a real iris.
  const N_BLADES = 11;
  const blades = [];
  let bladeFlat, bladeBent;
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
    // The teardown's copy of the blade: normals bent across its width, so
    // each blade is a shallow curved sheet that catches the key and rim
    // lights as a sheen and the eleven read apart. The film keeps the flat
    // blade, so the hero's iris is unchanged.
    bladeBent = keep(g.clone());
    {
      const pos = bladeBent.attributes.position, nor = bladeBent.attributes.normal, tilt = Math.tan((22 * Math.PI) / 180), n = new T.Vector3();
      for (let i = 0; i < pos.count; i++) {
        const X = pos.getX(i) + pivot.x, Y = pos.getY(i), r = Math.hypot(X, Y);
        const t = tilt * (2 * Math.min(1, Math.max(0, (r - rIn) / (rOut - rIn))) - 1);
        n.set((-X / r) * t, (-Y / r) * t, 1).normalize();
        nor.setXYZ(i, n.x, n.y, n.z);
      }
      bladeFlat = g;
    }
    for (let i = 0; i < N_BLADES; i++) {
      const phi = (i / N_BLADES) * TAU;
      const holder = new T.Group();           // placed at the pivot, round the axis
      holder.position.set(Math.cos(phi) * pivot.x, Math.sin(phi) * pivot.x, IRIS_Z + i * 0.035);
      holder.rotation.z = phi;
      const b = new T.Mesh(g, bladeMat);      // rotates about its pivot
      holder.add(b);
      pIris.add(holder);
      holder.userData.rest = holder.position.clone();
      holder.userData.phi = phi;
      blades.push(b);
    }
  }
  anchors.iris = new T.Object3D(); anchors.iris.position.set(0, 0, IRIS_Z); gIris.add(anchors.iris);

  // ---------------------------------------------------------- rear barrel
  pBarrelRear.add(mesh(lathe([[34.2, -86], [36.4, -82], [38.6, -78.4], [38.6, -58.4], [38.2, -58]]), anodise));
  pBarrelRear.add(mesh(lathe([[38.2, -58], [37.6, -57.6]]), bare));
  {
    // The signature plate: a thin anodised band over the rear barrel that
    // carries the maker's mark, so taken apart it is a part, not loose ink.
    pSignature.add(mesh(lathe([[38.9, -78.2], [38.9, -58.4]]), anodise));
    pSignature.add(mesh(lathe([[38.9, -58.4], [38.75, -58.2]]), bare));
    pSignature.add(mesh(lathe([[38.75, -78.4], [38.9, -78.2]]), bare));
    const d = mesh(lathe([[38.96, -77.8], [38.96, -58.8]]), decal(textures.rear));
    pSignature.add(d);
  }
  // Model band: a coloured ring, the way cine sets mark one lens from another.
  pBarrelRear.add(mesh(lathe([[38.7, -58.9], [38.7, -58.5]]), band));
  pBarrelRear.add(mesh(lathe([[36.9, -81.4], [37.6, -80.2]]), band));
  pBarrelRear.add(mesh(lathe(ribbed(33.6, -57.6, -86, 1.6)), flock));
  anchors.signature = new T.Object3D(); anchors.signature.position.set(39, 0, -68); gRear.add(anchors.signature);

  // ---------------------------------------------------------------- mount
  pMount.add(mesh(lathe([[31.2, -98], [33.6, -97.6], [34.0, -90], [34.2, -86]]), steel));
  pMount.add(mesh(lathe([[29, -98], [31.2, -98]]), steel));
  for (let k = 0; k < 4; k++) {
    const lug = mesh(new T.BoxGeometry(12, 2.4, 2), steel);
    const a = (k / 4) * TAU + 0.4;
    lug.position.set(Math.cos(a) * 33.2, Math.sin(a) * 33.2, -95.5);
    lug.rotation.z = a + Math.PI / 2;
    pMount.add(lug);
  }
  pMount.add(mesh(lathe(ribbed(28.6, -86, -98, 1.6)), flock));

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
    // Teardown: the front element on its own, the rest in their optical
    // groups (glass-1 .. glass-4).
    const gid = idx === 0 ? 'front-element' : `glass-${e.group}`;
    const pg = parts[gid] ? parts[gid][0] : part(gid, groups[e.group]);
    pg.add(grp);
    elementMeshes.push(grp);
  });
  // ------------------------------------------------------- lens variants
  // What makes the three lenses different beyond their length (S.model:
  // 0 Shaniwar, 1 Parvati, 2 Sinhagad). Hidden on Parvati, so the film and
  // the teardown are unchanged.
  // Shaniwar: a small petal hood (short petals top and bottom), flaring out
  // from a collar that slides over the front ring, in front of the
  // engraved name.
  const petal = new T.Group();
  {
    const N = HQ ? 160 : 96, M = 12, z0 = -2.4;
    const zf = (a) => 3 + 8.5 * Math.pow(0.5 - 0.5 * Math.cos(2 * a), 1.7);
    const rin = (t) => 40.3 + 3.6 * Math.pow(t, 1.4);
    const surf = (dr, flip) => {
      const pos = [], idx = [];
      for (let j = 0; j <= M; j++) for (let i = 0; i <= N; i++) {
        const a = (i / N) * TAU, t = j / M, r = rin(t) + dr;
        pos.push(Math.cos(a) * r, Math.sin(a) * r, z0 + t * (zf(a) - z0));
      }
      for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
        const p = j * (N + 1) + i, q = p + N + 1;
        if (flip) idx.push(p, p + 1, q, p + 1, q + 1, q); else idx.push(p, q, p + 1, p + 1, q, q + 1);
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setIndex(idx); g.computeVertexNormals();
      return g;
    };
    // The rolled front edge: black like the rest, catching a soft highlight.
    const rimPos = [], rimIdx = [];
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * TAU, z = zf(a), r = rin(1);
      for (const [dr, dz] of [[0, 0], [0.7, 0.35], [1.4, 0]]) rimPos.push(Math.cos(a) * (r + dr), Math.sin(a) * (r + dr), z + dz);
    }
    for (let i = 0; i < N; i++) for (let k = 0; k < 2; k++) {
      const p = i * 3 + k, q = p + 3;
      rimIdx.push(p, q, p + 1, p + 1, q, q + 1);
    }
    const rim = new T.BufferGeometry();
    rim.setAttribute('position', new T.Float32BufferAttribute(rimPos, 3));
    rim.setIndex(rimIdx); rim.computeVertexNormals();
    petal.add(mesh(surf(1.4, false), anodise), mesh(surf(0, true), flock), mesh(rim, anodise));
  }
  petal.visible = false;
  lens.add(petal);
  // Sinhagad: a long pull-out hood, a plain tube with a bare lip and two
  // grip grooves, telescoping forward off the front ring in front of the
  // engraved name.
  const tube = new T.Group();
  tube.add(mesh(lathe([[41.9, -2.4], [41.9, 27.4], [41.6, 28]]), anodise));
  tube.add(mesh(lathe([[41.6, 28], [40.4, 28]]), bare));
  tube.add(mesh(lathe([[40.4, 28], [40.4, -2.4]]), flock));
  for (const z of [0.6, 2.1]) tube.add(mesh(lathe([[41.95, z + 0.4], [41.6, z + 0.2], [41.6, z - 0.2], [41.95, z - 0.4]]), bare));
  tube.visible = false;
  lens.add(tube);
  // Sinhagad: a tripod collar near the mount, a ring with a clamp knob and
  // a foot below with its mounting plate.
  const collar = new T.Group();
  {
    collar.add(mesh(lathe([[42.8, -79.5], [43.4, -80.1], [43.4, -86.4], [42.8, -87]]), anodise));
    collar.add(mesh(lathe([[42.8, -79.5], [37.2, -79.5]]), bare));
    collar.add(mesh(lathe([[37.2, -87], [42.8, -87]]), bare));
    const post = mesh(new T.BoxGeometry(12, 20, 6.4), anodise);
    post.position.set(0, -51, -83.2);
    const foot = mesh(new T.BoxGeometry(26, 3.2, 30), anodise);
    foot.position.set(0, -62, -83.2);
    const plate = mesh(new T.BoxGeometry(24, 0.6, 28), bare);
    plate.position.set(0, -63.9, -83.2);
    const knob = mesh(new T.CylinderGeometry(3.4, 3.4, 6, 24), bare);
    knob.rotation.z = Math.PI / 2;
    knob.position.set(45.5, 8, -83.2);
    collar.add(post, foot, plate, knob);
  }
  collar.visible = false;
  lens.add(collar);
  // The front element bulges forward on the wide lens, about its rim plane.
  const frontEl = elementMeshes[0], FRONT_RIM_Z = -7.92;

  for (const [id, pos] of Object.entries(TEAR_ANCHORS)) {
    const a = new T.Object3D(); a.position.set(...pos);
    const b = new T.Object3D(); b.position.set(pos[0], -pos[1], pos[2]);
    parts[id][0].add(a, b);
    anchors['td-' + id] = a;
    anchors['td-' + id + '-b'] = b;
  }
  // Emphasis: every part gets its own copies of its materials, so the part
  // being explained can stay bright while the others dim. Copies with the
  // same settings share one shader program, so this costs no compiles.
  // Every mesh also learns which rail part it belongs to, for picking.
  // Brightness goes through one multiplier on each copy's final light
  // (uDim), so it reaches every term: direct light, reflections, clear coat
  // and the thin film on the glass. The highlighted part also gets a soft
  // rim of the page's violet (uGlow), as on the 2D tier.
  // In the teardown light no highlight may blow out to a white dot: the
  // lights' direct reflection (and the clear coat's) is capped per pixel,
  // shared by every copy (uSpecCap: no cap in the film, low in the
  // teardown, where the key and the rims sit close to grazing angles on
  // the polished edges).
  const EMPH = [], pickables = [], swapFront = [frontMat], swapScale = [scaleMat];
  const specCap = { value: 100 };
  const emphShader = (m, e) => {
    const std = !!m.isMeshStandardMaterial;
    const soft = !!m.userData.softDirect;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uDim = e.dim;
      sh.uniforms.uGlow = e.glow;
      sh.uniforms.uSpecCap = specCap;
      if (soft) sh.fragmentShader = softDirectGLSL(sh.fragmentShader);
      if (std) sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' +
        '\treflectedLight.directSpecular = min(reflectedLight.directSpecular, vec3(uSpecCap));\n' +
        '#ifdef USE_CLEARCOAT\n\tclearcoatSpecularDirect = min(clearcoatSpecularDirect, vec3(uSpecCap));\n#endif');
      sh.fragmentShader = 'uniform float uDim;\nuniform float uGlow;\nuniform float uSpecCap;\n' + sh.fragmentShader.replace('#include <opaque_fragment>',
        'outgoingLight *= uDim;\n' +
        (std ? 'outgoingLight += uGlow * pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 2.5) * vec3(0.41, 0.33, 1.0);\n' : '') +
        '#include <opaque_fragment>');
    };
    m.customProgramCacheKey = () => (soft ? 'emph-glass' : 'emph');
  };
  for (const [pid, list] of Object.entries(parts)) {
    const rid = railId(pid), copies = new Map();
    for (const g of list) g.traverse((o) => {
      if (!o.isMesh) return;
      o.userData.part = rid;
      pickables.push(o);
      let m = copies.get(o.material);
      if (!m) {
        m = keep(o.material.clone());
        copies.set(o.material, m);
        // The front label and the scale change with the lens: their copies
        // are the ones on screen.
        if (o.material === frontMat) swapFront.push(m);
        if (o.material === scaleMat) swapScale.push(m);
        const e = { rid, m, base: m.color.clone(), isBand: o.material === band, isBlade: o.material === bladeMat, dim: { value: 1 }, glow: { value: 0 } };
        emphShader(m, e);
        EMPH.push(e);
      }
      o.material = m;
    });
  }
  anchors.front = new T.Object3D(); anchors.front.position.set(0, 0, 0); gFront.add(anchors.front);
  anchors.ringEdge = new T.Object3D(); anchors.ringEdge.position.set(43, 0, 0); gFront.add(anchors.ringEdge);

  // --------------------------------------------------------------- sensor
  // Where the camera leaves the lens: an image sensor 46.5 mm behind the
  // mount with the lens's image circle glowing on it, at the bottom of a
  // short camera throat so it never floats on its own. Seen first as a
  // small light at the far end of the barrel; close only at the exit.
  const sensor = new T.Group();
  let chip, gridMat, throatMat, throat, plateGroup;
  {
    const c = document.createElement('canvas'); c.width = 768; c.height = 512;
    const g = c.getContext('2d');
    // The image circle: what the lens projects, brightest at the centre.
    const rg = g.createRadialGradient(384, 256, 0, 384, 256, 360);
    rg.addColorStop(0, 'rgba(255,238,214,1)'); rg.addColorStop(0.45, 'rgba(214,190,255,0.55)'); rg.addColorStop(1, 'rgba(40,30,80,0)');
    g.fillStyle = '#000'; g.fillRect(0, 0, 768, 512);
    g.fillStyle = rg; g.fillRect(0, 0, 768, 512);
    const em = keep(new T.CanvasTexture(c)); em.colorSpace = T.SRGBColorSpace;
    chip = keep(LQ
      ? new T.MeshStandardMaterial({ color: 0x14121c, metalness: 0.6, roughness: 0.25, emissive: 0xffffff, emissiveMap: em, emissiveIntensity: 0 })
      : new T.MeshPhysicalMaterial({ color: 0x14121c, metalness: 0.6, roughness: 0.2, iridescence: 1, iridescenceThicknessRange: [200, 520], emissive: 0xffffff, emissiveMap: em, emissiveIntensity: 0 }));
    // Photosite grid on its own layer, drawn only when the sensor fills the
    // frame (stage3d sets its opacity from the sensor's size on screen), so
    // at a distance there is no fine pattern to moire.
    const gc = document.createElement('canvas'); gc.width = 1152; gc.height = 768;
    const gg = gc.getContext('2d');
    gg.fillStyle = 'rgba(0,0,0,1)';
    for (let x = 0; x < 1152; x += 8) gg.fillRect(x, 0, 1, 768);
    for (let y = 0; y < 768; y += 8) gg.fillRect(0, y, 1152, 1);
    const gt = keep(new T.CanvasTexture(gc)); gt.anisotropy = 8;
    gridMat = keep(new T.MeshBasicMaterial({ color: 0x000000, alphaMap: gt, transparent: true, opacity: 0, depthWrite: false }));
    plateGroup = new T.Group();
    const plate = new T.Mesh(keep(new T.PlaneGeometry(36, 24)), chip);
    const grid = new T.Mesh(keep(new T.PlaneGeometry(36, 24)), gridMat);
    grid.position.z = 0.05;
    const frame = new T.Mesh(keep(new T.PlaneGeometry(46, 34)), flock);
    frame.position.z = -0.3;
    plateGroup.add(plate, grid, frame);
    sensor.add(plateGroup);
    // The camera's throat, from the mount flange down to the sensor: dark
    // walls with a few baffles, so the exit reads as the inside of a body.
    throatMat = keep(new T.MeshStandardMaterial({ color: 0x24272d, metalness: 0.5, roughness: 0.42, envMapIntensity: 0.6, side: T.BackSide, transparent: true, opacity: 0 }));
    throat = new T.Group();
    const tube = new T.Mesh(keep(new T.CylinderGeometry(30, 30, 46, 64, 1, true)), throatMat);
    tube.rotation.x = Math.PI / 2;
    tube.position.z = 23;
    throat.add(tube);
    const baffleMat = keep(new T.MeshStandardMaterial({ color: 0x24272d, metalness: 0.5, roughness: 0.42, envMapIntensity: 0.6, side: T.DoubleSide, transparent: true, opacity: 0 }));
    const lipMat = keep(new T.MeshStandardMaterial({ color: 0xd4d7db, metalness: 1, roughness: 0.25, side: T.DoubleSide, transparent: true, opacity: 0 }));
    throat.userData.baffle = baffleMat;
    throat.userData.lip = lipMat;
    for (const z of [9, 21, 33, 45]) {
      const r = new T.Mesh(keep(new T.RingGeometry(26.5, 30, 64, 1)), baffleMat);
      r.position.z = z;
      const lip = new T.Mesh(keep(new T.RingGeometry(26.2, 26.7, 64, 1)), lipMat);
      lip.position.z = z + 0.05;
      throat.add(r, lip);
    }
    // The image circle lights its own throat, so the walls read around the
    // sensor instead of leaving it alone in the dark.
    const glowLight = new T.PointLight(0xe2d6ff, 0, 90, 2);
    glowLight.position.z = 8;
    throat.userData.light = glowLight;
    sensor.add(glowLight);
    sensor.add(throat);
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
  let lastModel = -1, lastOwn = false;
  const ca = new T.Color(), cb = new T.Color();
  const tv = [0, 0, 0];
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

    // The sensor rides with the mount, 46.5 mm behind its flange. It lights
    // up rather than grows; its throat fades in and out around it.
    sensor.position.z = -98 - 46.5 + SECTIONS[4].mid * SPREAD * sp;
    const th = S.throat || 0;
    sensor.visible = S.sensor > 0.01 || th > 0.01;
    plateGroup.visible = S.sensor > 0.01;
    chip.emissiveIntensity = 0.9 * S.sensor;
    throat.visible = th > 0.01;
    throatMat.opacity = th; throat.userData.baffle.opacity = th; throat.userData.lip.opacity = th;
    throat.userData.light.intensity = 1600 * S.sensor * th;

    // Focus: the ring turns, the engraved scale turns with it.
    gFocus.rotation.z = (S.focus * THROW_RAD);

    // Iris: blade i starts after blade i-1, so it opens one blade at a time.
    const closedAngle = 0.7;       // radians about the pivot: about a 1 mm pinhole
    blades.forEach((b, i) => {
      const start = (i / N_BLADES) * 0.55;
      // Product shots and the lens viewers (S.irisEven) stop the iris down
      // evenly, as a real one closes; the film opens it a blade at a time.
      const e = S.irisEven ? S.iris : smooth(start, start + 0.45, S.iris);
      b.rotation.z = closedAngle * (1 - e);
    });
    apRing.rotation.z = -S.iris * 0.9;

    // Light through the aperture: proportional to the open area, roughly the
    // square of the iris progress. None while the iris is all but closed, so
    // the closed iris shows no point of light and no glare round it.
    const open = S.iris * S.iris, leak = smooth(0.03, 0.2, S.iris);
    glowMat.opacity = Math.min(0.6, open * 0.7) * S.light * leak;
    const gs = 40 + open * 70;
    glow.scale.set(gs, gs, 1);
    lightMat.opacity = S.light * leak;

    // Teardown: every part on its own path (teardown.js). With a part
    // picked (S.pick, S.pe) the others also drift back from it a little.
    const u = S.tear || 0, ks = S.tspread || 1;   // tighter on phones
    for (const p of TEAR_PARTS) {
      const e = tearProgress(u, p.order);
      const pd = pickDrift(p.id, S.pick, S.pe || 0, u, ks);
      if (p.id === 'blades') {
        // The iris comes out of the front, then the blades fan out.
        bladeOffset(p, e, 0, tv);
        parts.blades[0].position.set(0, 0, tv[2] * ks + pd);
        for (const b of blades) {
          const h = b.parent, r = h.userData.rest;
          bladeOffset(p, e, h.userData.phi, tv);
          h.position.set(r.x + tv[0] * ks, r.y + tv[1] * ks, r.z);
          h.rotation.z = h.userData.phi + e * 0.35;
        }
        continue;
      }
      tearOffset(p, e, tv);
      for (const g of parts[p.id]) {
        g.position.set(tv[0] * ks, tv[1] * ks, tv[2] * ks + pd);
        g.rotation.z = (p.spin || 0) * TAU * e;
      }
    }

    // Model: three different lenses. Shaniwar short and stubby with a wide,
    // bulging front and a small petal hood; Parvati plain; Sinhagad the
    // longest, narrower, with a long hood and a tripod collar. Each has its
    // own grip, colour ring, engraved name, distance scale and front label.
    // The hoods and collar grow out of the lens as the film morphs toward
    // their model; the engravings change at halfway.
    if (Math.abs(S.model - lastModel) > 1e-4 || !!S.ownScale !== lastOwn) {
      lastModel = S.model; lastOwn = !!S.ownScale;
      const m = S.model, i = Math.min(1, Math.floor(m)), f = m - i;
      const lz = LEN_K[i] + (LEN_K[i + 1] - LEN_K[i]) * f;
      const fr = FRONT_K[i] + (FRONT_K[i + 1] - FRONT_K[i]) * f;
      lens.scale.set(fr, fr, lz);
      band.color.copy(ca.set(bandColours[i])).lerp(cb.set(bandColours[i + 1]), f);
      const w0 = smooth(0, 1, 1 - m), w2 = smooth(0, 1, m - 1);
      const bulge = 1 + 1.45 * w0;
      frontEl.scale.z = bulge; frontEl.position.z = FRONT_RIM_Z * (1 - bulge);
      petal.visible = w0 > 0.02; petal.scale.z = Math.max(0.02, w0); petal.position.z = -6 * (1 - Math.max(0.02, w0));
      tube.visible = w2 > 0.02; tube.scale.z = Math.max(0.02, w2); tube.position.z = -6 * (1 - Math.max(0.02, w2));
      collar.visible = w2 > 0.02; collar.scale.setScalar(Math.max(0.02, w2));
      collar.position.z = -83.2 * (1 - Math.max(0.02, w2));
      const near = Math.round(m);
      knurls.forEach((k, j) => { k.visible = j === near; });
      nameTex.offset.y = (2 - near) / 3;
      if (textures.front[near]) swapFront.forEach((x) => { x.map = textures.front[near]; });
      // The film keeps one scale (stage3d.js passes only Parvati's); a
      // still of one lens (S.ownScale) asks for that lens's own.
      const scaleTex = S.ownScale && textures.scaleFor ? textures.scaleFor(near) : textures.scale[near];
      if (scaleTex) swapScale.forEach((x) => { x.map = scaleTex; });
      emSig = '';
    }
    emphasis(S);
  }

  // The part in S.hl is the brightest thing in view (a little over its
  // full brightness); the others dim by S.dim. In the teardown light
  // (S.tlight) the iris blades turn from dark to machined steel, so they
  // read as metal on their own.
  let emSig = '';
  const BLADE_DARK = new T.Color(0x15161a), BLADE_STEEL = new T.Color(0xb3b8c1), bladeBase = new T.Color();
  function emphasis(S) {
    const hl = S.hl || '', dim = hl ? S.dim || 0 : 0, st = S.tlight || 0;
    const sig = hl + '|' + dim.toFixed(3) + '|' + st.toFixed(3);
    if (sig === emSig) return;
    emSig = sig;
    specCap.value = 0.5 + 100 * Math.pow(1 - st, 4);
    bladeBase.lerpColors(BLADE_DARK, BLADE_STEEL, st);
    for (const e of EMPH) {
      // A steep curve for the others: the teardown key light is strong, so
      // a linear dim leaves them looking nearly as bright.
      const on = e.rid === hl;
      // No coloured rim on it: the violet tinted the steel blades and the
      // dark rings lavender. Brightness alone marks it.
      e.dim.value = on ? 1 + 0.4 * dim : Math.pow(1 - dim, 1.6);
      e.glow.value = 0;
      if (e.isBlade || e.isBand) e.m.color.copy(e.isBlade ? bladeBase : band.color);
      // Brushed steel: a broad sheen the key light can always catch.
      if (e.isBlade) { e.m.metalness = 0.7 + 0.2 * st; e.m.roughness = 0.38 - 0.08 * st; }
    }
    for (const b of blades) b.geometry = st > 0.01 ? bladeBent : bladeFlat;
  }

  // Quality steps (stage3d): on the lowest ones the clear coat on the
  // anodising and the thin film on the glass go, each a per-pixel shader
  // branch. three.js recompiles the affected materials once.
  function setEffects(full) {
    root.traverse((o) => {
      const m = o.material;
      if (!m || !m.isMeshPhysicalMaterial) return;
      if (m.userData.cc === undefined) { m.userData.cc = m.clearcoat; m.userData.ir = m.iridescence; }
      m.clearcoat = full ? m.userData.cc : 0;
      m.iridescence = full ? m.userData.ir : 0;
    });
  }

  function dispose() { own.forEach((x) => x.dispose && x.dispose()); }
  return { root, lens, update, anchors, dispose, glow, lightDisc, sensor, sensorGrid: gridMat, pickables, setEffects };
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

// The three lens names round the front barrel, one row each (row 0 at the
// top is Shaniwar). Engraving fill on transparent, repeated on both sides.
function nameTexture(T, font, W) {
  const rowH = Math.round(W / 42), c = document.createElement('canvas');
  c.width = W; c.height = rowH * 3;
  const g = c.getContext('2d');
  g.fillStyle = '#f1efe9';
  g.textBaseline = 'middle';
  LENS_MARKS.forEach(([name, fl], r) => {
    const y = r * rowH + rowH / 2;
    for (const u of [0.25, 0.75]) {
      g.font = `600 ${Math.round(rowH * 0.62)}px ${font}`;
      if ('letterSpacing' in g) g.letterSpacing = `${Math.round(rowH * 0.12)}px`;
      g.textAlign = 'right';
      g.fillText(name, u * W - rowH * 0.3, y);
      g.font = `400 ${Math.round(rowH * 0.5)}px ${font}`;
      g.textAlign = 'left';
      g.fillText(fl, u * W + rowH * 0.3, y);
    }
  });
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 8;
  t.repeat.set(1, 1 / 3);
  t.offset.set(0, 1 / 3);
  return t;
}

// Turning marks: rows of slightly different brightness with a faint
// periodic ripple, repeated along the profile. Used as a roughness map
// (brighter = rougher) and as a bump map; values stay high so the average
// roughness changes little.
function turningTexture(T) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let y = 0; y < 256; y++) {
    const v = Math.round(212 + (rnd() - 0.5) * 50 + Math.sin(y * 1.7) * 12);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(0, y, 4, 1);
  }
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.repeat.set(1, 18);
  t.colorSpace = T.NoColorSpace;
  return t;
}

// The glass's share of the lights' direct reflection (see coatMat).
function softDirectGLSL(fs) {
  return fs.replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n\treflectedLight.directSpecular *= 0.06;');
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
