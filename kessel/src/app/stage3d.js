// Tier 1: the real-time lens. Created only after the capability probe
// passes. Camera model: an orbit around a target for the outside views,
// blended (by S.inside) into a camera on the optical axis for the trip
// through the barrel, with its own yaw so it can turn round at the back.
import { buildEnvironment } from './env.js';
import { buildLens } from './lens.js';
import { scaleTexture, frontRingTexture, rearBarrelTexture } from './textures.js';

const DEG = Math.PI / 180;

export function mountWebGL(T, L, container, caps, { font, onContextLost }) {
  const quality = caps.tier;
  const renderer = new T.WebGLRenderer({
    antialias: quality !== 'low', alpha: true, powerPreference: 'high-performance',
    preserveDrawingBuffer: !!caps.preserve,
  });
  // Quality ladder, best first. Desktops start on the first rung, phones
  // (medium) on the second, a rebuilt context (low) on the fifth. When frames
  // are missed the watchdog in live.js steps down one rung at a time: less
  // resolution first, then the per-pixel extras; the 2D tier comes only
  // after the last rung.
  const LADDER = [
    { dpr: 2, fx: true }, { dpr: 1.5, fx: true }, { dpr: 1.25, fx: true }, { dpr: 1, fx: true },
    { dpr: 1, fx: false }, { dpr: 0.8, fx: false }, { dpr: 0.65, fx: false },
  ];
  const deviceDPR = window.devicePixelRatio || 1;
  const dprOf = (r) => (r.dpr < 1 ? r.dpr : Math.min(deviceDPR, r.dpr));
  let rung = quality === 'high' ? 0 : quality === 'medium' ? 1 : 4;
  let dpr = dprOf(LADDER[rung]);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.NeutralToneMapping;
  // A brighter studio than the first cut, which read as too dark.
  renderer.toneMappingExposure = 1.22;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new T.Scene();
  const env = buildEnvironment(T, renderer, quality === 'high' ? 512 : 256);
  scene.environment = env.texture;

  // A key light that follows the pointer, so highlights visibly move across
  // the anodised barrel with the user's hand.
  const key = new T.DirectionalLight(0xfff3e6, 1.4);
  scene.add(key, key.target);
  // Inside the barrel: a soft lamp travelling with the camera, so the baffle
  // rings and element edges read as they rush past. Off outside.
  const lamp = new T.PointLight(0xfff0e0, 0, 140, 2);
  scene.add(lamp);
  // Teardown light: a cool rim from behind and above, and a stronger key,
  // so dark anodised parts separate from the dark page. Off in the film.
  const rim = new T.DirectionalLight(0xdfe6ff, 0);
  rim.position.set(-140, 120, -160);
  scene.add(rim, rim.target);

  // Teardown fill: a warm rim from below on the other side, so the lower
  // edges of the parts separate from the page as well as the upper ones.
  const rim2 = new T.DirectionalLight(0xffe2c4, 0);
  rim2.position.set(150, -90, -60);
  scene.add(rim2, rim2.target);

  const textures = { scale: scaleTexture(T, font), front: frontRingTexture(T, font, quality === 'high' ? 2048 : 1024), rear: rearBarrelTexture(T, font) };
  const lens = buildLens(T, L, { quality, textures });
  scene.add(lens.root);
  if (!LADDER[rung].fx) lens.setEffects(false);

  const camera = new T.PerspectiveCamera(26, 1, 0.5, 4000);
  let W = 1, H = 1;
  function resize() {
    W = Math.max(1, container.clientWidth); H = Math.max(1, container.clientHeight);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    if (dof.rt) { dof.rt.dispose(); dof.rt.depthTexture.dispose(); dof.rt = null; }
  }

  // ------------------------------------------------------- depth of field
  // Teardown close-ups (S.dof > 0): the scene is drawn into a half-float
  // target with a depth texture, then one full-screen pass blurs each pixel
  // by its distance from the focus plane (the part the camera aims at), so
  // the part is sharp and the rest goes soft. Only on rungs with the
  // per-pixel extras; the watchdog steps it off with them.
  const dof = { rt: null };
  const dofMat = new T.ShaderMaterial({
    uniforms: {
      tColor: { value: null }, tDepth: { value: null }, uTexel: { value: new T.Vector2() },
      uFocus: { value: 100 }, uRange: { value: 40 }, uMaxBlur: { value: 8 }, uAmount: { value: 0 },
      cameraNear: { value: camera.near }, cameraFar: { value: camera.far },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `#include <packing>
      uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 uTexel;
      uniform float uFocus, uRange, uMaxBlur, uAmount, cameraNear, cameraFar;
      varying vec2 vUv;
      // Blur radius in pixels at uv: grows with the distance of the surface
      // from the focus plane, up to uMaxBlur.
      float coc(vec2 uv) {
        float z = -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cameraNear, cameraFar);
        return clamp(abs(z - uFocus) / uRange, 0.0, 1.0) * uMaxBlur * uAmount;
      }
      void main() {
        float r0 = coc(vUv);
        vec4 acc = texture2D(tColor, vUv); float wsum = 1.0;
        // 24 taps on a golden-angle disc of radius r0. A tap counts only if
        // its own blur reaches this pixel, so a sharp part never smears
        // into the soft background around it.
        for (int i = 0; i < 24; i++) {
          float fi = float(i) + 0.5, rr = sqrt(fi / 24.0), th = fi * 2.39996;
          vec2 uv = vUv + vec2(cos(th), sin(th)) * rr * r0 * uTexel;
          float w = clamp(coc(uv) - rr * r0 + 1.0, 0.0, 1.0);
          acc += texture2D(tColor, uv) * w; wsum += w;
        }
        vec4 c = acc / wsum;
        // The target holds premultiplied, linear light: tone map and encode
        // the colour, then premultiply again for the canvas.
        gl_FragColor = vec4(c.a > 1e-4 ? c.rgb / c.a : vec3(0.0), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor = vec4(gl_FragColor.rgb * c.a, c.a);
      }`,
    depthTest: false, depthWrite: false, blending: T.NoBlending,
  });
  const dofScene = new T.Scene(), dofCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const dofQuad = new T.Mesh(new T.PlaneGeometry(2, 2), dofMat);
  dofQuad.frustumCulled = false;
  dofScene.add(dofQuad);
  function dofTarget() {
    if (dof.rt) return dof.rt;
    const w = Math.max(1, Math.floor(W * dpr)), h = Math.max(1, Math.floor(H * dpr));
    dof.rt = new T.WebGLRenderTarget(w, h, { type: T.HalfFloatType, depthTexture: new T.DepthTexture(w, h) });
    dofMat.uniforms.tColor.value = dof.rt.texture;
    dofMat.uniforms.tDepth.value = dof.rt.depthTexture;
    dofMat.uniforms.uTexel.value.set(1 / w, 1 / h);
    return dof.rt;
  }
  resize();

  let lost = false;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; onContextLost && onContextLost(); });

  const orbitPos = new T.Vector3(), orbitTgt = new T.Vector3(), axisPos = new T.Vector3(), axisTgt = new T.Vector3();
  const target = new T.Vector3(), tmp = new T.Vector3(), fwd = new T.Vector3();

  function render(S, tSec, pointer) {
    if (lost) return;
    lens.update(S, tSec);
    lens.lens.rotation.set(S.rx, S.ry, 0);
    // Pointer: a small tilt of the lens and a larger turn of the environment,
    // so reflections slide over the metal and across the coated glass.
    const inside = S.inside;
    // The tilt fades out in a teardown close-up (pointer.tilt), so the part
    // stays where the camera aims and its caption card beside it.
    const tilt = (1 - inside) * (pointer.tilt ?? 1);
    // pointer.drag: the tilt from a mouse drag, on top of the hover tilt.
    lens.root.rotation.set((pointer.y * 0.12 + (pointer.drag || 0)) * tilt, (pointer.x * 0.18 + pointer.spin) * tilt, 0);
    scene.environmentRotation.set(pointer.y * 0.3, pointer.x * 0.7 + pointer.spin * 0.5, 0);
    key.position.set(40 + pointer.x * 90, 70 - pointer.y * 60, 120);
    const tl = S.tlight || 0;
    // A soft rim stays on through the film so the barrel's edges separate
    // from the charcoal page; the teardown light strengthens all three.
    key.intensity = 2.0 + 1.5 * tl;
    rim.intensity = 0.9 + 2.6 * tl;
    rim2.intensity = 0.35 + 1.2 * tl;
    // The studio reflections come up too, so no part sinks into the page.
    scene.environmentIntensity = 1.3 + 0.4 * tl;

    // Orbit camera: `frame` is the half-size in mm that must fit the smaller
    // viewport side, so phone and desktop show the same composition.
    camera.fov = S.fov;
    const tanV = Math.tan((S.fov * DEG) / 2);
    const fit = Math.min(tanV, tanV * camera.aspect);
    const dist = S.frame / fit;
    orbitTgt.set(S.tx, S.ty, S.tz);
    orbitPos.set(
      S.tx + dist * Math.sin(S.az * DEG) * Math.cos(S.el * DEG),
      S.ty + dist * Math.sin(S.el * DEG),
      S.tz + dist * Math.cos(S.az * DEG) * Math.cos(S.el * DEG),
    );
    // Axis camera: on the optical axis at z = cz, looking down the barrel
    // (yaw 0) or back toward the lens (yaw 180).
    axisPos.set(0, 0, S.cz);
    axisTgt.set(Math.sin(S.yaw * DEG) * -60, 0, S.cz - Math.cos(S.yaw * DEG) * 60);
    camera.position.lerpVectors(orbitPos, axisPos, inside);
    target.lerpVectors(orbitTgt, axisTgt, inside);
    camera.up.set(Math.sin(S.roll * DEG), Math.cos(S.roll * DEG), 0);
    // Orbit roll (teardown on phones): turn the picture about the view
    // direction, so the exploded lens can run down a portrait screen.
    if (S.oroll) camera.up.applyAxisAngle(fwd.subVectors(target, camera.position).normalize(), -S.oroll * DEG);
    camera.lookAt(target);
    camera.setViewOffset(W, H, -S.sx * W, S.sy * H, W, H);
    camera.updateProjectionMatrix();

    lamp.position.copy(camera.position);
    lamp.intensity = 7000 * inside;

    // Photosite grid: only when the sensor fills the frame, faded in by its
    // size on screen, so it never turns into moire at a distance.
    if (lens.sensor.visible && S.sensor > 0.01) {
      lens.sensor.getWorldPosition(tmp);
      const h = 2 * camera.position.distanceTo(tmp) * Math.tan((S.fov * DEG) / 2);
      const fill = Math.max(24 / h, 36 / (h * camera.aspect));
      const k = Math.min(1, Math.max(0, (fill - 0.7) / 0.4));
      lens.sensorGrid.opacity = 0.32 * S.sensor * k * k * (3 - 2 * k);
    } else lens.sensorGrid.opacity = 0;

    // The window behind the lens is only ever seen through the glass: shown
    // when the camera is close to the optical axis and still in front of the
    // iris, hidden in side views and once the camera has passed the iris.
    lens.anchors.iris.getWorldPosition(tmp);
    const irisZ = tmp.z;
    const toCamL = camera.position.clone().sub(lens.lightDisc.getWorldPosition(tmp)).normalize();
    const onAxis = Math.min(1, Math.max(0, (toCamL.z - 0.9985) / 0.001));
    const before = Math.min(1, Math.max(0, (camera.position.z - irisZ) / 12));
    lens.lightDisc.material.opacity *= onAxis * before;
    lens.lightDisc.visible = lens.lightDisc.material.opacity > 0.002;

    // The bloom sprite draws over everything, so it is faded out whenever
    // the camera is not looking into the front of the lens, and close up.
    lens.glow.getWorldPosition(tmp);
    const toCam = camera.position.clone().sub(tmp);
    const d = toCam.length();
    const facing = Math.max(0, toCam.normalize().z);
    lens.glow.material.opacity *= Math.pow(facing, 3) * Math.min(1, Math.max(0, (d - 20) / 120));
    if ((S.dof || 0) > 0.01 && LADDER[rung].fx) {
      const rt = dofTarget();
      renderer.setRenderTarget(rt);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      const u = dofMat.uniforms;
      u.uFocus.value = camera.position.distanceTo(target);
      u.uRange.value = (S.dofR || 40) * 1.4;
      u.uMaxBlur.value = 7 * dpr;
      u.uAmount.value = S.dof;
      renderer.render(dofScene, dofCam);
    } else renderer.render(scene, camera);
  }

  const v = new T.Vector3();
  function project(name) {
    if (name === '__target') v.copy(target);
    else { const a = lens.anchors[name]; if (!a) return null; a.getWorldPosition(v); }
    v.project(camera);
    return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, visible: v.z > -1 && v.z < 1 };
  }

  // One rung down the ladder, skipping rungs that change nothing on this
  // screen. Returns a description of the new rung, or null at the bottom.
  function stepDown() {
    const cur = LADDER[rung];
    for (let r = rung + 1; r < LADDER.length; r++) {
      const n = LADDER[r];
      if (dprOf(n) === dpr && n.fx === cur.fx) continue;
      rung = r;
      if (n.fx !== cur.fx) lens.setEffects(n.fx);
      dpr = dprOf(n);
      renderer.setPixelRatio(dpr);
      resize();
      return quality_();
    }
    return null;
  }
  const quality_ = () => ({ rung, dpr, fx: LADDER[rung].fx, reduced: rung > (quality === 'high' ? 0 : quality === 'medium' ? 1 : 4) });

  // Which part is under a point on screen (CSS px), for tapping the
  // teardown: the nearest hit wins.
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  function pick(x, y) {
    if (lost) return null;
    ndc.set((x / W) * 2 - 1, -(y / H) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(lens.pickables, false)[0];
    return hit ? hit.object.userData.part : null;
  }

  async function warm(S) {
    lens.update(S, 0);
    camera.position.set(0, 0, 300); camera.lookAt(0, 0, 0);
    if (renderer.extensions.has('KHR_parallel_shader_compile')) await renderer.compileAsync(scene, camera);
    else renderer.compile(scene, camera);
  }

  function destroy() {
    if (dof.rt) { dof.rt.dispose(); dof.rt.depthTexture.dispose(); }
    dofMat.dispose(); dofQuad.geometry.dispose();
    lens.dispose(); env.dispose(); Object.values(textures).forEach((t) => t.dispose());
    renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
  }

  return { canvas, kind: '3d', render, resize, project, pick, stepDown, quality: quality_, getDPR: () => dpr, warm, destroy };
}
