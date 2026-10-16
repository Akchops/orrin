// The watch, modelled in code. Every channel the scroll timeline animates is
// applied in update(); nothing else moves the parts, so scroll, pointer and
// time never fight over the same transform.
import {
  Group, Mesh, InstancedMesh, Object3D, Color, Vector2, Vector3, Matrix4, Shape,
  MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial,
  PlaneGeometry, CircleGeometry, CylinderGeometry, SphereGeometry, TorusGeometry,
  TubeGeometry, CatmullRomCurve3, BoxGeometry,
  AdditiveBlending, DoubleSide, MathUtils, BufferAttribute,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  CASE, SUBDIAL, WHEELS, PALLET, BRIDGES, JEWELS, SCREWS, PLATE, DIAL_FALL,
  HANDS_FLOAT, MODELS, mumbaiSeconds, sstep, staggered,
} from './parts.js';
import {
  latheZ, cylZ, extrudeZ, gearShape, escapeShape, ratchetShape, knurlShape,
  roundedRect, circleShape, bridgeShape, dauphineGeometry, needleShape,
  strapGeometry, hairspringPoints,
} from './geometry.js';
import {
  sunburstMap, cotesNormalMap, perlageNormalMap, leatherNormalMap,
  strapStitchMap, dialPrintMap, dialAOMap, casebackMap,
} from './textures.js';

const TAU = Math.PI * 2;
const lerp = MathUtils.lerp;

export function buildWatch({ quality = 'high', fontFamily = 'sans-serif' } = {}) {
  const HQ = quality === 'high', LQ = quality === 'low';
  const seg = HQ ? 160 : LQ ? 72 : 112;
  const disposables = [];
  const own = (x) => { disposables.push(x); return x; };

  // ---------------------------------------------------------------- textures
  const tex = {
    sunburst: own(sunburstMap(LQ ? 256 : 512)),
    cotes: own(cotesNormalMap(LQ ? 256 : 512, 8)),
    perlage: own(perlageNormalMap(LQ ? 256 : 512, 7)),
    leather: own(leatherNormalMap(256, 22)),
    print: own(dialPrintMap(fontFamily, LQ ? 1024 : 2048)),
    back: own(casebackMap(fontFamily, LQ ? 512 : 1024)),
  };
  // Cotes bands: 8 bands per texture tile, 1.35 mm per band, set slightly off
  // horizontal as a watchmaker would run them across the bridges.
  tex.cotes.repeat.set(1 / (8 * 0.95), 1 / (8 * 0.95));
  tex.cotes.rotation = 0.42;
  tex.perlage.repeat.set(4, 4);          // plate caps map 0..1 across 29.6 mm
  tex.leather.repeat.set(9, 2.2);

  // The ratchet's extruded caps carry UVs in millimetres; remap the sunburst
  // field so its centre lands on the wheel's arbor.
  const sunRatchet = own(tex.sunburst.clone());
  sunRatchet.repeat.set(1 / 8.8, 1 / 8.8);
  sunRatchet.offset.set(0.5, 0.5);
  sunRatchet.needsUpdate = true;

  // --------------------------------------------------------------- materials
  // Stainless steel: F0 around 0.55-0.6 linear. A polished finish keeps the
  // roughness low but not zero, so highlights have a soft shoulder.
  const steel = own(new MeshStandardMaterial({ color: 0xc9ccd0, metalness: 1, roughness: 0.085, envMapIntensity: 1.05 }));
  const steelBright = own(new MeshStandardMaterial({ color: 0xe4e6e9, metalness: 1, roughness: 0.05, envMapIntensity: 1.2 }));
  // Brushed flank: anisotropic so the reflection smears around the case
  // instead of along it, the signature of a circular satin finish.
  const brushed = own(LQ
    ? new MeshStandardMaterial({ color: 0xbfc2c6, metalness: 1, roughness: 0.3 })
    : new MeshPhysicalMaterial({ color: 0xc3c6ca, metalness: 1, roughness: 0.34, anisotropy: 0.85, anisotropyRotation: Math.PI / 2 }));
  const darkInner = own(new MeshStandardMaterial({ color: 0x1a1b1d, metalness: 0.6, roughness: 0.6 }));

  // Sapphire: additive reflection layer only. Diffuse is black, so the
  // material contributes nothing but its Fresnel reflection (F0 from IOR
  // 1.77, about 7.7% head-on and rising at grazing angles). Additive blending
  // is the physically right composite for a clear crystal: what is behind it
  // is transmitted almost unchanged, and the reflection lies on top. This
  // avoids three.js's transmission pass, which would double the cost on phones.
  const sapphire = own(new MeshPhysicalMaterial({
    color: 0x000000, metalness: 0, roughness: 0.03, ior: 1.77, specularIntensity: 1,
    envMapIntensity: 1.6, transparent: true, depthWrite: false, blending: AdditiveBlending,
    ...(LQ ? {} : {
      // Anti-reflective coating: a thin MgF2-like film tints the reflection
      // toward violet-blue, as real AR-coated sapphire does.
      iridescence: 0.7, iridescenceIOR: 1.38, iridescenceThicknessRange: [100, 170],
    }),
  }));

  const m0 = MODELS[0];
  const dial = own(LQ
    ? new MeshStandardMaterial({ color: m0.dial, metalness: m0.dialMetal, roughness: 0.36 })
    : new MeshPhysicalMaterial({
      color: m0.dial, metalness: m0.dialMetal, roughness: 0.4,
      anisotropy: m0.aniso, anisotropyMap: tex.sunburst,
      // Lacquer over the sunburst: a sharp clear reflection riding on the
      // softer brushed one.
      clearcoat: 0.55, clearcoatRoughness: 0.08,
    }));
  const subdial = own(LQ
    ? new MeshStandardMaterial({ color: m0.subdial, metalness: m0.dialMetal, roughness: 0.42 })
    : new MeshPhysicalMaterial({
      color: m0.subdial, metalness: m0.dialMetal, roughness: 0.42,
      anisotropy: 0.8, anisotropyMap: tex.sunburst, anisotropyRotation: Math.PI / 2,
      clearcoat: 0.4, clearcoatRoughness: 0.1,
    }));
  const dialBack = own(new MeshStandardMaterial({ color: 0xb08d57, metalness: 1, roughness: 0.45 }));
  const print = own(new MeshStandardMaterial({
    color: m0.print, roughness: 0.55, metalness: 0, alphaMap: tex.print, transparent: true,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  }));
  const handMat = own(new MeshStandardMaterial({ color: m0.hands, metalness: 1, roughness: 0.07, envMapIntensity: 1.25 }));
  const indexMat = own(new MeshStandardMaterial({ color: m0.hands, metalness: 1, roughness: 0.06, envMapIntensity: 1.25 }));
  const rehautMat = own(new MeshStandardMaterial({ color: 0x1b1c1f, metalness: 0.3, roughness: 0.55 }));

  // Movement finishes: rhodium plates and bridges, gilt wheels, blued
  // screws, synthetic rubies.
  const rhodium = own(new MeshStandardMaterial({
    color: 0xc9cdd1, metalness: 1, roughness: 0.24, normalMap: tex.cotes, normalScale: new Vector2(0.45, 0.45),
  }));
  const anglage = own(new MeshStandardMaterial({ color: 0xdfe2e5, metalness: 1, roughness: 0.06 }));
  const plateMat = own(new MeshStandardMaterial({
    color: 0xd0d3d7, metalness: 1, roughness: 0.36, normalMap: tex.perlage, normalScale: new Vector2(1, 1),
  }));
  const gilt = own(new MeshStandardMaterial({ color: 0xe0b46a, metalness: 1, roughness: 0.2 }));
  const giltSoft = own(new MeshStandardMaterial({ color: 0xcfa35d, metalness: 1, roughness: 0.32 }));
  const ratchetMat = own(LQ
    ? new MeshStandardMaterial({ color: 0xc8cbcf, metalness: 1, roughness: 0.2 })
    : new MeshPhysicalMaterial({ color: 0xc8cbcf, metalness: 1, roughness: 0.3, anisotropy: 0.9, anisotropyMap: sunRatchet }));
  const blued = own(new MeshStandardMaterial({ color: 0x2b44a0, metalness: 1, roughness: 0.16, emissive: 0x050a1e }));
  const ruby = own(new MeshPhysicalMaterial({
    color: 0x9e0a1e, metalness: 0, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02,
    ior: 1.76, specularIntensity: 1, emissive: 0x3a0008, emissiveIntensity: 0.6,
  }));
  const hairMat = own(new MeshStandardMaterial({ color: 0x8f96a8, metalness: 1, roughness: 0.25 }));

  const leather = own(new MeshPhysicalMaterial({
    color: m0.strap, roughness: 0.58, metalness: 0, normalMap: tex.leather, normalScale: new Vector2(0.6, 0.6),
    envMapIntensity: 0.5, sheen: LQ ? 0 : 0.3, sheenRoughness: 0.5, sheenColor: new Color(0x4a3a30),
  }));
  const engraved = own(new MeshStandardMaterial({
    color: 0x2a2b2e, metalness: 1, roughness: 0.62, alphaMap: tex.back, transparent: true,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  }));

  const mesh = (g, m) => { own(g); return new Mesh(g, m); };

  // ------------------------------------------------------------------ groups
  const root = new Group();
  const watch = new Group();
  root.add(watch);
  const caseG = new Group();
  const crownG = new Group();
  const backG = new Group();
  const moveG = new Group();
  watch.add(caseG, crownG, backG, moveG);

  // -------------------------------------------------------------------- case
  // Case middle in three lathes so chamfers and flank get separate finishes
  // and a hard edge between them, as on a real case.
  caseG.add(mesh(latheZ([[17.0, CASE.backZ], [18.55, CASE.backZ], [19.3, -5.2], [19.85, -4.5], [20.0, -3.65]], seg), steel));
  caseG.add(mesh(latheZ([[20.0, -3.65], [20.06, -2.6], [20.07, -1.4], [20.03, -0.2], [19.98, 0.42]], seg), brushed));
  caseG.add(mesh(latheZ([[19.98, 0.42], [19.85, 0.9], [19.5, CASE.frontZ], [17.25, CASE.frontZ]], seg), steel));
  caseG.add(mesh(latheZ([[17.0, CASE.frontZ], [17.0, CASE.backZ]], seg), darkInner));
  // Bezel: a single polished curve from the crystal to the case.
  // (Lathe normals point to the right of the direction of travel, so each
  // profile is walked with the visible side on its right.)
  caseG.add(mesh(latheZ([
    [19.7, CASE.frontZ], [19.75, 1.95], [19.55, 2.55], [19.15, 2.92], [18.5, 3.06],
    [17.8, 2.96], [17.45, 2.72], [17.32, 2.3], [17.32, CASE.frontZ],
  ], seg), steelBright));
  // Rehaut: the inner flange that steps the dial down from the bezel.
  caseG.add(mesh(latheZ([[17.33, 2.3], [17.33, 1.7], [16.6, 0.36]], seg), rehautMat));
  // Domed sapphire crystal. Spherical cap of radius 70 mm: shallow enough to
  // keep the dial legible, curved enough to bend the reflections.
  {
    const pts = [];
    const Rc = 70, top = 3.9;
    for (let i = 0; i <= 24; i++) {
      const r = (i / 24) * CASE.crystalR;
      pts.push([r, top - (Rc - Math.sqrt(Rc * Rc - r * r))]);
    }
    pts.push([CASE.crystalR, 2.2]);
    const crystal = mesh(latheZ(pts.reverse(), seg), sapphire);
    crystal.renderOrder = 10;
    caseG.add(crystal);
  }
  // Lugs: side profile drawn in the YZ plane, extruded across X with a
  // rounded polished edge. Built once, merged into one draw call.
  {
    const s = new Shape();
    s.moveTo(15.6, 0.7);
    s.bezierCurveTo(18.5, 0.6, 21.5, -0.4, 23.3, -1.7);
    s.quadraticCurveTo(24.6, -2.8, 23.6, -4.0);
    s.bezierCurveTo(22.4, -4.9, 19.5, -5.0, 15.6, -5.0);
    s.closePath();
    // Cyclic axis permutation: shape x -> Y, shape y -> Z, extrusion -> X.
    const perm = new Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1);
    const parts = [];
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const g = extrudeZ(s, CASE.lugWidth, 0, 0.42, 20, 3);
        g.applyMatrix4(perm);
        if (sy < 0) { g.applyMatrix4(new Matrix4().makeScale(1, -1, 1)); flipWinding(g); }
        g.translate(sx * (CASE.lugInner + CASE.lugWidth / 2), 0, 0);
        parts.push(g);
      }
    }
    caseG.add(mesh(mergeGeometries(parts), steel));
    parts.forEach((g) => g.dispose());
  }
  // Crown tube.
  {
    const g = new CylinderGeometry(1.55, 1.55, 1.6, 32);
    g.rotateZ(Math.PI / 2);
    g.translate(20.6, 0, CASE.crownZ);
    caseG.add(mesh(g, steel));
  }

  // ------------------------------------------------------------------- crown
  // Knurled crown on its own axis (X); origin at its inner face.
  {
    const body = extrudeZ(knurlShape(3.3, 30, 0.22), 3.1, 1.55, 0.3, 4, 2);
    body.rotateY(Math.PI / 2);
    crownG.add(mesh(body, steel));
    const cap = new CylinderGeometry(2.55, 2.75, 0.4, 48);
    cap.rotateZ(-Math.PI / 2);
    cap.translate(3.25, 0, 0);
    crownG.add(mesh(cap, steelBright));
    const ring = new TorusGeometry(1.55, 0.12, 8, 48);
    ring.rotateY(Math.PI / 2);
    ring.translate(3.47, 0, 0);
    crownG.add(mesh(ring, darkInner));
    const stem = new CylinderGeometry(0.45, 0.45, 16, 16);
    stem.rotateZ(Math.PI / 2);
    stem.translate(-8, 0, 0);
    crownG.add(mesh(stem, steel));
  }

  // ---------------------------------------------------------------- caseback
  {
    backG.add(mesh(latheZ([[12.75, -6.86], [12.95, -7.0], [16.5, -7.0], [17.45, -6.88], [18.2, -6.3], [18.45, CASE.backZ]], seg), steel));
    const decal = mesh(new CircleGeometry(18.4, seg), engraved);
    decal.rotation.y = Math.PI;      // faces -Z, read from behind
    decal.position.z = -7.012;
    backG.add(decal);
    // Window crystal, domed outward (toward -Z).
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const r = (i / 16) * 12.8;
      pts.push([r, -7.25 + (r * r) / (2 * 60)]);
    }
    const win = mesh(latheZ(pts, seg), sapphire);
    win.renderOrder = 10;
    backG.add(win);
  }

  // ---------------------------------------------------------------- movement
  const parts = [];       // everything that explodes: { obj, rest, ex, spin, order, kind }
  const anchors = {};

  const plate = mesh(cylZ(PLATE.r, -PLATE.t, 0, seg), plateMat);
  moveG.add(plate);
  // Plate edge reads as a turned, polished band.
  moveG.add(mesh(cylZ(PLATE.r + 0.02, -PLATE.t, -0.05, seg, true), anglage));

  // Motion works on the dial side: hour wheel and minute wheel. Hidden under
  // the dial when assembled, seen when the dial falls away.
  {
    const hw = mesh(extrudeZ(gearShape(3.1, 48, { spokes: 3, perTooth: LQ ? 6 : 8 }), 0.16, 0.12, 0), gilt);
    const mw = mesh(extrudeZ(gearShape(1.7, 26, { perTooth: 6 }), 0.16, 0.12, 0), gilt);
    mw.position.set(3.6, 2.6, 0);
    const cp = mesh(cylZ(0.75, 0, 0.6, 24), steel);
    moveG.add(hw, mw, cp);
  }

  // Bridges: Cotes on the top face, polished bevel all round.
  const bridgeObjs = {};
  for (const b of BRIDGES) {
    const g = extrudeZ(bridgeShape(b), b.t, b.z, 0.18, 6, 2);
    const m = new Mesh(own(g), [rhodium, anglage]);
    const grp = new Group();
    grp.add(m);
    moveG.add(grp);
    bridgeObjs[b.id] = { grp, def: b };
    parts.push({ obj: grp, rest: new Vector3(0, 0, 0), ex: new Vector3(...b.ex), spin: 0, order: b.order, kind: 'bridge', tilt: 0.12 });
  }
  anchors.bridges = new Object3D();
  anchors.bridges.position.set(-1.5, -10.5, BRIDGES[1].z - 0.6);
  bridgeObjs['train-bridge'].grp.add(anchors.bridges);

  // Wheels.
  const wheelObjs = {};
  for (const w of WHEELS) {
    const grp = new Group();
    grp.position.set(w.x, w.y, w.z);
    let gearGeo;
    if (w.kind === 'escape') gearGeo = extrudeZ(escapeShape(w.r, w.teeth), w.t, 0, 0);
    else if (w.kind === 'ratchet') gearGeo = extrudeZ(ratchetShape(w.r, w.teeth), w.t, 0, 0.05, 4, 1);
    else if (w.kind === 'barrel') gearGeo = extrudeZ(gearShape(w.r, w.teeth, { perTooth: LQ ? 6 : 8 }), 0.45, -w.t / 2 + 0.25, 0);
    else if (w.kind === 'balance') gearGeo = null;
    else gearGeo = extrudeZ(gearShape(w.r, w.teeth, { spokes: w.spokes, perTooth: LQ ? 6 : 8 }), w.t, 0, 0);

    if (w.kind === 'barrel') {
      grp.add(mesh(gearGeo, gilt));
      grp.add(mesh(cylZ(w.r - 0.45, -w.t / 2 + 0.2, w.t / 2, 64), giltSoft));
      grp.add(mesh(cylZ(1.1, -w.t / 2 - 0.4, w.t / 2 + 1.2, 24), steel));
    } else if (w.kind === 'balance') {
      // Rim, three arms, timing weights, roller and staff.
      const rimShape = circleShape(w.r);
      rimShape.holes.push(circleShape(w.r - 0.5));
      const rim = extrudeZ(rimShape, w.t, 0, 0.06, 6, 1);
      const armList = [];
      for (let k = 0; k < 3; k++) {
        const a = new BoxGeometry(0.42, w.r - 0.3, w.t * 0.55);
        a.translate(0, (w.r - 0.3) / 2, 0);
        a.rotateZ((k / 3) * TAU + 0.3);
        armList.push(a);
      }
      const arms = mergeGeometries(armList);
      armList.forEach((a) => a.dispose());
      grp.add(mesh(rim, gilt), mesh(arms, gilt));
      const weights = [];
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + 0.2;
        const c = new CylinderGeometry(0.28, 0.28, 0.7, 12);
        c.rotateZ(Math.PI / 2);
        c.translate(w.r + 0.25, 0, 0);
        c.rotateZ(a);
        weights.push(c);
      }
      const wg = mergeGeometries(weights);
      weights.forEach((c) => c.dispose());
      grp.add(mesh(wg, gilt));
      grp.add(mesh(cylZ(0.95, -0.55, -0.25, 24), steel));
      grp.add(mesh(cylZ(0.16, -1.3, 1.3, 8), steel));
      // Hairspring above the rim. A tube rather than a line, so it shades.
      const curve = new CatmullRomCurve3(hairspringPoints(0.7, 3.05, 11, LQ ? 400 : 900));
      const hs = LQ
        ? new TubeGeometry(curve, 400, 0.05, 3, false)
        : new TubeGeometry(curve, 1100, 0.04, 4, false);
      const hsm = mesh(hs, hairMat);
      hsm.position.z = -(w.t / 2 + 0.22);   // on the cock side of the rim
      grp.add(hsm);
      wheelObjs.hairspring = hsm;
    } else {
      const mat = w.kind === 'ratchet' ? ratchetMat : gilt;
      grp.add(mesh(gearGeo, mat));
      // Pinion and arbor, steel, through the wheel.
      if (w.kind !== 'ratchet') {
        grp.add(mesh(extrudeZ(gearShape(0.62, 8, { depth: 0.2, perTooth: 6 }), 1.1, -0.65, 0), steel));
        grp.add(mesh(cylZ(0.17, -1.4, 1.4, 8), steel));
      }
    }
    moveG.add(grp);
    wheelObjs[w.id] = grp;
    parts.push({ obj: grp, rest: grp.position.clone(), ex: new Vector3(...w.ex), spin: w.spin, order: w.order, kind: w.id });
  }
  // Pallet fork with its two red pallet stones.
  {
    const grp = new Group();
    grp.position.set(PALLET.x, PALLET.y, PALLET.z);
    const s = roundedRect(0.6, 4.6, 0.25);
    const lever = extrudeZ(s, 0.22, 0, 0);
    lever.translate(0, 2.0, 0);
    const bar = extrudeZ(roundedRect(3.6, 0.55, 0.22), 0.22, 0, 0);
    bar.translate(0, -0.5, 0);
    const lg = mergeGeometries([lever, bar]);
    lever.dispose(); bar.dispose();
    const lm = mesh(lg, steelBright);
    lm.rotation.z = 0.45;   // fork points toward the balance roller
    grp.add(lm);
    for (const sx of [-1, 1]) {
      const st = new Mesh(own(new BoxGeometry(0.35, 0.9, 0.24)), ruby);
      st.position.set(sx * 1.75, -1.05, 0);
      lm.add(st);
    }
    grp.add(mesh(cylZ(0.14, -1.0, 1.0, 8), steel));
    moveG.add(grp);
    parts.push({ obj: grp, rest: grp.position.clone(), ex: new Vector3(...PALLET.ex), spin: PALLET.spin, order: PALLET.order, kind: 'pallet' });
    wheelObjs.pallet = lm;
  }

  // Jewels and chatons: instanced, re-positioned from their bridge each frame.
  const chatonGeo = own(cylZ(0.95, 0, 0.12, 24));
  const jewelGeo = own(new SphereGeometry(0.6, 20, 10, 0, TAU, 0, Math.PI / 2));
  jewelGeo.rotateX(Math.PI / 2);
  jewelGeo.scale(1, 1, 0.45);
  const chatons = new InstancedMesh(chatonGeo, gilt, JEWELS.length);
  const jewels = new InstancedMesh(jewelGeo, ruby, JEWELS.length);
  moveG.add(chatons, jewels);
  anchors.jewel = new Object3D();
  moveG.add(anchors.jewel);

  // Screws: blued heads with a slot, instanced.
  const screwGeo = (() => {
    const head = latheZ([[0.72, 0], [0.68, 0.22], [0.45, 0.32], [0, 0.34]], 24);
    const slot = new BoxGeometry(1.6, 0.18, 0.2);
    slot.translate(0, 0, 0.32);
    const g = mergeGeometries([head.toNonIndexed(), slot.toNonIndexed()]);
    head.dispose(); slot.dispose();
    return own(g);
  })();
  const screwSlotMat = blued;
  const screws = new InstancedMesh(screwGeo, screwSlotMat, SCREWS.length);
  moveG.add(screws);

  // --------------------------------------------------------------------- dial
  const dialG = new Group();
  moveG.add(dialG);
  {
    // Body as a cylinder (edge and back), face as a circle: CircleGeometry
    // has planar UVs aligned with X/Y, which the sunburst field and the AO
    // map both rely on.
    // The body stops 0.03 mm short of the face so the two never z-fight.
    dialG.add(mesh(cylZ(CASE.dialR, 0, 0.32, seg), dialBack));
    const face = mesh(planarTangents(new CircleGeometry(CASE.dialR, seg)), dial);
    face.position.z = 0.35;
    dialG.add(face);
    // Sub-dial, recessed 0.06 mm with a concentric finish.
    const sd = mesh(planarTangents(new CircleGeometry(SUBDIAL.r, 64)), subdial);
    sd.position.set(SUBDIAL.x, SUBDIAL.y, 0.362);
    dialG.add(sd);
    const pr = mesh(new PlaneGeometry(33.2, 33.2), print);
    pr.position.z = 0.374;
    pr.renderOrder = 2;
    dialG.add(pr);
  }
  // Applied indices: 11 batons (6 o'clock gives way to the sub-dial), a
  // double baton at 12. Instanced: one draw call for all of them.
  const indexAngles = [];
  {
    const g = own(extrudeZ(roundedRect(1.05, 3.5, 0.18), 0.34, 0.17, 0.11, 4, 2));
    const slots = [];
    for (let h = 0; h < 12; h++) {
      if (h === 6) continue;
      const a = (h / 12) * TAU;
      if (h === 0) { slots.push([a, -0.95]); slots.push([a, 0.95]); }
      else slots.push([a, 0]);
      indexAngles.push(a);
    }
    const idx = new InstancedMesh(g, indexMat, slots.length);
    const o = new Object3D();
    slots.forEach(([a, off], i) => {
      const r = 12.6;
      o.position.set(Math.sin(a) * r + Math.cos(a) * off, Math.cos(a) * r - Math.sin(a) * off, 0.35);
      o.rotation.set(0, 0, -a);
      o.updateMatrix();
      idx.setMatrixAt(i, o.matrix);
    });
    dialG.add(idx);
    const ao = own(dialAOMap(indexAngles));
    dial.aoMap = ao;
    dial.aoMapIntensity = 1;
    anchors.indices = new Object3D();
    anchors.indices.position.set(Math.sin(TAU / 6) * 12.6, Math.cos(TAU / 6) * 12.6, 0.7);
    dialG.add(anchors.indices);
  }
  anchors.dial = new Object3D();
  anchors.dial.position.set(-11, -9, 0.4);
  dialG.add(anchors.dial);

  // -------------------------------------------------------------------- hands
  const handsG = new Group();
  moveG.add(handsG);
  const hour = new Group(), minute = new Group(), seconds = new Group();
  {
    const hg = mesh(dauphineGeometry(9.6, 1.75, 2.2, 0.24), handMat);
    hour.add(hg);
    hour.add(mesh(cylZ(1.05, 0, 0.32, 32), handMat));
    hour.position.z = 0.82;
    const mg = mesh(dauphineGeometry(14.1, 1.4, 2.6, 0.22), handMat);
    minute.add(mg);
    minute.add(mesh(cylZ(0.8, 0, 0.3, 32), handMat));
    minute.position.z = 1.16;
    seconds.add(mesh(extrudeZ(needleShape(3.55, 0.26, 0.9), 0.1, 0.05, 0), handMat));
    const cw = mesh(cylZ(0.4, 0, 0.1, 20), handMat);
    cw.position.y = -0.9;
    seconds.add(cw);
    seconds.add(mesh(cylZ(0.42, 0, 0.18, 24), handMat));
    seconds.position.set(SUBDIAL.x, SUBDIAL.y, 0.62);
    handsG.add(hour, minute, seconds);
    anchors.hands = new Object3D();
    anchors.hands.position.set(0, 9.5, 0.3);
    minute.add(anchors.hands);
  }

  // ------------------------------------------------------------------- straps
  const stitchU = own(strapStitchMap(78)), stitchL = own(strapStitchMap(110));
  const leatherL = own(leather.clone());
  leather.map = stitchU;
  leatherL.map = stitchL;
  leatherL.normalMap = tex.leather;
  const strapU = new Group(), strapL = new Group();
  {
    const gu = own(strapGeometry({ length: 78, dir: 1, y0: 0, z0: 0, outer: 0 }));
    const gl = own(strapGeometry({ length: 110, dir: -1, y0: 0, z0: 0, outer: 3.3, w1: 16 }));
    const mu = new Mesh(gu, leather), ml = new Mesh(gl, leatherL);
    mu.morphTargetInfluences = [0];
    ml.morphTargetInfluences = [0];
    // The strap's own origin is its spring bar, so it swings about the bar.
    mu.position.set(0, -1.6, 0);
    ml.position.set(0, 1.6, 0);
    strapU.add(mu); strapL.add(ml);
    strapU.position.set(0, CASE.springBarY, CASE.springBarZ);
    strapL.position.set(0, -CASE.springBarY, CASE.springBarZ);
    watch.add(strapU, strapL);
    strapU.userData.mesh = mu; strapL.userData.mesh = ml;
    anchors.strap = new Object3D();
    anchors.strap.position.set(8, 14, 2);
    strapL.add(anchors.strap);
  }

  // ----------------------------------------------------------------- anchors
  anchors.crown = new Object3D(); anchors.crown.position.set(3.4, 2.8, 0); crownG.add(anchors.crown);
  anchors.stem = new Object3D(); anchors.stem.position.set(-11, 0, 0); crownG.add(anchors.stem);
  anchors.balance = new Object3D(); anchors.balance.position.set(-3.6, 2.2, 0.4); wheelObjs.balance.add(anchors.balance);
  anchors.escape = new Object3D(); anchors.escape.position.set(-1.8, -1.2, 0); wheelObjs.escape.add(anchors.escape);
  anchors.pallet = new Object3D(); anchors.pallet.position.set(0, 3.8, 0); wheelObjs.pallet.add(anchors.pallet);
  anchors.barrel = new Object3D(); anchors.barrel.position.set(4.2, 2.6, 0); wheelObjs.barrel.add(anchors.barrel);
  anchors.train = new Object3D(); anchors.train.position.set(-2.4, -2.0, 0); wheelObjs.third.add(anchors.train);
  anchors.caseback = new Object3D(); anchors.caseback.position.set(-12, 12, -7.1); backG.add(anchors.caseback);

  // ---------------------------------------------------------------- update
  const o = new Object3D();
  const tmp = new Vector3();
  const colA = new Color(), colB = new Color();
  let lastModel = -1;

  function partPath(p, e, out) {
    // Quadratic Bezier from rest to rest+ex. The control point bulges
    // outward from the movement axis, so each part leaves on its own arc
    // instead of a straight line along the axis.
    const ex = p.ex;
    const radial = tmp.set(p.rest.x + ex.x * 0.5, p.rest.y + ex.y * 0.5, 0);
    const rl = radial.length() || 1;
    const bulge = 0.22 * ex.length();
    const cx = p.rest.x + ex.x * 0.5 + (radial.x / rl) * bulge;
    const cy = p.rest.y + ex.y * 0.5 + (radial.y / rl) * bulge;
    const cz = p.rest.z + ex.z * 0.55;
    const a = (1 - e) * (1 - e), b = 2 * (1 - e) * e, c = e * e;
    out.set(
      a * p.rest.x + b * cx + c * (p.rest.x + ex.x),
      a * p.rest.y + b * cy + c * (p.rest.y + ex.y),
      a * p.rest.z + b * cz + c * (p.rest.z + ex.z),
    );
    return out;
  }

  function applyModel(mix) {
    const i = Math.min(MODELS.length - 2, Math.floor(mix));
    const f = MathUtils.clamp(mix - i, 0, 1);
    const A = MODELS[i], B = MODELS[Math.min(i + 1, MODELS.length - 1)];
    const k = Math.round(mix * 1000);
    if (k === lastModel) return;
    lastModel = k;
    // Colours blend in linear space (Color.lerp works on linear values), so
    // the morph passes through physically plausible intermediate finishes.
    dial.color.copy(colA.set(A.dial)).lerp(colB.set(B.dial), f);
    subdial.color.copy(colA.set(A.subdial)).lerp(colB.set(B.subdial), f);
    print.color.copy(colA.set(A.print)).lerp(colB.set(B.print), f);
    handMat.color.copy(colA.set(A.hands)).lerp(colB.set(B.hands), f);
    indexMat.color.copy(handMat.color);
    leather.color.copy(colA.set(A.strap)).lerp(colB.set(B.strap), f);
    leatherL.color.copy(leather.color);
    dial.metalness = lerp(A.dialMetal, B.dialMetal, f);
    subdial.metalness = dial.metalness;
    if (dial.anisotropy !== undefined) dial.anisotropy = Math.max(0.05, lerp(A.aniso, B.aniso, f));
    // Blued hands are less metallic-white; ease roughness a touch for them.
    const blue = (A.hands === '#2c4796' ? 1 - f : 0) + (B.hands === '#2c4796' ? f : 0);
    handMat.roughness = indexMat.roughness = 0.07 + blue * 0.08;
  }

  function update(S, tSec) {
    // Watch pose.
    watch.rotation.set(S.rx, S.ry, S.rz);

    // Crown: unscrew (three turns, 2.4 mm out), draw the stem, then park.
    const cx = 21.4 + S.crownTurn * 2.4 + S.crownOut * 17;
    crownG.position.set(cx, 0, CASE.crownZ);
    crownG.rotation.set(-S.crownTurn * TAU * 3, 0, 0);
    if (S.crownPark > 0) {
      const e = S.crownPark;
      crownG.position.lerp(tmp.set(46, 34, -14), e);
      crownG.rotation.y = e * 0.9;
      crownG.rotation.z = e * 0.5;
    }

    // Caseback: unscrew a third of a turn while backing off, then fly clear.
    backG.position.set(0, 0, -S.backTurn * 3.2);
    backG.rotation.set(0, 0, -S.backTurn * 1.9);
    if (S.backOff > 0) {
      const e = S.backOff;
      backG.position.set(lerp(0, -80, e), lerp(0, 46, e), lerp(-3.2, 2, e) - Math.sin(e * Math.PI) * 14);
      backG.rotation.x = e * 0.9;
      backG.rotation.y = -e * 0.5;
    }
    backG.visible = S.backOff < 0.995;
    crownG.visible = S.crownPark < 0.995;

    // Case leaves sideways on an arc, so it never sits between the camera
    // and the movement in any later view.
    const ce = S.caseOff;
    caseG.position.set(lerp(0, -60, ce), lerp(0, -150, ce) - Math.sin(ce * Math.PI) * 6, lerp(0, 60, ce) + Math.sin(ce * Math.PI) * 14);
    caseG.rotation.set(ce * 0.35, -ce * 0.6, ce * 0.2);
    // Parts set aside are hidden once they are fully off the bench, so they
    // never clutter a later camera angle.
    caseG.visible = ce < 0.995;

    // Movement lifts out through the back.
    moveG.position.set(0, 0, -S.lift * 18);

    // Movement explosion with staggered departure.
    for (const p of parts) {
      const e = staggered(S.explode, p.order);
      partPath(p, e, p.obj.position);
      if (p.kind === 'bridge') {
        p.obj.rotation.x = e * p.tilt;
      }
    }

    // Live train: balance at 3 Hz, escapement stepping six times a second,
    // seconds on the fourth wheel, minutes on the centre wheel.
    const mum = S.clock ?? mumbaiSeconds();
    const beat = Math.floor(tSec * 6), bf = tSec * 6 - beat;
    const stepEase = sstep(0, 0.16, bf);
    const secStep = (Math.floor(mum * 6) + stepEase) / 6;   // seconds, stepped at 6 beats/s
    const secA = -((secStep % 60) / 60) * TAU;
    const minA = -((mum / 60) % 60 / 60) * TAU;
    const hrA = -((mum / 3600) % 12 / 12) * TAU;
    const spinOf = (id) => staggered(S.explode, WHEELS.find((w) => w.id === id).order) * WHEELS.find((w) => w.id === id).spin * TAU;
    wheelObjs.fourth.rotation.z = secA + spinOf('fourth');
    wheelObjs.center.rotation.z = minA + spinOf('center');
    wheelObjs.third.rotation.z = -secA / 7.5 + spinOf('third');
    wheelObjs.escape.rotation.z = (beat + stepEase) * (TAU / 30) + spinOf('escape');
    wheelObjs.barrel.rotation.z = -minA / 6 + spinOf('barrel');
    wheelObjs.ratchet.rotation.z = spinOf('ratchet');
    wheelObjs.crownwheel.rotation.z = spinOf('crownwheel') + S.crownTurn * TAU * 1.5;
    const bal = Math.sin(tSec * TAU * 3) * 4.3;
    wheelObjs.balance.rotation.z = bal + spinOf('balance');
    // The hairspring breathes with the balance: coils open on one swing and
    // close on the other.
    const breathe = 1 + Math.sin(tSec * TAU * 3) * 0.035;
    wheelObjs.hairspring.scale.set(breathe, breathe, 1);
    wheelObjs.pallet.rotation.z = 0.45 + Math.sign(Math.sin(tSec * TAU * 3)) * 0.09 * sstep(0, 0.3, Math.abs(Math.sin(tSec * TAU * 3)));

    // Jewels follow their bridges.
    JEWELS.forEach((j, i) => {
      const b = bridgeObjs[j.bridge];
      const off = b.grp.position;
      // Back face of the bridge (the side seen through the caseback).
      const z = b.def.z - b.def.t / 2;
      const sc = j.big ? 1.25 : 1;
      o.position.set(j.x + off.x, j.y + off.y, z + off.z);
      o.rotation.set(Math.PI, 0, 0);
      o.scale.set(sc, sc, sc);
      o.updateMatrix();
      chatons.setMatrixAt(i, o.matrix);
      o.position.z -= 0.08;
      o.updateMatrix();
      jewels.setMatrixAt(i, o.matrix);
      if (i === 1) anchors.jewel.position.copy(o.position);
    });
    chatons.instanceMatrix.needsUpdate = true;
    jewels.instanceMatrix.needsUpdate = true;

    // Screws unscrew (two turns) and lift away before their bridge moves.
    SCREWS.forEach((s, i) => {
      const host = bridgeObjs[s.on] ? bridgeObjs[s.on] : null;
      let base, hostZ;
      if (host) { base = host.grp.position; hostZ = host.def.z - host.def.t / 2; }
      else {
        const w = wheelObjs[s.on];
        const wd = WHEELS.find((q) => q.id === s.on);
        base = tmp.set(w.position.x - wd.x, w.position.y - wd.y, w.position.z - wd.z);
        hostZ = wd.z - wd.t / 2;
      }
      const e = staggered(S.explode, 0);
      const sc = s.big ? 1.5 : 1;
      o.position.set(s.x + base.x, s.y + base.y, hostZ + base.z - e * 7);
      o.rotation.set(Math.PI, 0, -e * TAU * 2 + i);
      o.scale.set(sc, sc, sc);
      o.updateMatrix();
      screws.setMatrixAt(i, o.matrix);
    });
    screws.instanceMatrix.needsUpdate = true;

    // Dial falls away: drops and tips toward the viewer; it also lifts a few
    // millimetres off the plate during the explosion.
    const de = S.dialOff;
    const dz = staggered(S.explode, 5) * 3.5;
    dialG.position.set(DIAL_FALL.pos[0] * de, DIAL_FALL.pos[1] * de, DIAL_FALL.pos[2] * de + dz);
    dialG.rotation.set(DIAL_FALL.rot[0] * de, DIAL_FALL.rot[1] * de, DIAL_FALL.rot[2] * de);

    // Hands: time of day, then float clear of the dial in the dial stage.
    hour.rotation.z = hrA;
    minute.rotation.z = minA;
    seconds.rotation.z = secA;
    const he = S.handsOff;
    const hands = [hour, minute, seconds];
    HANDS_FLOAT.forEach((hf, i) => {
      const e = sstep(i * 0.12, 0.76 + i * 0.12, he);
      const h = hands[i];
      const baseZ = [0.82, 1.16, 0.62][i] + dz;
      const bx = i === 2 ? SUBDIAL.x : 0, by = i === 2 ? SUBDIAL.y : 0;
      h.position.set(bx + hf.pos[0] * e, by + hf.pos[1] * e, baseZ + hf.pos[2] * e);
    });

    // Straps: swing open about the spring bar, uncurl and drift clear.
    const su = S.strapOff;
    const eu = sstep(0, 0.85, su), el = sstep(0.15, 1, su);
    // strapFlat lays the straps out straight without detaching them, for
    // the caseback view.
    strapU.userData.mesh.morphTargetInfluences[0] = Math.max(eu, S.strapFlat);
    strapL.userData.mesh.morphTargetInfluences[0] = Math.max(el, S.strapFlat);
    strapU.position.set(lerp(0, -40, eu), lerp(CASE.springBarY, 100, eu), lerp(CASE.springBarZ, 20, eu) + Math.sin(eu * Math.PI) * 10);
    strapU.rotation.set(-eu * 0.5, eu * 0.4, eu * 0.9);
    strapL.position.set(lerp(0, 40, el), lerp(-CASE.springBarY, -104, el), lerp(CASE.springBarZ, 20, el) + Math.sin(el * Math.PI) * 10);
    strapL.rotation.set(el * 0.5, -el * 0.4, el * 1.1);

    applyModel(S.model);
  }

  function dispose() {
    disposables.forEach((d) => d.dispose && d.dispose());
    chatons.dispose(); jewels.dispose(); screws.dispose();
  }

  return { root, watch, update, anchors, dispose, groups: { caseG, crownG, backG, moveG, dialG, handsG, strapU, strapL } };
}

// Mirroring a geometry with a negative scale flips its triangles inside out.
// Swap two vertices of every triangle; the normals were already mirrored
// correctly by applyMatrix4, so they are kept, not recomputed (recomputing
// on non-indexed geometry would facet it).
function flipWinding(g) {
  for (const name of ['position', 'normal', 'uv']) {
    const attr = g.getAttribute(name);
    if (!attr) continue;
    const s = attr.itemSize, arr = attr.array;
    for (let i = 0; i < arr.length; i += s * 3) {
      for (let k = 0; k < s; k++) {
        const t = arr[i + s + k]; arr[i + s + k] = arr[i + 2 * s + k]; arr[i + 2 * s + k] = t;
      }
    }
    attr.needsUpdate = true;
  }
}

// Explicit tangents for flat discs with planar UVs: tangent along +X,
// bitangent along +Y. Without them three.js derives the tangent frame from
// screen-space derivatives, which is noisy on minified anisotropic surfaces
// and showed as radial streaks across the sunburst.
function planarTangents(g) {
  const n = g.getAttribute('position').count;
  const t = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { t[i * 4] = 1; t[i * 4 + 3] = 1; }
  g.setAttribute('tangent', new BufferAttribute(t, 4));
  return g;
}
