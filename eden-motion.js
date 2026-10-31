/* EDEN — lightweight, continuous particle scenes; no external runtime. */
(() => {
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
  const glyphCorners = [[0, .86, 0], [-.75, -.43, .16], [.75, -.43, .16], [0, -.04, -.75]];
  const glyphEdges = [[0, 1], [1, 2], [2, 0], [0, 3], [1, 3], [2, 3]];
  const points = Array.from({ length: total }, () => ({ u: random(), v: random(), w: random(), s: random() }));
  const positions = {}, colors = {}, data = new Float32Array(total * 4);
  const blendColor = (a, b, t) => a.map((value, i) => mix(value, b[i], smooth(clamp(t))));
  function surface(name, p) {
    const u = p.u * tau;
    if (name === 'bulb') {
      if (p.v < .72) {
        const y = 1.1 - p.v / .72 * 1.7;
        const r = y >= -.15 ? .8 * Math.sqrt(Math.max(0, 1 - ((y - .3) / .8) ** 2)) : mix(.6614, .27, smooth(clamp((-.15 - y) / .45)));
        return [Math.cos(u) * r, y, Math.sin(u) * r];
      }
      const t = (p.v - .72) / .28;
      const r = t < .75 ? .27 + .024 * Math.sin(t * 54) : .27 * Math.sqrt((1 - t) / .25);
      return [Math.cos(u) * r, -.6 - t * .65, Math.sin(u) * r];
    }
    if (name === 'ribbon') {
      const t = p.u * tau * 1.75, band = (p.v - .5) * .9;
      const r = .46 + band * Math.cos(t * .65);
      return [Math.cos(t) * r, (p.u - .5) * 2.6 + band * Math.sin(t * .65), Math.sin(t) * r];
    }
    return [(p.u - .5) * 4.6, (p.v - .5) * 3.1, (p.w - .5) * 2.8];
  }
  for (const name of ['bulb', 'scatter', 'ribbon', 'ambient']) {
    const xyz = new Float32Array(total * 3), rgb = new Float32Array(total * 3);
    for (let i = 0; i < total; i++) {
      const p = points[i];
      let pos = surface(name, p);
      const patch = Math.sin(p.u * 24 + p.v * 13) + Math.cos(p.v * 27 - p.u * 8);
      let c = patch > .8 ? gold : patch < -1 ? purple : patch < -.4 ? teal : white;
      let brightness = name === 'ambient' ? .2 : .9;
      if (name === 'bulb') {
        const y = pos[1] + Math.sin(p.u * tau * 2) * .045;
        c = y > .35 ? blendColor(white, gold, (y - .35) / .7)
          : y > -.55 ? blendColor(purple, white, (y + .55) / .9)
          : blendColor(teal, purple, (y + 1.25) / .7);
      }
      if (name === 'ribbon') { c = palette[Math.min(4, Math.floor(p.u * 5))]; brightness = .45; }
      if (i >= count) { pos = [(p.u - .5) * 2.2, (p.v - .5) * 2.2, p.w]; c = palette[i % palette.length]; brightness = 1; }
      xyz.set(pos, i * 3);
      rgb[i * 3] = c[0] * brightness; rgb[i * 3 + 1] = c[1] * brightness; rgb[i * 3 + 2] = c[2] * brightness;
    }
    positions[name] = xyz; colors[name] = rgb;
  }
  for (let i = 0; i < total; i++) {
    const p = points[i];
    data.set([p.w, i < count ? (compact ? 6 + p.s * 4 : 10 + p.s * 6) : (compact ? 8 + p.s * 16 : 12 + p.s * 26), p.u * tau, i >= count ? 1 : 0], i * 4);
  }
  const scenes = {
    'bulb-right': { shape: 'bulb', x: .73, y: .5, size: .82, ry: -.15, rz: -.18, opacity: 1, density: 1 },
    scatter: { shape: 'scatter', x: .5, y: .5, size: 1.2, ry: .1, rz: 0, opacity: .46, density: .65 },
    bulb: { shape: 'bulb', x: .29, y: .53, size: .86, ry: .2, rz: .25, opacity: 1, density: 1 },
    ambient: { shape: 'ambient', x: .5, y: .5, size: 1.4, ry: .3, rz: 0, opacity: .25, density: .13 },
    ribbon: { shape: 'ribbon', x: .5, y: .5, size: .88, ry: .4, rz: -.2, opacity: .48, density: .8 }
  };
  let width = 1, height = 1, dpr = 1, stops = [], frame = 0, last = 0, shapePair = '';
  let renderer = null, atmosphere = null, isWebGL = false, contextLost = false, layoutFrame = 0;
  let quality = 1, slowTime = 0, lastQualityChange = 0, frameInterval = 16.67;
  let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0, pointerOn = false, pointerStrength = 0;
  let cameraX = 0, cameraY = 0, visualScroll = scrollY, timelineTime = 0;
  const params = { a: scenes['bulb-right'], b: scenes['bulb-right'], t: 0, cx: 0, cy: 0, scale: 1, rotationX: 0, rotationY: 0, rotationZ: 0, opacity: 1, density: 1, flow: 0, transition: 0, pose: 0, scroll: 0, time: 0, drawCount: count };
  let artReady = false, activeScene = '';
  function sceneAt(scroll) {
    let i = 0;
    while (i < stops.length - 1 && scroll > stops[i + 1].at) i++;
    const from = stops[i], to = stops[Math.min(i + 1, stops.length - 1)];
    const progress = from === to ? 0 : clamp((scroll - from.at) / Math.max(1, to.at - from.at));
    params.a = scenes[from.name]; params.b = scenes[to.name];
    // Hold a coherent silhouette, then release/gather; never stretch it for an entire scene.
    const dispersing = params.a.shape === 'bulb' && params.b.shape !== 'bulb';
    const gathering = params.b.shape === 'bulb' && params.a.shape !== 'bulb';
    params.t = smooth(clamp((progress - (dispersing ? .29 : gathering ? .12 : .18)) / (dispersing ? .56 : gathering ? .74 : .66)));
    params.pose = smooth(clamp((progress - .05) / .82));
    params.transition = params.a.shape !== params.b.shape ? 1 : 0;
    params.flow = params.transition * Math.sin(params.t * Math.PI);
    const name = progress < .5 ? from.name : to.name;
    if (activeScene !== name) { activeScene = name; canvas.dataset.scene = name; }
    return i;
  }
  const vertex = `
    precision highp float;
    attribute vec3 aFrom, aTo, aColorFrom, aColorTo;
    attribute vec4 aData;
    uniform vec2 uViewport, uCenter, uPointer;
    uniform vec4 uRotation;
    uniform vec2 uTilt;
    uniform float uMix, uTime, uScale, uDpr, uOpacity, uDensity, uFlow, uTransition, uPointerStrength;
    varying vec3 vColor;
    varying vec2 vSpin, vTilt;
    varying float vAlpha;
    void main() {
      float stagger = aData.x * .22 * uTransition;
      float localMix = clamp((uMix - stagger) / (1. - .22 * uTransition), 0., 1.);
      localMix = localMix * localMix * (3. - 2. * localMix);
      vec3 p = mix(aFrom, aTo, localMix);
      float path = sin(localMix * 3.14159265) * uTransition;
      // Curved trajectories unfold across depth before settling into the next form.
      float winding = aData.z + localMix * 2.4;
      p += vec3(sin(winding), cos(winding * 1.3), sin(winding * .8 + aData.x * 5.)) * path * .33;
      float drift = .009 + uFlow * .055;
      p += vec3(sin(p.y * 3. + uTime * .38 + aData.z), cos(p.x * 3. + uTime * .31 + aData.z), sin(uTime * .27 + aData.z)) * drift;
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
        float force = 1. - smoothstep(0., 110., length(delta));
        pixel += normalize(delta + .001) * force * force * 28. * uPointerStrength;
        vec2 clip = pixel / uViewport * 2. - 1.;
        gl_Position = vec4(clip.x, -clip.y, 0., 1.);
        gl_PointSize = aData.y * uDpr * perspective;
        float presence = 1. - smoothstep(uDensity - .06, uDensity + .06, aData.x);
        vAlpha = clamp(.6 + p.z * .42, .15, 1.) * uOpacity * presence;
        if (presence < .001) { gl_Position = vec4(3., 3., 0., 1.); gl_PointSize = 1.; }
      }
      float angle = aData.z + uTime * (.085 + aData.x * .085);
      vSpin = vec2(cos(angle), sin(angle));
      vTilt = vec2(.77 + .23 * sin(uTime * .19 + aData.z), .82 + .18 * cos(uTime * .17 + aData.z));
      vColor = mix(aColorFrom, aColorTo, localMix);
    }
  `;
  const fragment = `
    precision mediump float;
    varying vec3 vColor;
    varying vec2 vSpin, vTilt;
    varying float vAlpha;
    void main() {
      vec2 p = (gl_PointCoord - .5) * 2.8;
      p = mat2(vSpin.x, -vSpin.y, vSpin.y, vSpin.x) * p;
      p /= vTilt;
      float edge = min(p.y + .48, (.94 - p.y - 1.73205 * abs(p.x)) * .5);
      if (edge < -.035) discard;
      float outer = smoothstep(-.035, .025, edge);
      float line = 1. - smoothstep(.045, .21, edge);
      gl_FragColor = vec4(vColor, outer * (line * .94 + .045) * vAlpha);
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
    for (const name of ['Viewport', 'Center', 'Pointer', 'Mix', 'Time', 'Scale', 'Dpr', 'Rotation', 'Tilt', 'Opacity', 'Density', 'Flow', 'Transition', 'PointerStrength']) uniforms[name] = gl.getUniformLocation(program, 'u' + name);
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
    return () => {
      const { a, b, t } = params;
      const key = a.shape + ':' + b.shape;
      if (shapePair !== key || atmosphere) {
        for (const [name, buffer] of [['From', buffers[a.shape].position], ['To', buffers[b.shape].position], ['ColorFrom', buffers[a.shape].color], ['ColorTo', buffers[b.shape].color]]) {
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.vertexAttribPointer(locations[name], 3, gl.FLOAT, false, 0, 0);
        }
        shapePair = key;
      }
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, pointData); gl.vertexAttribPointer(locations.Data, 4, gl.FLOAT, false, 0, 0);
      gl.viewport(0, 0, canvas.width, canvas.height); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uniforms.Viewport, width, height); gl.uniform2f(uniforms.Center, params.cx, params.cy); gl.uniform2f(uniforms.Pointer, pointerX, pointerY);
      gl.uniform4f(uniforms.Rotation, Math.cos(params.rotationY), Math.sin(params.rotationY), Math.cos(params.rotationZ), Math.sin(params.rotationZ));
      gl.uniform1f(uniforms.Mix, t); gl.uniform1f(uniforms.Time, params.time); gl.uniform1f(uniforms.Scale, params.scale);
      gl.uniform1f(uniforms.Dpr, dpr); gl.uniform1f(uniforms.Opacity, params.opacity);
      gl.uniform2f(uniforms.Tilt, Math.cos(params.rotationX), Math.sin(params.rotationX));
      gl.uniform1f(uniforms.Density, params.density); gl.uniform1f(uniforms.Flow, params.flow);
      gl.uniform1f(uniforms.Transition, params.transition); gl.uniform1f(uniforms.PointerStrength, pointerStrength);
      gl.drawArrays(gl.POINTS, 0, params.drawCount);
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
      uniform float uTime, uScroll;
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
        vAlpha = aStyle.w * (.45 + aOrigin.z * .75);
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
    const time = gl.getUniformLocation(program, 'uTime'), scroll = gl.getUniformLocation(program, 'uScroll');
    return () => {
      gl.useProgram(program);
      for (const binding of bindings) { gl.bindBuffer(gl.ARRAY_BUFFER, binding.buffer); gl.vertexAttribPointer(binding.location, binding.size, gl.FLOAT, false, 0, 0); }
      gl.uniform2f(viewport, width, height); gl.uniform2f(camera, cameraX, cameraY);
      gl.uniform1f(time, params.time); gl.uniform1f(scroll, params.scroll);
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
    return () => {
      const { a, b, t, cx, cy, scale, rotationY, rotationZ, opacity, time } = params;
      const from = positions[a.shape], to = positions[b.shape];
      const fromColor = colors[a.shape], toColor = colors[b.shape];
      const css = cssColors[t < .5 ? a.shape : b.shape];
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
      const ca = Math.cos(rotationY), sa = Math.sin(rotationY), cr = Math.cos(rotationZ), sr = Math.sin(rotationZ);
      const turnC = Math.cos(time * .035), turnS = Math.sin(time * .035);
      const stride = Math.max(2, Math.ceil(params.drawCount / 1000));
      ctx.lineWidth = .8;
      for (let i = 0; i < total; i = i < count ? Math.min(count, i + stride) : i + 1) {
        if (i < count && i >= params.drawCount) { i = count - 1; continue; }
        const index = i * 3, ambient = i >= count, p = points[i];
        if (ambient) continue;
        const stagger = p.w * .22 * params.transition;
        const q = smooth(clamp((t - stagger) / (1 - .22 * params.transition)));
        const path = Math.sin(q * Math.PI) * params.transition;
        const winding = data[i * 4 + 2] + q * 2.4;
        let x = mix(from[index], to[index], q) + Math.sin(winding) * path * .33;
        let y = mix(from[index + 1], to[index + 1], q) + Math.cos(winding * 1.3) * path * .33;
        const depth = mix(from[index + 2], to[index + 2], q) + Math.sin(winding * .8 + p.w * 5) * path * .33;
        const tiltC = Math.cos(params.rotationX), tiltS = Math.sin(params.rotationX);
        const z0 = depth * tiltC - y * tiltS; y = y * tiltC + depth * tiltS;
        const z = z0 * ca - x * sa;
        x = x * ca + z0 * sa;
        const rotatedX = x * cr - y * sr; y = x * sr + y * cr;
        const perspective = 4.5 / (4.5 - z);
        let px = ambient ? p.u * width : cx + rotatedX * scale * perspective;
        let py = ambient ? p.v * height : cy - y * scale * perspective;
        if (!ambient && !reduced.matches && pointerStrength > .01) {
          const dx = px - pointerX, dy = py - pointerY, distance = Math.hypot(dx, dy);
          if (distance > 0 && distance < 110) { const force = (1 - distance / 110) ** 2 * 28 * pointerStrength; px += dx / distance * force; py += dy / distance * force; }
        }
        const size = data[i * 4 + 1] * (ambient ? .45 : .38 * perspective);
        const presence = 1 - smooth(clamp((p.w - params.density + .06) / .12));
        if (!ambient && presence < .001) continue;
        const cr0 = Math.round(mix(fromColor[index], toColor[index], q) * 255);
        const cg0 = Math.round(mix(fromColor[index + 1], toColor[index + 1], q) * 255);
        const cb0 = Math.round(mix(fromColor[index + 2], toColor[index + 2], q) * 255);
        ctx.strokeStyle = params.transition ? `rgb(${cr0},${cg0},${cb0})` : css[i];
        ctx.globalAlpha = ambient ? .17 : clamp(.6 + z * .42, .15, 1) * opacity * presence;
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
  function measureStops() {
    stops = sections.map(section => {
      const panel = section.querySelector('.story-panel');
      return { name: section.dataset.scene, at: section.getBoundingClientRect().top + scrollY, panelBottom: panel ? panel.getBoundingClientRect().bottom + scrollY - (parseFloat(panel.style.getPropertyValue('--story-y')) || 0) : 0 };
    });
  }
  function setResolution() {
    // Bound fullscreen fill-rate, especially on Retina and 4K displays.
    dpr = Math.min(devicePixelRatio || 1, 1.35, Math.sqrt(2000000 / Math.max(1, width * height))) * Math.sqrt(quality);
    const pixelWidth = Math.max(1, Math.round(width * dpr)), pixelHeight = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) { canvas.width = pixelWidth; canvas.height = pixelHeight; }
  }
  function resize() {
    width = innerWidth; height = innerHeight; setResolution(); measureStops(); draw(performance.now(), 16.67);
  }
  function queueLayout() {
    if (layoutFrame) return;
    layoutFrame = requestAnimationFrame(() => { layoutFrame = 0; resize(); });
  }
  function draw(now, delta) {
    if (!renderer || contextLost || !stops.length) return;
    const elapsed = Math.min(delta, 50);
    visualScroll = reduced.matches ? scrollY : mix(visualScroll, scrollY, 1 - Math.exp(-elapsed / 105));
    if (Math.abs(visualScroll - scrollY) < .1) visualScroll = scrollY;
    const scroll = visualScroll, i = sceneAt(scroll), a = params.a, b = params.b, t = params.t, pose = params.pose;
    const mobile = width <= 760;
    params.time = reduced.matches ? 0 : timelineTime; params.scroll = scroll;
    params.cx = mobile ? width * .5 : width * mix(a.x, b.x, pose);
    params.cy = height * mix(a.y, b.y, pose);
    params.scale = (mobile ? Math.min(width * .39, height * .23) : Math.min(width * .275, height * .445)) * mix(a.size, b.size, pose);
    if (mobile) {
      const from = stops[i], to = stops[Math.min(i + 1, stops.length - 1)];
      const offset = 45 + params.scale * 1.15;
      const fromY = a.shape === 'scatter' || a.shape === 'ambient' ? height * .52 : from.panelBottom - scroll + offset;
      const toY = b.shape === 'scatter' || b.shape === 'ambient' ? height * .52 : to.panelBottom - scroll + offset;
      params.cy = mix(fromY, toY, pose);
    }
    if (reduced.matches) { cameraX = 0; cameraY = 0; pointerStrength = 0; }
    const follow = 1 - Math.exp(-elapsed / 170);
    const targetCameraX = pointerOn && !reduced.matches ? targetX / width * 2 - 1 : 0;
    const targetCameraY = pointerOn && !reduced.matches ? 1 - targetY / height * 2 : 0;
    cameraX += (targetCameraX - cameraX) * follow; cameraY += (targetCameraY - cameraY) * follow;
    pointerX += (targetX - pointerX) * follow; pointerY += (targetY - pointerY) * follow;
    pointerStrength += ((pointerOn && !reduced.matches ? 1 : 0) - pointerStrength) * follow;
    params.cx += cameraX * (mobile ? 0 : 13); params.cy -= cameraY * (mobile ? 0 : 9);
    params.rotationX = cameraY * .10;
    params.rotationY = mix(a.ry, b.ry, pose) + cameraX * .19 + (reduced.matches ? 0 : Math.sin(params.time * .17) * .075);
    params.rotationZ = mix(a.rz, b.rz, pose); params.opacity = mix(a.opacity, b.opacity, t);
    params.drawCount = Math.max(1, Math.floor(count * quality));
    params.density = mix(a.density, b.density, t);
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
  bindContextEvents(); init();
  if ('ResizeObserver' in window) { const layout = new ResizeObserver(queueLayout); sections.forEach(section => layout.observe(section)); }
})();
