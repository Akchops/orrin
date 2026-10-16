// Tier 1: the real-time WebGL watch. Mounted only after the capability probe
// passes; the still image beneath stays in the DOM as tier 3.
import {
  WebGLRenderer, Scene, PerspectiveCamera, DirectionalLight, NeutralToneMapping,
  SRGBColorSpace, Vector3, Color, MathUtils,
} from 'three';
import { buildEnvironment } from './env.js';
import { buildWatch } from './watch3d.js';

const DEG = Math.PI / 180;

export function mountWebGL(container, caps, { fontFamily, onContextLost } = {}) {
  const quality = caps.tier;           // 'high' | 'medium' | 'low'
  const renderer = new WebGLRenderer({
    antialias: quality !== 'low',
    alpha: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: !!caps.preserve,   // stills capture only
  });
  // 3x DPR costs 2.25x the fill rate of 2x for nothing visible on a watch
  // this size; 'medium' (most phones) stops at 1.5.
  let dprCap = quality === 'high' ? 2 : quality === 'medium' ? 1.5 : 1;
  let dpr = Math.min(window.devicePixelRatio || 1, dprCap);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  // Khronos PBR Neutral: keeps dial colours true while still rolling off
  // the very bright specular glints instead of clipping them.
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;

  const canvas = renderer.domElement;
  canvas.className = 'stage__gl';
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new Scene();
  const env = buildEnvironment(renderer, { size: quality === 'high' ? 512 : 256 });
  scene.environment = env.texture;
  scene.environmentIntensity = 1;

  // One key light on top of the environment: it follows the pointer, so the
  // highlight on the case and hands visibly moves with the user's hand.
  const key = new DirectionalLight(0xfff1e0, 1.6);
  key.position.set(30, 60, 80);
  scene.add(key, key.target);

  const camera = new PerspectiveCamera(26, 1, 2, 2000);
  const watch = buildWatch({ quality, fontFamily });
  scene.add(watch.root);

  let W = 1, H = 1;
  function resize() {
    W = Math.max(1, container.clientWidth);
    H = Math.max(1, container.clientHeight);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  resize();

  const warmKey = new Color(0xffc48a), coolKey = new Color(0xfff1e0), keyCol = new Color();
  const target = new Vector3();
  let lost = false;

  canvas.addEventListener('webglcontextlost', (e) => {
    // Without preventDefault the context can never be restored.
    e.preventDefault();
    lost = true;
    onContextLost && onContextLost();
  }, false);

  function render(S, tSec, pointer) {
    if (lost) return;
    watch.update(S, tSec);

    // Pointer: a conservative tilt of the whole watch plus a larger turn of
    // the environment, so reflections slide across polished steel the way
    // they do when a real watch is tipped under a lamp.
    watch.root.rotation.set(pointer.y * 0.14, pointer.x * 0.2 + pointer.spin, 0);
    scene.environmentRotation.set(pointer.y * 0.25, pointer.x * 0.65 + pointer.spin * 0.5, 0);
    key.position.set(30 + pointer.x * 70, 60 - pointer.y * 50, 80);
    keyCol.copy(coolKey).lerp(warmKey, S.warm);
    key.color.copy(keyCol);
    key.intensity = 1.6 + S.warm * 0.6;

    // Camera on a sphere around the target. `frame` is the half-size in mm
    // that must fit the smaller viewport dimension, so the composition holds
    // from a 320 px phone to a 1920 px desktop without per-device tuning.
    const tanV = Math.tan((camera.fov * DEG) / 2);
    const fit = Math.min(tanV, tanV * camera.aspect);
    const dist = S.frame / fit;
    const az = S.az * DEG, el = S.el * DEG;
    target.set(S.tx, S.ty, S.tz);
    camera.position.set(
      target.x + dist * Math.sin(az) * Math.cos(el),
      target.y + dist * Math.sin(el),
      target.z + dist * Math.cos(az) * Math.cos(el),
    );
    camera.lookAt(target);
    // Lens shift rather than re-aiming: moves the subject in the frame
    // without changing perspective.
    camera.setViewOffset(W, H, -S.sx * W, S.sy * H, W, H);
    renderer.render(scene, camera);
  }

  const v = new Vector3();
  function project(name) {
    if (name === '__target') v.copy(target);
    else {
      const a = watch.anchors[name];
      if (!a) return null;
      a.getWorldPosition(v);
    }
    v.project(camera);
    return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, visible: v.z < 1 && v.z > -1 };
  }

  function setDPR(next) {
    dpr = Math.max(0.75, Math.min(next, dprCap));
    renderer.setPixelRatio(dpr);
    resize();
    return dpr;
  }

  async function warm(S) {
    // Compile every program before the first visible frame, so scrolling
    // into a new material never stalls on shader compilation.
    watch.update(S, 0);
    camera.position.set(0, 0, 200);
    camera.lookAt(0, 0, 0);
    // compileAsync needs KHR_parallel_shader_compile and warns without it;
    // the synchronous compile does the same job quietly.
    if (renderer.extensions.has('KHR_parallel_shader_compile')) await renderer.compileAsync(scene, camera);
    else renderer.compile(scene, camera);
  }

  function destroy() {
    watch.dispose();
    env.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }

  return { canvas, render, resize, project, setDPR, getDPR: () => dpr, warm, destroy, renderer, scene, watch, kind: 'webgl' };
}
