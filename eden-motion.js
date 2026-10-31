/* EDEN — lightweight, continuous particle scenes; no external runtime. */
(async () => {
  'use strict';
  let canvas = document.getElementById('edenParticles');
  const sections = [...document.querySelectorAll('.story-section[data-scene]')];
  if (!canvas || !sections.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 760px)').matches;
  const count = compact ? 2200 : 6400;
  const ambientCount = compact ? 22 : 54;
  const total = count + ambientCount;
  const tau = Math.PI * 2;
  const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  let seed = 7321;
  const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
  const color = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const gold = color('#edbe34'), white = color('#e8e3ef'), purple = color('#8951e9'), teal = color('#238d84'), navy = color('#456cae');
  const palette = [gold, white, purple, teal, navy];
  const pink = color('#d78dab');
  const glyphCorners = [[0, .86, 0], [-.75, -.43, .16], [.75, -.43, .16], [0, -.04, -.75]];
  const glyphEdges = [[0, 1], [1, 2], [2, 0], [0, 3], [1, 3], [2, 3]];
  const points = Array.from({ length: total }, () => ({ u: random(), v: random(), w: random(), s: random() }));
  // Preserve point identities, but never derive the diffuse field from the lamp's UVs.
  // Reusing p.v with the opposite Y direction made the entire cloud collapse to a line.
  for (const point of points) { point.fx = random(); point.fy = random(); point.fz = random(); }
  const [logoPixels, growthPixels] = await Promise.all([sampleBrand(), sampleGrowth()]);
  if (!logoPixels.length || !growthPixels.bars.length || !growthPixels.arrow.length) { document.documentElement.classList.add('art-unavailable'); return; }
  const positions = {}, colors = {}, data = new Float32Array(total * 4);
  const blendColor = (a, b, t) => a.map((value, i) => mix(value, b[i], smooth(clamp(t))));
  async function sampleBrand() {
    const mask = document.createElement('canvas'); mask.width = mask.height = 512;
    const ctx = mask.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];
    try {
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve; image.onerror = reject;
        image.src = new URL('eden-logo.svg', document.baseURI).href;
      });
      ctx.drawImage(image, 0, 0, 512, 512);
    } catch (_) {
      // Retain the actual brand features even if the optional SVG request fails.
      ctx.strokeStyle = '#f4f1e8'; ctx.lineWidth = 7;
      for (const radius of [94, 73, 52]) { ctx.beginPath(); ctx.arc(256, 218, radius, Math.PI, 0); ctx.stroke(); }
      ctx.fillStyle = '#d9b56b'; ctx.beginPath(); ctx.arc(256, 218, 30, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = '#d9b56b'; ctx.beginPath(); ctx.moveTo(108, 246); ctx.lineTo(404, 246); ctx.moveTo(105, 358); ctx.lineTo(407, 358); ctx.stroke();
      ctx.fillStyle = '#f4f1e8'; ctx.font = '96px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('EDEN', 256, 332);
      ctx.font = '15px Arial, sans-serif'; ctx.fillText('OUTSOURCING FINANCEIRO', 256, 399);
    }
    const pixels = ctx.getImageData(0, 0, 512, 512).data, ink = [];
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      const offset = (y * 512 + x) * 4, r = pixels[offset], g = pixels[offset + 1], b = pixels[offset + 2];
      if (pixels[offset + 3] > 128 && r > 100 && Math.max(r, g, b) > 140) ink.push({ x: x + .5, y: y + .5, r, g, b });
    }
    return ink;
  }
  async function sampleGrowth() {
    const mask = document.createElement('canvas'); mask.width = 600; mask.height = 420;
    const ctx = mask.getContext('2d', { willReadFrequently: true });
    const bars = [], arrow = [];
    if (!ctx) return { bars, arrow };
    try {
      const image = new Image();
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = new URL('eden-growth.svg', document.baseURI).href; });
      ctx.drawImage(image, 0, 0, 600, 420);
      const pixels = ctx.getImageData(0, 0, 600, 420).data;
      for (let y = 0; y < 420; y++) for (let x = 0; x < 600; x++) {
        const j = (y * 600 + x) * 4, r = pixels[j], g = pixels[j + 1], b = pixels[j + 2], alpha = pixels[j + 3];
        const point = { x: x + .5, y: y + .5, r, g, b };
        if (alpha > 125 && r > 110 && r > b * 1.15) arrow.push(point);
        else if (alpha > 45 && b > r + 8) bars.push(point);
      }
    } catch (_) { /* The visible SVG fallback remains available. */ }
    return { bars, arrow };
  }
  function growthPixel(p) {
    const pool = p.s < .32 ? growthPixels.arrow : growthPixels.bars;
    return pool[Math.min(pool.length - 1, Math.floor(p.u * pool.length))];
  }
  function surface(name, p) {
    const u = p.u * tau;
    if (name === 'bulb') {
      if (p.v < .84) {
        const y = 1.1 - p.v / .84 * 1.95;
        const r = y >= -.15 ? .8 * Math.sqrt(Math.max(0, 1 - ((y - .3) / .8) ** 2)) : mix(.6614, .25, smooth(clamp((-.15 - y) / .70)));
        return [Math.cos(u) * r, y, Math.sin(u) * r];
      }
      const t = (p.v - .84) / .16;
      const r = t < .75 ? .25 + .02 * Math.sin(t * 54) : .25 * Math.sqrt((1 - t) / .25);
      return [Math.cos(u) * r, -.85 - t * .45, Math.sin(u) * r];
    }
    if (name === 'growth') {
      const pixel = growthPixel(p);
      return [(pixel.x - 300) / 300, (210 - pixel.y) / 300, (p.w - .5) * .09];
    }
    if (name === 'logo') {
      const pixel = logoPixels[Math.min(logoPixels.length - 1, Math.floor(p.s * logoPixels.length))];
      return [(pixel.x / 512 - .5) * 2, (.5 - pixel.y / 512) * 2, (p.w - .5) * .055];
    }
    // An ellipsoidal volume has no visible rectangular boundary and stays full in 3D.
    const latitude = p.fy * 2 - 1, angle = p.fx * tau;
    const shell = Math.sqrt(Math.max(0, 1 - latitude * latitude));
    const radius = Math.cbrt(.08 + p.fz * .92);
    return [Math.cos(angle) * shell * radius * 2.65, latitude * radius * 1.8, Math.sin(angle) * shell * radius * 2.05];
  }
  for (const name of ['bulb', 'scatter', 'growth', 'logo', 'ambient']) {
    const xyz = new Float32Array(total * 3), rgb = new Float32Array(total * 3);
    for (let i = 0; i < total; i++) {
      const p = points[i];
      let pos = surface(name, p);
      const patch = Math.sin(p.u * 24 + p.v * 13) + Math.cos(p.v * 27 - p.u * 8);
      let c = patch > .8 ? gold : patch < -1 ? purple : patch < -.4 ? teal : white;
      let brightness = .9;
      if (name === 'bulb') {
        const y = pos[1] + Math.sin(p.u * tau * 2) * .045;
        c = y > .35 ? blendColor(white, gold, (y - .35) / .7)
          : y > -.55 ? blendColor(purple, white, (y + .55) / .9)
          : blendColor(teal, purple, (y + 1.25) / .7);
      }
      if (name === 'growth') {
        const pixel = growthPixel(p); c = [pixel.r / 255, pixel.g / 255, pixel.b / 255]; brightness = 1;
      }
      if (name === 'logo') {
        const pixel = logoPixels[Math.min(logoPixels.length - 1, Math.floor(p.s * logoPixels.length))];
        c = [pixel.r / 255, pixel.g / 255, pixel.b / 255]; brightness = 1;
      }
      if (i >= count) { pos = [(p.u - .5) * 2.2, (p.v - .5) * 2.2, p.w]; c = palette[i % palette.length]; brightness = 1; }
      xyz.set(pos, i * 3);
      rgb[i * 3] = c[0] * brightness; rgb[i * 3 + 1] = c[1] * brightness; rgb[i * 3 + 2] = c[2] * brightness;
    }
    positions[name] = xyz; colors[name] = rgb;
  }
  for (let i = 0; i < total; i++) {
    const p = points[i];
    data.set([p.w, i < count ? (compact ? 6.5 + p.s * 4.5 : 11 + p.s * 7) : (compact ? 8 + p.s * 16 : 12 + p.s * 26), p.u * tau, i >= count ? 1 : 0], i * 4);
  }
  const scenes = {
    'bulb-right': { shape: 'bulb', x: .74, y: .51, size: .8, ry: -.08, rz: .34, opacity: 1, density: 1 },
    scatter: { shape: 'scatter', x: .5, y: .5, size: 1.2, ry: .1, rz: 0, opacity: .46, density: .65 },
    growth: { shape: 'growth', x: .29, y: .56, size: .92, ry: -.05, rz: 0, opacity: 1, density: 1 },
    ambient: { shape: 'ambient', x: .5, y: .5, size: 1.2, ry: .1, rz: 0, opacity: .46, density: .65 },
    ribbon: { shape: 'logo', x: .74, y: .53, size: .66, ry: 0, rz: 0, opacity: 1, density: 1 }
  };
  function actorBounds(scene) {
    if (scene.shape === 'scatter' || scene.shape === 'ambient') return null;
    const xyz = positions[scene.shape], cy = Math.cos(scene.ry), sy = Math.sin(scene.ry), cz = Math.cos(scene.rz), sz = Math.sin(scene.rz);
    const bounds = { left: Infinity, right: -Infinity, bottom: Infinity, top: -Infinity };
    for (let i = 0; i < count; i++) {
      const j = i * 3, x = xyz[j] * cy + xyz[j + 2] * sy, z = xyz[j + 2] * cy - xyz[j] * sy;
      const y = xyz[j + 1], perspective = 4.5 / (4.5 - z);
      const px = (x * cz - y * sz) * perspective, py = (x * sz + y * cz) * perspective;
      bounds.left = Math.min(bounds.left, px); bounds.right = Math.max(bounds.right, px);
      bounds.bottom = Math.min(bounds.bottom, py); bounds.top = Math.max(bounds.top, py);
    }
    bounds.left -= .07; bounds.right += .07; bounds.bottom -= .08; bounds.top += .08;
    return bounds;
  }
  for (const scene of Object.values(scenes)) scene.bounds = actorBounds(scene);
  function fitActor(scene, art) {
    if (!art || !scene.bounds) return;
    const bounds = scene.bounds;
    const padding = width <= 760 ? 8 : 14;
    params.scale = Math.min((art.width - padding * 2) / (bounds.right - bounds.left),
      (art.height - padding * 2) / (bounds.top - bounds.bottom));
    // Fit once inside the document slot; never clamp to viewport edges while scrolling.
    params.cx = art.x - (bounds.left + bounds.right) * .5 * params.scale;
    params.cy = art.y + (bounds.top + bounds.bottom) * .5 * params.scale;
  }
  let width = 1, height = 1, dpr = 1, frame = 0, last = 0, shapePair = '';
  let renderer = null, atmosphere = null, isWebGL = false, contextLost = false, layoutFrame = 0;
  let quality = 1, slowTime = 0, lastQualityChange = 0, frameInterval = 16.67;
  let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0, pointerOn = false, pointerStrength = 0;
  let cameraX = 0, cameraY = 0, timelineTime = 0, headerHeight = 88;
  const params = { a: scenes['bulb-right'], b: scenes['bulb-right'], t: 0, cx: 0, cy: 0, scale: 1, rotationX: 0, rotationY: 0, rotationZ: 0, opacity: 1, density: 1, flow: 0, transition: 0, pose: 0, scroll: 0, time: 0, logo: 0, growth: 0, buildLogo: 0, buildGrowth: 0, actorOpacity: 1, drawCount: count };
  let artReady = false, activeScene = '', logoState = '';
  function sceneAt(scroll) {
    const state = window.edenStoryScroll?.sync(scroll);
    if (!state) return null;
    const scene = scenes[state.scene];
    // Artwork is already a coherent illustration when its copy begins to show.
    // Its fade and document-space movement come directly from the composition.
    params.a = params.b = scene; params.t = 0; params.pose = 0;
    params.transition = params.flow = params.buildLogo = params.buildGrowth = 0;
    if (activeScene !== state.scene) { activeScene = state.scene; canvas.dataset.scene = state.scene; }
    const assemblyState = scene.shape === 'logo' && state.opacity > .999 ? 'formed'
      : scene.shape === 'logo' && state.opacity > 0 ? 'forming' : 'idle';
    if (assemblyState !== logoState) { logoState = assemblyState; canvas.dataset.logo = assemblyState; }
    const label = state.opacity.toFixed(4);
    if (canvas.dataset.progress !== label) canvas.dataset.progress = label;
    return state;
  }
  const vertex = `
    precision highp float;
    attribute vec3 aFrom, aTo, aColorFrom, aColorTo;
    attribute vec4 aData;
    uniform vec2 uViewport, uCenter, uPointer;
    uniform vec4 uRotation;
    uniform vec2 uTilt;
    uniform float uMix, uTime, uScale, uDpr, uOpacity, uDensity, uFlow, uTransition, uPointerStrength, uField, uLogo, uGrowth, uBuildLogo, uBuildGrowth, uHeader;
    varying vec3 vColor;
    varying vec2 vSpin, vTilt;
    varying float vAlpha, vStroke;
    void main() {
      float staggerRange = mix(.22, .42, max(uBuildLogo, uBuildGrowth)) * uTransition;
      float arrival = mix(aData.x, aData.x * .65 + clamp(.5 - aTo.y * .5, 0., 1.) * .35, uBuildLogo);
      arrival = mix(arrival, aData.x * .55 + clamp(.5 + aTo.x * .5, 0., 1.) * .45, uBuildGrowth);
      float stagger = arrival * staggerRange;
      float localMix = clamp((uMix - stagger) / (1. - staggerRange), 0., 1.);
      localMix = localMix * localMix * (3. - 2. * localMix);
      vec3 target = aTo;
      target.y = mix(aTo.y, mix(-.466667, aTo.y, smoothstep(.2, .85, localMix)), uBuildGrowth);
      vec3 p = mix(aFrom, target, localMix);
      float path = sin(localMix * 3.14159265) * uTransition;
      // Curved trajectories unfold across depth before settling into the next form.
      float winding = aData.z + localMix * 2.4;
      p += vec3(sin(winding), cos(winding * 1.3), sin(winding * .8 + aData.x * 5.)) * path * mix(.33, .55, uBuildLogo);
      float drift = (.009 + uFlow * .055) * mix(1., .2, uLogo);
      p += vec3(sin(p.y * 3. + uTime * .38 + aData.z), cos(p.x * 3. + uTime * .31 + aData.z), sin(uTime * .27 + aData.z)) * drift;
      float focus = 0.;
      if (aData.w > .5) {
        p.xy += vec2(sin(uTime * .18 + aData.z), cos(uTime * .13 + aData.z)) * .025;
        gl_Position = vec4(p.x, p.y, 0., 1.);
        gl_PointSize = aData.y * uDpr;
        vAlpha = .1 + aData.x * .22;
      } else {
        p.yz = mat2(uTilt.x, -uTilt.y, uTilt.y, uTilt.x) * p.yz;
        p.xz = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * p.xz;
        p.xy = mat2(uRotation.z, uRotation.w, -uRotation.w, uRotation.z) * p.xy;
        float perspective = 4.5 / (4.5 - p.z);
        vec2 pixel = uCenter + vec2(p.x, -p.y) * uScale * perspective;
        vec2 delta = pixel - uPointer;
        float influence = 1. - smoothstep(0., 160., length(delta));
        focus = influence * uPointerStrength;
        // Lift a patch toward the viewer, along the shape's surface. No force
        // pushes points away from the cursor; the silhouette gains actual relief.
        p.z += focus * (.38 + .22 * aData.x) * mix(1., .18, uField);
        perspective = 4.5 / (4.5 - p.z);
        pixel = uCenter + vec2(p.x, -p.y) * uScale * perspective;
        vec2 clip = pixel / uViewport * 2. - 1.;
        gl_Position = vec4(clip.x, -clip.y, 0., 1.);
        float magnify = focus * (.65 + 1.35 * aData.x);
        float depthSize = clamp(.7 + p.z * .20, .32, 1.35);
        gl_PointSize = aData.y * uDpr * perspective * mix(1., depthSize, uField) * mix(1., .64, max(uLogo, uGrowth)) * (1. + magnify);
        float presence = 1. - smoothstep(uDensity - .06, uDensity + .06, aData.x);
        vAlpha = clamp(.72 + p.z * .32, .14, 1.) * uOpacity * presence * mix(1., clamp(.55 + p.z * .26, .12, 1.), uField);
        vAlpha = mix(vAlpha, uOpacity * presence * .96, uLogo);
        vAlpha = min(1., vAlpha * (1. + focus * .22));
        vAlpha *= mix(1., smoothstep(uHeader * .35, uHeader + 20., pixel.y), uField);
        if (presence < .001) { gl_Position = vec4(3., 3., 0., 1.); gl_PointSize = 1.; }
      }
      float angle = aData.z + uTime * (.085 + aData.x * .085);
      vStroke = clamp(2.0 * uDpr / max(1., gl_PointSize), .025, .21);
      vSpin = vec2(cos(angle), sin(angle));
      vTilt = vec2(.77 + .23 * sin(uTime * .19 + aData.z), .82 + .18 * cos(uTime * .17 + aData.z));
      vColor = mix(aColorFrom, aColorTo, localMix);
      vColor = min(vec3(1.), vColor * (1. + focus * .16));
    }
  `;
  const fragment = `
    precision mediump float;
    varying vec3 vColor;
    varying vec2 vSpin, vTilt;
    varying float vAlpha, vStroke;
    void main() {
      vec2 p = (gl_PointCoord - .5) * 2.8;
      p = mat2(vSpin.x, -vSpin.y, vSpin.y, vSpin.x) * p;
      p /= vTilt;
      float edge = min(p.y + .48, (.94 - p.y - 1.73205 * abs(p.x)) * .5);
      if (edge < -.035) discard;
      float outer = smoothstep(-.035, .025, edge);
      float line = 1. - smoothstep(vStroke * .24, vStroke, edge);
      gl_FragColor = vec4(vColor, outer * (line * .97 + .018) * vAlpha);
    }
  `;
  function webglRenderer(gl) {
    const program = gl.createProgram();
    function shader(type, source) {
      const compiled = gl.createShader(type); gl.shaderSource(compiled, source); gl.compileShader(compiled);
      if (!gl.getShaderParameter(compiled, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(compiled));
      gl.attachShader(program, compiled);
    }
    shader(gl.VERTEX_SHADER, vertex); shader(gl.FRAGMENT_SHADER, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const uniforms = {};
    for (const name of ['Viewport', 'Center', 'Pointer', 'Mix', 'Time', 'Scale', 'Dpr', 'Rotation', 'Tilt', 'Opacity', 'Density', 'Flow', 'Transition', 'PointerStrength', 'Field', 'Logo', 'Growth', 'BuildLogo', 'BuildGrowth', 'Header']) uniforms[name] = gl.getUniformLocation(program, 'u' + name);
    const locations = {}, buffers = {};
    for (const name of ['From', 'To', 'ColorFrom', 'ColorTo', 'Data']) {
      locations[name] = gl.getAttribLocation(program, 'a' + name); gl.enableVertexAttribArray(locations[name]);
    }
    // Upload each shape once. Scene changes only bind resident buffers.
    for (const name of Object.keys(positions)) {
      buffers[name] = {};
      for (const [kind, array] of [['position', positions[name]], ['color', colors[name]]]) {
        const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW); buffers[name][kind] = buffer;
      }
    }
    const pointData = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pointData); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.vertexAttribPointer(locations.Data, 4, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.clearColor(0, 0, 0, 0);
    function bindShape(from, to) {
      for (const [name, buffer] of [['From', buffers[from].position], ['To', buffers[to].position], ['ColorFrom', buffers[from].color], ['ColorTo', buffers[to].color]]) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.vertexAttribPointer(locations[name], 3, gl.FLOAT, false, 0, 0);
      }
    }
    return () => {
      const { a, b, t } = params;
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, pointData); gl.vertexAttribPointer(locations.Data, 4, gl.FLOAT, false, 0, 0);
      gl.viewport(0, 0, canvas.width, canvas.height); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uniforms.Viewport, width, height); gl.uniform2f(uniforms.Pointer, pointerX, pointerY);
      gl.uniform1f(uniforms.Time, params.time); gl.uniform1f(uniforms.Dpr, dpr); gl.uniform1f(uniforms.Header, headerHeight);
      // A separate, unchanging field remains visible behind every scene and the footer.
      bindShape('scatter', 'scatter');
      gl.uniform2f(uniforms.Center, width * .5 + cameraX * 8, height * .5 - cameraY * 6);
      gl.uniform4f(uniforms.Rotation, Math.cos(.1), Math.sin(.1), 1, 0); gl.uniform2f(uniforms.Tilt, 1, 0);
      gl.uniform1f(uniforms.Mix, 0); gl.uniform1f(uniforms.Scale, Math.min(width * .275, height * .445) * 1.2);
      gl.uniform1f(uniforms.Opacity, .46); gl.uniform1f(uniforms.Density, .9);
      gl.uniform1f(uniforms.Flow, 0); gl.uniform1f(uniforms.Transition, 0); gl.uniform1f(uniforms.Field, 1); gl.uniform1f(uniforms.Logo, 0); gl.uniform1f(uniforms.Growth, 0); gl.uniform1f(uniforms.BuildLogo, 0); gl.uniform1f(uniforms.BuildGrowth, 0);
      gl.uniform1f(uniforms.PointerStrength, pointerStrength * .45);
      gl.drawArrays(gl.POINTS, 0, Math.floor(Math.min(count, compact ? 1000 : 3200) * quality));
      if (params.actorOpacity > .002) {
        bindShape(a.shape, b.shape);
        gl.uniform2f(uniforms.Center, params.cx, params.cy);
        gl.uniform4f(uniforms.Rotation, Math.cos(params.rotationY), Math.sin(params.rotationY), Math.cos(params.rotationZ), Math.sin(params.rotationZ));
        gl.uniform2f(uniforms.Tilt, Math.cos(params.rotationX), Math.sin(params.rotationX));
        gl.uniform1f(uniforms.Mix, t); gl.uniform1f(uniforms.Scale, params.scale);
        gl.uniform1f(uniforms.Opacity, params.opacity * params.actorOpacity); gl.uniform1f(uniforms.Density, params.density);
        gl.uniform1f(uniforms.Flow, params.flow); gl.uniform1f(uniforms.Transition, params.transition);
        gl.uniform1f(uniforms.PointerStrength, pointerStrength * (1 - Math.max(params.logo, params.growth) * .65)); gl.uniform1f(uniforms.Logo, params.logo);
        gl.uniform1f(uniforms.Growth, params.growth); gl.uniform1f(uniforms.BuildLogo, params.buildLogo); gl.uniform1f(uniforms.BuildGrowth, params.buildGrowth);
        gl.uniform1f(uniforms.Field, mix(a.shape === 'scatter' || a.shape === 'ambient' ? 1 : 0, b.shape === 'scatter' || b.shape === 'ambient' ? 1 : 0, t));
        gl.drawArrays(gl.POINTS, 0, params.drawCount);
      }
      if (atmosphere) atmosphere();
    };
  }
  function atmosphereRenderer(gl) {
    // Real wireframe tetrahedra, rather than flat foreground point sprites.
    const vertices = glyphCorners, edges = glyphEdges;
    const corners = [], origins = [], styles = [], ink = [];
    for (let i = 0; i < ambientCount; i++) {
      const p = points[count + i], c = palette[i % palette.length];
      for (const edge of edges) for (const endpoint of edge) {
        corners.push(...vertices[endpoint]);
        origins.push(p.u * 2.4 - 1.2, p.v * 2.4 - 1.2, p.w);
        styles.push((compact ? 6 : 9) + p.s * (compact ? 13 : 22), .09 + p.w * .17, p.u * tau, .11 + p.s * .19);
        ink.push(...c);
      }
    }
    const program = gl.createProgram();
    const source = `
      precision highp float;
      attribute vec3 aCorner, aOrigin, aInk;
      attribute vec4 aStyle;
      uniform vec2 uViewport, uCamera;
      uniform float uTime, uScroll, uHeader;
      varying vec3 vInk;
      varying float vAlpha;
      void main() {
        float depth = .65 + aOrigin.z * .95;
        float angle = uTime * aStyle.y + aStyle.z;
        float cx = cos(angle * .73), sx = sin(angle * .73);
        float cy = cos(angle), sy = sin(angle);
        float cz = cos(angle * .47), sz = sin(angle * .47);
        vec3 p = aCorner;
        p.yz = mat2(cx, -sx, sx, cx) * p.yz;
        p.xz = mat2(cy, -sy, sy, cy) * p.xz;
        p.xy = mat2(cz, -sz, sz, cz) * p.xy;
        float perspective = 4. / (4. - p.z * .45);
        vec2 origin = aOrigin.xy;
        origin.y = mod(origin.y + uTime * (.003 + aOrigin.z * .006) - uScroll / uViewport.y * .035 * depth + 1.2, 2.4) - 1.2;
        vec2 floatOffset = vec2(sin(uTime * .12 + aStyle.z), cos(uTime * .15 + aStyle.z)) * (.018 + aOrigin.z * .023);
        origin += floatOffset + uCamera * (.012 + aOrigin.z * .033);
        vec2 pixel = origin * uViewport * .5 + vec2(p.x, p.y) * aStyle.x * depth * perspective;
        gl_Position = vec4(pixel / uViewport * 2., 0., 1.);
        vInk = aInk;
        vAlpha = aStyle.w * (.45 + aOrigin.z * .75) * smoothstep(uHeader * .35, uHeader + 20., uViewport.y * .5 - pixel.y);
      }
    `;
    for (const [type, text] of [[gl.VERTEX_SHADER, source], [gl.FRAGMENT_SHADER, 'precision mediump float; varying vec3 vInk; varying float vAlpha; void main(){gl_FragColor=vec4(vInk,vAlpha);}']]) {
      const shader = gl.createShader(type); gl.shaderSource(shader, text); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    const bindings = [];
    for (const [name, values, size] of [['Corner', corners, 3], ['Origin', origins, 3], ['Style', styles, 4], ['Ink', ink, 3]]) {
      const buffer = gl.createBuffer(), location = gl.getAttribLocation(program, 'a' + name);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(location); bindings.push({ buffer, location, size });
    }
    const viewport = gl.getUniformLocation(program, 'uViewport'), camera = gl.getUniformLocation(program, 'uCamera');
    const time = gl.getUniformLocation(program, 'uTime'), scroll = gl.getUniformLocation(program, 'uScroll'), header = gl.getUniformLocation(program, 'uHeader');
    return () => {
      gl.useProgram(program);
      for (const binding of bindings) { gl.bindBuffer(gl.ARRAY_BUFFER, binding.buffer); gl.vertexAttribPointer(binding.location, binding.size, gl.FLOAT, false, 0, 0); }
      gl.uniform2f(viewport, width, height); gl.uniform2f(camera, cameraX, cameraY);
      gl.uniform1f(time, params.time); gl.uniform1f(scroll, params.scroll); gl.uniform1f(header, headerHeight);
      gl.drawArrays(gl.LINES, 0, ambientCount * 12);
    };
  }
  function drawAtmosphere2D(ctx) {
    const time = params.time;
    for (let i = 0; i < ambientCount; i++) {
      const p = points[count + i], c = palette[i % palette.length];
      const depth = .65 + p.w * .95, angle = time * (.09 + p.w * .17) + p.u * tau;
      const cx = Math.cos(angle * .73), sx = Math.sin(angle * .73), cy = Math.cos(angle), sy = Math.sin(angle), cz = Math.cos(angle * .47), sz = Math.sin(angle * .47);
      const size = (compact ? 6 : 9) + p.s * (compact ? 13 : 22);
      const wave = .018 + p.w * .023;
      const ox = (p.u * 2.4 - 1.2 + Math.sin(time * .12 + p.u * tau) * wave + cameraX * (.012 + p.w * .033)) * width * .5 + width * .5;
      const wrappedY = ((p.v * 2.4 + time * (.003 + p.w * .006) - params.scroll / height * .035 * depth) % 2.4 + 2.4) % 2.4 - 1.2;
      const oy = height * .5 - (wrappedY + Math.cos(time * .15 + p.u * tau) * wave + cameraY * (.012 + p.w * .033)) * height * .5;
      const projected = glyphCorners.map(v => {
        const y = v[1] * cx + v[2] * sx, z = v[2] * cx - v[1] * sx;
        const x2 = v[0] * cy + z * sy, z2 = z * cy - v[0] * sy;
        const factor = size * depth * 4 / (4 - z2 * .45);
        return [ox + (x2 * cz - y * sz) * factor, oy - (x2 * sz + y * cz) * factor];
      });
      ctx.strokeStyle = `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
      ctx.globalAlpha = (.11 + p.s * .19) * (.45 + p.w * .75); ctx.lineWidth = .8;
      ctx.beginPath();
      for (const [a, b] of glyphEdges) { ctx.moveTo(projected[a][0], projected[a][1]); ctx.lineTo(projected[b][0], projected[b][1]); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function canvasRenderer(ctx) {
    // Cache CSS colors and trigonometry outside the per-frame particle loop.
    const cssColors = {}, spinX = new Float32Array(total * 3), spinY = new Float32Array(total * 3);
    for (const name of Object.keys(colors)) {
      cssColors[name] = Array.from({ length: total }, (_, i) => `rgb(${Math.round(colors[name][i * 3] * 255)},${Math.round(colors[name][i * 3 + 1] * 255)},${Math.round(colors[name][i * 3 + 2] * 255)})`);
    }
    for (let i = 0; i < total; i++) for (let k = 0; k < 3; k++) { spinX[i * 3 + k] = Math.cos(data[i * 4 + 2] + k * tau / 3); spinY[i * 3 + k] = Math.sin(data[i * 4 + 2] + k * tau / 3); }
    function backdrop() {
      const xyz = positions.scatter, css = cssColors.scatter;
      const stride = Math.ceil(count / (compact ? 350 : 750));
      const scale = Math.min(width * .275, height * .445) * 1.2;
      const ca = Math.cos(.1), sa = Math.sin(.1);
      for (let i = 0; i < count; i += stride) {
        const p = points[i]; if (p.w > .9) continue;
        const j = i * 3, x = xyz[j] * ca + xyz[j + 2] * sa, y = xyz[j + 1], z = xyz[j + 2] * ca - xyz[j] * sa;
        const perspective = 4.5 / (4.5 - z), depthSize = clamp(.7 + z * .2, .32, 1.35);
        const px = width * .5 + cameraX * 8 + x * scale * perspective;
        const py = height * .5 - cameraY * 6 - y * scale * perspective;
        const size = data[i * 4 + 1] * .38 * perspective * depthSize;
        ctx.strokeStyle = css[i]; ctx.globalAlpha = clamp(.6 + z * .42, .1, 1) * .46 * clamp(.55 + z * .26, .12, 1);
        ctx.beginPath();
        const angle = params.time * (.085 + p.w * .085), c = Math.cos(angle), s = Math.sin(angle);
        for (let k = 0; k < 3; k++) {
          const vx = spinX[j + k] * c - spinY[j + k] * s, vy = spinX[j + k] * s + spinY[j + k] * c;
          if (!k) ctx.moveTo(px + vx * size, py + vy * size); else ctx.lineTo(px + vx * size, py + vy * size);
        }
        ctx.closePath(); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    return () => {
      const { a, b, t, cx, cy, scale, rotationY, rotationZ, opacity, time } = params;
      const from = positions[a.shape], to = positions[b.shape];
      const fromColor = colors[a.shape], toColor = colors[b.shape];
      const css = cssColors[t < .5 ? a.shape : b.shape];
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height); backdrop();
      const ca = Math.cos(rotationY), sa = Math.sin(rotationY), cr = Math.cos(rotationZ), sr = Math.sin(rotationZ);
      const turnC = Math.cos(time * .035), turnS = Math.sin(time * .035);
      const stride = Math.max(2, Math.ceil(params.drawCount / 1000));
      ctx.lineWidth = .8;
      if (params.actorOpacity > .002) for (let i = 0; i < total; i = i < count ? Math.min(count, i + stride) : i + 1) {
        if (i < count && i >= params.drawCount) { i = count - 1; continue; }
        const index = i * 3, ambient = i >= count, p = points[i];
        if (ambient) continue;
        const staggerRange = mix(.22, .42, Math.max(params.buildLogo, params.buildGrowth)) * params.transition;
        let arrival = mix(p.w, p.w * .65 + clamp(.5 - to[index + 1] * .5) * .35, params.buildLogo);
        arrival = mix(arrival, p.w * .55 + clamp(.5 + to[index] * .5) * .45, params.buildGrowth);
        const stagger = arrival * staggerRange;
        const q = smooth(clamp((t - stagger) / (1 - staggerRange)));
        const path = Math.sin(q * Math.PI) * params.transition;
        const pathSize = mix(.33, .55, params.buildLogo);
        const winding = data[i * 4 + 2] + q * 2.4;
        let x = mix(from[index], to[index], q) + Math.sin(winding) * path * pathSize;
        const targetY = mix(to[index + 1], mix(-.466667, to[index + 1], smooth(clamp((q - .2) / .65))), params.buildGrowth);
        let y = mix(from[index + 1], targetY, q) + Math.cos(winding * 1.3) * path * pathSize;
        const depth = mix(from[index + 2], to[index + 2], q) + Math.sin(winding * .8 + p.w * 5) * path * pathSize;
        const tiltC = Math.cos(params.rotationX), tiltS = Math.sin(params.rotationX);
        const z0 = depth * tiltC - y * tiltS; y = y * tiltC + depth * tiltS;
        let z = z0 * ca - x * sa;
        x = x * ca + z0 * sa;
        const rotatedX = x * cr - y * sr; y = x * sr + y * cr;
        let perspective = 4.5 / (4.5 - z);
        let px = ambient ? p.u * width : cx + rotatedX * scale * perspective;
        let py = ambient ? p.v * height : cy - y * scale * perspective;
        let focus = 0;
        if (!ambient && !reduced.matches && pointerStrength > .01) {
          const dx = px - pointerX, dy = py - pointerY, distance = Math.hypot(dx, dy);
          if (distance < 160) {
            const influence = 1 - smooth(clamp(distance / 160)); focus = influence * pointerStrength * (1 - Math.max(params.logo, params.growth) * .65);
            z += focus * (.38 + .22 * p.w);
            perspective = 4.5 / (4.5 - z);
            px = cx + rotatedX * scale * perspective; py = cy - y * scale * perspective;
          }
        }
        const size = data[i * 4 + 1] * (ambient ? .45 : .38 * perspective) * mix(1, .64, Math.max(params.logo, params.growth)) * (1 + focus * (.65 + 1.35 * p.w));
        const presence = 1 - smooth(clamp((p.w - params.density + .06) / .12));
        if (!ambient && presence < .001) continue;
        const cr0 = Math.round(mix(fromColor[index], toColor[index], q) * 255);
        const cg0 = Math.round(mix(fromColor[index + 1], toColor[index + 1], q) * 255);
        const cb0 = Math.round(mix(fromColor[index + 2], toColor[index + 2], q) * 255);
        ctx.strokeStyle = params.transition ? `rgb(${cr0},${cg0},${cb0})` : css[i];
        ctx.globalAlpha = ambient ? .17 : clamp(clamp(.72 + z * .32, .14, 1) * opacity * presence * params.actorOpacity * (1 + focus * .22));
        ctx.beginPath();
        for (let k = 0; k < 3; k++) {
          const sx = spinX[index + k], sy = spinY[index + k];
          const tx = px + (sx * turnC - sy * turnS) * size, ty = py + (sx * turnS + sy * turnC) * size;
          if (!k) ctx.moveTo(tx, ty); else ctx.lineTo(tx, ty);
        }
        ctx.closePath(); ctx.stroke();
      }
      ctx.globalAlpha = 1; drawAtmosphere2D(ctx);
    };
  }
  function bindContextEvents() {
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); contextLost = true; cancelAnimationFrame(frame); frame = 0; canvas.dataset.renderer = 'context-lost'; });
    canvas.addEventListener('webglcontextrestored', () => { contextLost = false; renderer = null; shapePair = ''; init(); });
  }
  function init() {
    let gl = null;
    try { gl = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'high-performance', premultipliedAlpha: true, depth: false, stencil: false }); } catch (_) { /* Supported Canvas fallback below. */ }
    renderer = null; atmosphere = null; isWebGL = false;
    if (gl) try { renderer = webglRenderer(gl); atmosphere = atmosphereRenderer(gl); isWebGL = true; } catch (error) { renderer = null; atmosphere = null; console.warn('EDEN: usando composição alternativa', error); }
    if (!renderer) {
      if (gl) { const replacement = canvas.cloneNode(false); canvas.replaceWith(replacement); canvas = replacement; bindContextEvents(); }
      const ctx = canvas.getContext('2d'); if (ctx) renderer = canvasRenderer(ctx);
    }
    if (!renderer) { document.documentElement.classList.add('art-unavailable'); return; }
    canvas.dataset.renderer = isWebGL ? 'webgl' : 'canvas';
    resize(); restart();
  }
  function setResolution() {
    // Bound fullscreen fill-rate, especially on Retina and 4K displays.
    dpr = Math.min(devicePixelRatio || 1, 1.35, Math.sqrt(2000000 / Math.max(1, width * height))) * Math.sqrt(quality);
    const pixelWidth = Math.max(1, Math.round(width * dpr)), pixelHeight = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) { canvas.width = pixelWidth; canvas.height = pixelHeight; }
  }
  function resize() {
    width = innerWidth; height = innerHeight; headerHeight = document.querySelector('.site-header')?.offsetHeight || (width <= 760 ? 72 : 88); setResolution(); draw(performance.now(), 16.67);
  }
  function queueLayout() {
    if (layoutFrame) return;
    layoutFrame = requestAnimationFrame(() => { layoutFrame = 0; resize(); });
  }
  function draw(now, delta) {
    if (!renderer || contextLost) return;
    const state = sceneAt(scrollY);
    if (!state) return;
    const elapsed = Math.min(delta, 50), scene = params.b;
    params.time = reduced.matches ? 0 : timelineTime; params.scroll = scrollY;
    if (reduced.matches) { cameraX = 0; cameraY = 0; pointerStrength = 0; }
    const follow = 1 - Math.exp(-elapsed / 85);
    const targetCameraX = pointerOn && !reduced.matches ? targetX / width * 2 - 1 : 0;
    const targetCameraY = pointerOn && !reduced.matches ? 1 - targetY / height * 2 : 0;
    cameraX += (targetCameraX - cameraX) * follow; cameraY += (targetCameraY - cameraY) * follow;
    pointerX += (targetX - pointerX) * follow; pointerY += (targetY - pointerY) * follow;
    pointerStrength += ((pointerOn && !reduced.matches ? 1 : 0) - pointerStrength) * follow;
    params.logo = scene.shape === 'logo' ? 1 : 0;
    params.growth = scene.shape === 'growth' ? 1 : 0;
    params.rotationX = cameraY * .025 * (1 - params.logo * .85);
    params.rotationY = scene.ry + cameraX * .035 * (1 - params.logo * .85);
    params.rotationZ = scene.rz;
    params.cx = width * .5; params.cy = height * .5;
    params.scale = 1; fitActor(scene, state.art);
    params.opacity = state.opacity;
    params.drawCount = Math.max(1, Math.floor(count * quality)); params.density = 1;
    params.actorOpacity = state.art && !['scatter', 'ambient'].includes(scene.shape) ? 1 : 0;
    renderer();
    if (!artReady) { artReady = true; document.documentElement.dataset.artReady = 'true'; }
  }
  function animate(now) {
    if (document.hidden || contextLost) { frame = 0; return; }
    const delta = last ? now - last : 16.67; last = now;
    // Follow every display frame; the old 24/32ms gate dropped half the frames.
    timelineTime += Math.min(delta, 50) * .001;
    draw(now, delta);
    frameInterval += (Math.min(delta, 100) - frameInterval) * .035;
    slowTime = frameInterval > 25 ? slowTime + delta : Math.max(0, slowTime - delta);
    if (slowTime > 1800 && quality > .45 && now - lastQualityChange > 2500) {
      quality = Math.max(.45, quality * .8); lastQualityChange = now; slowTime = 0;
      canvas.dataset.quality = quality.toFixed(2); setResolution();
    }
    frame = requestAnimationFrame(animate);
  }
  function restart() {
    cancelAnimationFrame(frame); frame = 0; last = 0; frameInterval = 16.67; slowTime = 0;
    if (document.hidden || !renderer || contextLost) return;
    draw(performance.now(), 16.67);
    if (!reduced.matches) frame = requestAnimationFrame(animate);
  }
  addEventListener('pointermove', e => { if (e.pointerType !== 'touch') { targetX = e.clientX; targetY = e.clientY; pointerOn = true; } }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointerOn = false; });
  addEventListener('scroll', () => { if (reduced.matches) draw(performance.now(), 16.67); }, { passive: true });
  addEventListener('resize', queueLayout, { passive: true });
  document.addEventListener('visibilitychange', restart); reduced.addEventListener('change', restart);
  document.addEventListener('eden:storylayout', () => { if (reduced.matches) draw(performance.now(), 16.67); });
  bindContextEvents(); init();
  if ('ResizeObserver' in window) { const layout = new ResizeObserver(queueLayout); sections.forEach(section => layout.observe(section)); }
})();
