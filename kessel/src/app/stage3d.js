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
  let dprCap = quality === 'high' ? 2 : quality === 'medium' ? 1.5 : 1;
  let dpr = Math.min(window.devicePixelRatio || 1, dprCap);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.NeutralToneMapping;
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

  const textures = { scale: scaleTexture(T, font), front: frontRingTexture(T, font), rear: rearBarrelTexture(T, font) };
  const lens = buildLens(T, L, { quality, textures });
  scene.add(lens.root);

  const camera = new T.PerspectiveCamera(26, 1, 0.5, 4000);
  let W = 1, H = 1;
  function resize() {
    W = Math.max(1, container.clientWidth); H = Math.max(1, container.clientHeight);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  resize();

  let lost = false;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; onContextLost && onContextLost(); });

  const orbitPos = new T.Vector3(), orbitTgt = new T.Vector3(), axisPos = new T.Vector3(), axisTgt = new T.Vector3();
  const target = new T.Vector3(), tmp = new T.Vector3();

  function render(S, tSec, pointer) {
    if (lost) return;
    lens.update(S, tSec);
    lens.lens.rotation.set(S.rx, S.ry, 0);
    // Pointer: a small tilt of the lens and a larger turn of the environment,
    // so reflections slide over the metal and across the coated glass.
    const inside = S.inside;
    lens.root.rotation.set(pointer.y * 0.12 * (1 - inside), (pointer.x * 0.18 + pointer.spin) * (1 - inside), 0);
    scene.environmentRotation.set(pointer.y * 0.3, pointer.x * 0.7 + pointer.spin * 0.5, 0);
    key.position.set(40 + pointer.x * 90, 70 - pointer.y * 60, 120);

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
    camera.lookAt(target);
    camera.setViewOffset(W, H, -S.sx * W, S.sy * H, W, H);
    camera.updateProjectionMatrix();

    lamp.position.copy(camera.position);
    lamp.intensity = 7000 * inside;

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
    renderer.render(scene, camera);
  }

  const v = new T.Vector3();
  function project(name) {
    if (name === '__target') v.copy(target);
    else { const a = lens.anchors[name]; if (!a) return null; a.getWorldPosition(v); }
    v.project(camera);
    return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, visible: v.z > -1 && v.z < 1 };
  }

  function setDPR(n) { dpr = Math.max(0.75, Math.min(n, dprCap)); renderer.setPixelRatio(dpr); resize(); return dpr; }

  async function warm(S) {
    lens.update(S, 0);
    camera.position.set(0, 0, 300); camera.lookAt(0, 0, 0);
    if (renderer.extensions.has('KHR_parallel_shader_compile')) await renderer.compileAsync(scene, camera);
    else renderer.compile(scene, camera);
  }

  function destroy() {
    lens.dispose(); env.dispose(); Object.values(textures).forEach((t) => t.dispose());
    renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
  }

  return { canvas, kind: '3d', render, resize, project, setDPR, getDPR: () => dpr, warm, destroy };
}
