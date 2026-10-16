// Studio environment built in code and baked to a PMREM map. Black anodised
// aluminium reads as metal only when it has long, crisp highlights to show,
// so the room is dark with a few hard strip lights and two feathered fills.
export function buildEnvironment(T, renderer, size = 256) {
  const scene = new T.Scene();
  const disposables = [];
  const add = (geo, mat) => { disposables.push(geo, mat); const m = new T.Mesh(geo, mat); scene.add(m); return m; };

  // Shell: near-black floor rising to a dim ceiling. The smoothstep keeps
  // the horizon soft so no crease is reflected across the barrel.
  add(new T.SphereGeometry(40, 48, 24), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vDir;
      void main() {
        // h: 0 at the floor, 1 at the ceiling.
        float h = vDir.y * 0.5 + 0.5;
        vec3 c = mix(vec3(0.008, 0.009, 0.011), vec3(0.04, 0.042, 0.05), smoothstep(0.0, 0.6, h));
        c = mix(c, vec3(0.075, 0.072, 0.07), smoothstep(0.6, 1.0, h));
        gl_FragColor = vec4(c, 1.0);
      }`,
  }));

  // Hard strips. Colour components above 1 stay HDR in the half-float
  // PMREM target, so metal clips to a true white highlight.
  const strip = (w, h, rgb, pos) => {
    const m = add(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(...rgb), side: T.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
  };
  strip(2.2, 28, [10, 10, 10.5], [16, 2, 8]);       // long vertical highlight, right
  strip(1.4, 24, [2.4, 2.7, 3.2], [-17, 0, 6]);     // cooler, dimmer, left
  strip(24, 1.6, [6, 5.6, 5.2], [0, 15, -6]);       // horizontal top rim
  strip(18, 7, [3.6, 3.3, 3.0], [-4, 16, 10]);      // overhead key
  strip(1.2, 1.2, [50, 48, 46], [8, 11, 14]);       // pinpoint for glints

  // Feathered fills: (1 - d^2)^3 falloff so mirror-like surfaces show a
  // soft glow with no visible edge (known-traps #2).
  const feather = (w, h, rgb, pos) => {
    const m = add(new T.PlaneGeometry(w, h), new T.ShaderMaterial({
      side: T.DoubleSide,
      uniforms: { uColor: { value: new T.Color(...rgb) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 uColor; varying vec2 vUv;
        void main() {
          // q: -1..1 across the panel; d2 its squared elliptical distance.
          vec2 q = (vUv - 0.5) * 2.0;
          float x = clamp(1.0 - dot(q, q), 0.0, 1.0);
          // Cubed: zero value, slope and curvature at the rim.
          gl_FragColor = vec4(uColor * x * x * x, 1.0);
        }`,
    }));
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
  };
  feather(40, 24, [0.9, 0.9, 1.0], [0, 4, 26]);
  feather(46, 34, [1.0, 1.0, 1.1], [-4, 0, -26]);

  const pmrem = new T.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0.015, 0.1, 100, { size });
  pmrem.dispose();
  disposables.forEach((d) => d.dispose());
  return rt;
}
