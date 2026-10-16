// Silent WebGL capability probe. Logs nothing on any failure path.
export function probeWebGL({ allowSoftware = false } = {}) {
  if (typeof WebGL2RenderingContext === 'undefined' && typeof WebGLRenderingContext === 'undefined') return null;
  const canvas = document.createElement('canvas');
  const attrs = {
    // A software rasteriser reports as unsupported, so tier 2 takes over;
    // Canvas 2D is faster than emulated WebGL.
    failIfMajorPerformanceCaveat: !allowSoftware,
    powerPreference: 'high-performance',
    antialias: false, alpha: false, depth: false, stencil: false,
  };
  let gl = null, version = 0;
  try {
    gl = canvas.getContext('webgl2', attrs);
    if (gl) version = 2;
    if (!gl) { gl = canvas.getContext('webgl', attrs); if (gl) version = 1; }
  } catch { return null; }
  if (!gl) return null;
  const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  let renderer = '';
  try {
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
  } catch { /* informational only */ }
  // Release the probe context now: browsers cap live contexts and silently
  // drop the oldest, which would black out the real scene later.
  try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* ignore */ }
  return { version, maxTexture, renderer, tier: assignTier({ maxTexture, renderer, allowSoftware }) };
}

function assignTier({ maxTexture, renderer, allowSoftware }) {
  const soft = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
  if (soft && allowSoftware) return 'high';           // QA capture in a GPU-less container
  if (soft || maxTexture < 4096) return 'low';
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const coarse = matchMedia('(pointer: coarse)').matches;
  // Phones and small-memory machines get DPR 1.5 and lighter materials.
  if (coarse || mem <= 4 || cores <= 4 || maxTexture < 8192) return 'medium';
  return 'high';
}
