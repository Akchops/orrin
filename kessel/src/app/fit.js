// Fitting a lens to its box. A lens is fitted by its bounding sphere, so
// it stays whole however it turns: the camera stands where the sphere's
// silhouette fills the tighter of the box's two half-angles (vertical, or
// horizontal from the box's aspect), with a margin.
const DEG = Math.PI / 180;

// Distance from the sphere's centre for a sphere of radius r to fit a box
// whose half-angles have tangents tv (vertical) and th (horizontal).
export function sphereDistance(r, tv, th, margin = 1.06) {
  return (r * margin) / Math.sin(Math.atan(Math.min(tv, th)));
}

// The three lenses' bounding spheres in lens space, hood to mount and
// collar included: the centre of each shape's visible box and its farthest
// vertex, as the lens viewer measures them on the built model
// (viewer.js el.__lensSphere). Between shapes, as the film morphs, linear
// in the model channel.
export const MODEL_SPHERE = [
  { c: [0, 0, -31.01], r: 67.07 },
  { c: [0, 0, -48.99], r: 62.66 },
  { c: [0, -2.28, -50.9], r: 106.04 },
];
export function sphereAt(m) {
  const i = Math.max(0, Math.min(1, Math.floor(m))), f = Math.max(0, Math.min(1, m - i));
  const a = MODEL_SPHERE[i], b = MODEL_SPHERE[i + 1];
  return { c: a.c.map((v, j) => v + (b.c[j] - v) * f), r: a.r + (b.r - a.r) * f };
}

// The film's orbit camera (stage3d.js, tier2.js) with the lens fitted to a
// stage box on the screen (box: a DOMRect in a W x H viewport): the frame
// that puts its sphere inside the box, the view offset that centres it
// there, and the sphere's centre as the target. w blends it in (0..1).
export function fitToBox(S, box, W, H, w = 1) {
  if (!box || box.width < 20 || box.height < 20 || w <= 0) return;
  const sph = sphereAt(S.model);
  const tan = Math.tan((S.fov * DEG) / 2), aspect = W / H;
  const dist = sphereDistance(sph.r, tan * (box.height / H), tan * aspect * (box.width / W));
  const frame = dist * Math.min(tan, tan * aspect);
  const sx = (box.left + box.width / 2 - W / 2) / W;
  const sy = -(box.top + box.height / 2 - H / 2) / H;
  const mix = (a, b) => a + (b - a) * w;
  S.frame = mix(S.frame, frame); S.sx = mix(S.sx, sx); S.sy = mix(S.sy, sy);
  S.tx = mix(S.tx, sph.c[0]); S.ty = mix(S.ty, sph.c[1]); S.tz = mix(S.tz, sph.c[2]);
}

// The visible meshes' box of an object (hidden light windows and glows left
// out), and the distance from point c to the farthest vertex inside it.
export function visibleBox(T, root) {
  const box = new T.Box3(), tmp = new T.Box3();
  root.updateWorldMatrix(true, true);
  root.traverseVisible((o) => {
    if (!o.isMesh || !o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    box.union(tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld));
  });
  return box;
}
export function farthest(T, root, c) {
  const v = new T.Vector3();
  let r = 0;
  root.updateWorldMatrix(true, true);
  root.traverseVisible((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const a = o.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) { v.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld); r = Math.max(r, v.distanceTo(c)); }
  });
  return r;
}
// The half-size frame (stills.js, story.js) that holds a sphere of radius r
// whole in a landscape picture: the vertical half-angle binds.
export const sphereFrame = (r, fov = 26, margin = 1.06) => (r * margin) / Math.cos((fov / 2) * DEG);
