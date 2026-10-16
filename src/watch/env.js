// A photographic studio, built in code and baked into a PMREM environment.
// Polished steel is only as convincing as what it reflects: a dark room with
// a few hard-edged softboxes gives the long, high-contrast highlights that
// read as steel rather than chrome-plated plastic.
import {
  Scene, Mesh, PlaneGeometry, SphereGeometry, MeshBasicMaterial,
  BackSide, PMREMGenerator, Color, ShaderMaterial,
} from 'three';

export function buildEnvironment(renderer, { size = 256 } = {}) {
  const scene = new Scene();
  const geos = [];
  const mats = [];
  const keep = (g, m) => { geos.push(g); mats.push(m); return new Mesh(g, m); };

  // Room shell: a vertical gradient, near black at the floor and a little
  // lifted toward the ceiling, so dark metal still separates from the page.
  const shellGeo = new SphereGeometry(40, 48, 24);
  const shellMat = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        // World-space direction from the room centre; the room is centred on
        // the origin so the vertex position is the direction.
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        // h is 0 at the floor and 1 at the ceiling.
        float h = vDir.y * 0.5 + 0.5;
        // Floor stays almost black; the smoothstep keeps the horizon soft so
        // there is no visible line across polished surfaces (see known-traps #3).
        vec3 floorC = vec3(0.010, 0.010, 0.011);
        vec3 wallC  = vec3(0.045, 0.046, 0.050);
        vec3 ceilC  = vec3(0.080, 0.078, 0.076);
        vec3 c = mix(floorC, wallC, smoothstep(0.0, 0.55, h));
        c = mix(c, ceilC, smoothstep(0.55, 1.0, h));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  geos.push(shellGeo); mats.push(shellMat);
  scene.add(new Mesh(shellGeo, shellMat));

  // Panels are unlit emitters. Colour components above 1 are deliberate: the
  // PMREM target is half-float, so they stay HDR and polished metal clips to
  // a true specular white instead of a grey.
  const panel = (w, h, rgb, pos, look) => {
    const m = keep(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(...rgb), side: 2 }));
    m.position.set(...pos);
    m.lookAt(...look);
    scene.add(m);
    return m;
  };

  // Overhead key: big, warm, slightly in front. Gives the dial its broad sheen.
  panel(22, 10, [5.2, 4.8, 4.3], [-3, 18, 8], [0, 0, 0]);
  // Tall strip, right: the long vertical highlight down the bezel and case flank.
  panel(2.4, 26, [11, 11, 11.5], [17, 2, 6], [0, 0, 0]);
  // Narrow strip, left, cooler and dimmer: separates the left edge of the case.
  panel(1.6, 22, [2.2, 2.5, 3.0], [-18, 1, 3], [0, 0, 0]);
  // Rim from behind and above: outlines lugs and the strap against the dark.
  panel(16, 1.8, [6, 5.8, 5.6], [0, 9, -18], [0, 0, 0]);
  // Small hard source: the pinpoint glints on facets of hands and indices.
  panel(1.4, 1.4, [60, 58, 55], [9, 12, 14], [0, 0, 0]);
  // Faint warm floor bounce, so the underside of the case is not dead black.
  panel(30, 30, [0.16, 0.12, 0.09], [0, -16, 0], [0, 0, 0]);
  // Soft front fill: large, dim and feathered to nothing at its edges. Flat
  // polished faces that look back at the viewer (index tops, hand facets)
  // pick up a graded sheen instead of going black, and the lacquered dial
  // shows a soft glow rather than the outline of a rectangle.
  {
    const m = keep(new PlaneGeometry(44, 26), feathered(new Color(1.1, 1.08, 1.12)));
    m.position.set(0, 6, 26);
    m.lookAt(0, 0, 0);
    scene.add(m);
  }

  // Back fill, also feathered: the movement is seen from behind, so its
  // plates need something to reflect on that side of the room too.
  {
    const m = keep(new PlaneGeometry(52, 40), feathered(new Color(1.2, 1.22, 1.3)));
    m.position.set(-4, 0, -26);
    m.lookAt(0, 0, 0);
    scene.add(m);
  }

  const pmrem = new PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0.012, 0.1, 100, { size });
  pmrem.dispose();
  geos.forEach((g) => g.dispose());
  mats.forEach((m) => m.dispose());
  return rt;
}

// Unlit panel feathered to black at its edges.
function feathered(color) {
  return new ShaderMaterial({
    side: 2,
    uniforms: { uColor: { value: color } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        // d is 0 at the panel centre and 1 at the middle of each edge
        // (elliptical, so the feather follows the panel's proportions).
        vec2 q = (vUv - 0.5) * 2.0;
        float d2 = dot(q, q);
        // Compact smooth kernel (1 - d^2)^3: value, slope and curvature all
        // reach zero at the edge, so a mirror-polished surface shows no rim
        // (known-traps #2), and the centre is curved, not a flat plateau.
        float x = clamp(1.0 - d2, 0.0, 1.0);
        gl_FragColor = vec4(uColor * x * x * x, 1.0);
      }`,
  });
}
