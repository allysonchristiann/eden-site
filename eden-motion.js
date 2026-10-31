/* EDEN — continuous procedural particle scenes. No model, CDN or runtime library. */
(() => {
  'use strict';
  let canvas = document.getElementById('edenParticles');
  const sections = [...document.querySelectorAll('.story-section[data-scene]')];
  if (!canvas || !sections.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 760px)').matches;
  const count = compact ? 3600 : 14500;
  const ambientCount = compact ? 38 : 85;
  const total = count + ambientCount;
  let state = 7321;
  const random = () => { state = state * 16807 % 2147483647; return (state - 1) / 2147483646; };
  const tau = Math.PI * 2;
  const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const color = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const gold = color('#edbe34'), white = color('#e8e3ef'), purple = color('#8951e9'), teal = color('#238d84'), navy = color('#456cae');
  const palette = [gold, white, purple, teal, navy];
  const points = Array.from({ length: total }, () => ({ u: random(), v: random(), w: random(), s: random() }));
  const positions = {}, colors = {};
  const data = new Float32Array(total * 4);
  const landmasses = [
    [[-168,66],[-135,73],[-105,72],[-58,52],[-81,25],[-98,18],[-117,31],[-125,49]],
    [[-81,12],[-61,9],[-35,-7],[-45,-25],[-70,-56],[-78,-31]],
    [[-19,35],[10,38],[35,31],[51,10],[40,-13],[20,-35],[9,-29],[-6,2]],
    [[-10,36],[-9,58],[22,72],[57,67],[86,77],[142,61],[172,52],[134,29],[115,1],[98,8],[77,9],[54,29],[29,41]],
    [[113,-12],[137,-10],[154,-23],[149,-39],[116,-35]],
    [[-53,60],[-24,70],[-35,83],[-60,79]],
    [[45,-13],[50,-12],[48,-25],[43,-26]]
  ];
  function inside(x, y, polygon) {
    let hit = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  }
  function surface(name, i, p) {
    const u = p.u * tau, z = 2 * p.v - 1, r = Math.sqrt(1 - z * z);
    const sx = Math.cos(u) * r, sz = Math.sin(u) * r;
    if (name === 'brain') {
      if (i % 29 === 0) { // A subtle brainstem below the folded cortex.
        return [(p.u - .5) * .19 + .32, -.73 - p.v * .56, (p.w - .5) * .19];
      }
      const folds = .055 * Math.sin(u * 11 + z * 12) + .035 * Math.cos(u * 17 - z * 19);
      const groove = Math.pow(Math.abs(Math.sin(u * 5 + z * 7 + .5 * Math.sin(z * 8))), 12) * .075;
      const radius = 1 + folds - groove;
      const fissure = 1 - .1 * Math.exp(-sz * sz * 100);
      return [sx * 1.24 * radius, (z * .9 + .09 * Math.cos(u * 2)) * radius * fissure, sz * .73 * radius];
    }
    if (name === 'bulb') {
      if (p.v < .72) {
        const yy = 1.1 - p.v / .72 * 1.7;
        const rr = yy >= -.15
          ? .8 * Math.sqrt(Math.max(0, 1 - ((yy - .3) / .8) ** 2))
          : mix(.6614, .27, smooth(clamp((-.15 - yy) / .45)));
        return [Math.cos(u) * rr, yy, Math.sin(u) * rr];
      }
      const t = (p.v - .72) / .28;
      const rr = t < .75 ? .27 + .024 * Math.sin(t * 54) : .27 * Math.sqrt((1 - t) / .25);
      return [Math.cos(u) * rr, -.6 - t * .65, Math.sin(u) * rr];
    }
    if (name === 'globe') return [sx, z, sz];
    if (name === 'ribbon') {
      const t = p.u * tau * 1.75;
      const band = (p.v - .5) * .9;
      const rad = .46 + band * Math.cos(t * .65);
      return [Math.cos(t) * rad, (p.u - .5) * 2.6 + band * Math.sin(t * .65), Math.sin(t) * rad];
    }
    // Dispersed points maintain their identities throughout every transition.
    return [(p.u - .5) * 4.6, (p.v - .5) * 3.1, (p.w - .5) * 2.8];
  }
  for (const name of ['brain', 'scatter', 'bulb', 'globe', 'ribbon', 'ambient']) {
    const xyz = new Float32Array(total * 3), rgb = new Float32Array(total * 3);
    for (let i = 0; i < total; i++) {
      const p = points[i];
      let pos = surface(name, i, p);
      const patch = Math.sin(p.u * 24 + p.v * 13) + Math.cos(p.v * 27 - p.u * 8);
      let c = patch > .8 ? gold : patch < -1 ? purple : patch < -.4 ? teal : white;
      let brightness = .8;
      if (name === 'bulb') {
        c = pos[1] > .58 ? gold : pos[1] < -.75 ? teal : pos[1] < -.33 ? purple : white;
      } else if (name === 'globe') {
        const lon = p.u * 360 - 180, lat = Math.asin(p.v * 2 - 1) * 180 / Math.PI;
        const land = landmasses.some(poly => inside(lon, lat, poly));
        c = land ? palette[Math.floor(p.w * palette.length)] : navy;
        brightness = land ? 1 : .13;
      } else if (name === 'ribbon') {
        c = palette[Math.min(4, Math.floor(p.u * 5))];
        brightness = .45;
      } else if (name === 'ambient') brightness = .28;
      if (i >= count) {
        pos = [(p.u - .5) * 2.2, (p.v - .5) * 2.2, p.w];
        c = palette[i % palette.length]; brightness = 1;
      }
      xyz.set(pos, i * 3); rgb.set(c.map(v => v * brightness), i * 3);
    }
    positions[name] = xyz; colors[name] = rgb;
  }
  for (let i = 0; i < total; i++) {
    const p = points[i];
    data.set([p.w, i < count ? (compact ? 6 + p.s * 5 : 10 + p.s * 8) : (compact ? 8 + p.s * 22 : 15 + p.s * 37), p.u * tau, i >= count ? 1 : 0], i * 4);
  }
  let width = 1, height = 1, dpr = 1, stops = [], frame = 0, last = 0, pair = '';
  let renderer, isWebGL = false;
  let pointer = [-9, -9], targetPointer = [-9, -9];
  const scenes = {
    'brain-right': { shape: 'brain', x: .72, y: .53, size: .92, ry: -.2, rz: .04, opacity: 1 },
    'brain-left': { shape: 'brain', x: .27, y: .54, size: 1, ry: .5, rz: -.05, opacity: 1 },
    scatter: { shape: 'scatter', x: .5, y: .5, size: 1.25, ry: .1, rz: 0, opacity: .58 },
    bulb: { shape: 'bulb', x: .29, y: .53, size: .89, ry: .2, rz: .3, opacity: 1 },
    globe: { shape: 'globe', x: .74, y: .56, size: 1.15, ry: -.6, rz: -.1, opacity: 1 },
    ambient: { shape: 'ambient', x: .5, y: .5, size: 1.4, ry: .3, rz: 0, opacity: .35 },
    ribbon: { shape: 'ribbon', x: .5, y: .5, size: .92, ry: .4, rz: -.2, opacity: .48 }
  };
  function sceneAt(scroll) {
    let i = 0;
    while (i < stops.length - 1 && scroll > stops[i + 1].at) i++;
    const a = stops[i], b = stops[Math.min(i + 1, stops.length - 1)];
    const progress = a === b ? 0 : clamp((scroll - a.at) / Math.max(1, b.at - a.at));
    return { aSection: a.element, bSection: b.element, a: scenes[a.name], b: scenes[b.name], t: smooth(clamp((progress - .12) / .76)), name: progress < .5 ? a.name : b.name };
  }
  const vertex = `
    precision highp float;
    attribute vec3 aFrom, aTo, aColorFrom, aColorTo;
    attribute vec4 aData;
    uniform vec2 uViewport, uCenter, uPointer;
    uniform float uMix, uTime, uScale, uDpr, uRotateY, uRotateZ, uOpacity;
    varying vec3 vColor;
    varying float vAlpha, vAngle;
    void main() {
      vec3 p = mix(aFrom, aTo, uMix);
      float t = uTime;
      if (aData.w > .5) {
        p.xy += vec2(sin(t * .18 + aData.z), cos(t * .13 + aData.z)) * .035;
        gl_Position = vec4(p.x, p.y, 0., 1.);
        gl_PointSize = aData.y * uDpr;
        vAlpha = .12 + aData.x * .3;
      } else {
        float cy = cos(uRotateY), sy = sin(uRotateY);
        p.xz = mat2(cy, -sy, sy, cy) * p.xz;
        float cz = cos(uRotateZ), sz = sin(uRotateZ);
        p.xy = mat2(cz, sz, -sz, cz) * p.xy;
        p += vec3(sin(t * .45 + aData.z), cos(t * .3 + aData.z), 0.) * .008;
        float perspective = 4.5 / (4.5 - p.z);
        vec2 pixel = uCenter + vec2(p.x, -p.y) * uScale * perspective;
        vec2 delta = pixel - uPointer;
        float dist = length(delta);
        pixel += normalize(delta + .001) * pow(1. - smoothstep(0., 110., dist), 2.) * 25.;
        vec2 clip = pixel / uViewport * 2. - 1.;
        gl_Position = vec4(clip.x, -clip.y, 0., 1.);
        gl_PointSize = aData.y * uDpr * perspective;
        vAlpha = clamp(.68 + p.z * .45, .22, 1.) * uOpacity;
      }
      vAngle = aData.z + t * .035;
      vColor = mix(aColorFrom, aColorTo, uMix);
    }
  `;
  const fragment = `
    precision mediump float;
    varying vec3 vColor;
    varying float vAlpha, vAngle;
    void main() {
      vec2 p = (gl_PointCoord - .5) * 2.8;
      float c = cos(vAngle), s = sin(vAngle);
      p = mat2(c, -s, s, c) * p;
      float edge = min(p.y + .48, (.94 - p.y - 1.73205 * abs(p.x)) * .5);
      if (edge < -.035) discard;
      float outer = smoothstep(-.035, .025, edge);
      float line = 1. - smoothstep(.045, .21, edge);
      gl_FragColor = vec4(vColor, outer * (line * .94 + .045) * vAlpha);
    }
  `;
  function webglRenderer(gl) {
    function shader(type, source) {
      const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex)); gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const uniforms = Object.fromEntries(['Viewport', 'Center', 'Pointer', 'Mix', 'Time', 'Scale', 'Dpr', 'RotateY', 'RotateZ', 'Opacity'].map(name => [name, gl.getUniformLocation(program, 'u' + name)]));
    const buffers = {};
    for (const name of ['From', 'To', 'ColorFrom', 'ColorTo', 'Data']) {
      const buffer = gl.createBuffer(), location = gl.getAttribLocation(program, 'a' + name);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, name === 'Data' ? 4 : 3, gl.FLOAT, false, 0, 0);
      if (name === 'Data') gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      buffers[name] = buffer;
    }
    gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    return params => {
      const { a, b, t, cx, cy, scale, rotationY, rotationZ, opacity, time } = params;
      const key = a.shape + ':' + b.shape;
      if (pair !== key) {
        for (const [name, array] of [['From', positions[a.shape]], ['To', positions[b.shape]], ['ColorFrom', colors[a.shape]], ['ColorTo', colors[b.shape]]]) {
          gl.bindBuffer(gl.ARRAY_BUFFER, buffers[name]); gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW);
        }
        pair = key;
      }
      gl.viewport(0, 0, canvas.width, canvas.height); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uniforms.Viewport, width, height); gl.uniform2f(uniforms.Center, cx, cy);
      gl.uniform2f(uniforms.Pointer, pointer[0], pointer[1]);
      for (const [name, value] of [['Mix', t], ['Time', time], ['Scale', scale], ['Dpr', dpr], ['RotateY', rotationY], ['RotateZ', rotationZ], ['Opacity', opacity]]) gl.uniform1f(uniforms[name], value);
      gl.drawArrays(gl.POINTS, 0, total);
    };
  }
  function canvasRenderer(ctx) {
    const stride = compact ? 3 : 4;
    return ({ a, b, t, cx, cy, scale, rotationY, rotationZ, opacity, time }) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
      const ca = Math.cos(rotationY), sa = Math.sin(rotationY), cr = Math.cos(rotationZ), sr = Math.sin(rotationZ);
      for (let i = 0; i < total; i += i >= count ? 1 : stride) {
        const index = i * 3, p = points[i], ambient = i >= count;
        let x = mix(positions[a.shape][index], positions[b.shape][index], t);
        let y = mix(positions[a.shape][index + 1], positions[b.shape][index + 1], t);
        const z0 = mix(positions[a.shape][index + 2], positions[b.shape][index + 2], t);
        const z = z0 * ca - x * sa; x = x * ca + z0 * sa;
        const rotatedX = x * cr - y * sr; y = x * sr + y * cr;
        const perspective = 4.5 / (4.5 - z);
        let px = ambient ? p.u * width : cx + rotatedX * scale * perspective;
        let py = ambient ? p.v * height : cy - y * scale * perspective;
        const dx = px - pointer[0], dy = py - pointer[1], distance = Math.hypot(dx, dy);
        if (!ambient && !reduced.matches && distance > 0 && distance < 110) {
          const force = (1 - distance / 110) ** 2 * 25;
          px += dx / distance * force; py += dy / distance * force;
        }
        const size = data[i * 4 + 1] * (ambient ? .45 : .38 * perspective);
        const rgb = [0, 1, 2].map(k => Math.round(clamp(mix(colors[a.shape][index + k], colors[b.shape][index + k], t)) * 255));
        ctx.strokeStyle = `rgb(${rgb.join(',')})`; ctx.lineWidth = .7;
        ctx.globalAlpha = ambient ? .25 : clamp(.5 + z * .42, .08, 1) * opacity;
        ctx.beginPath();
        for (let j = 0; j < 3; j++) {
          const angle = j * tau / 3 + p.u * tau + time * .035;
          const tx = px + Math.cos(angle) * size, ty = py + Math.sin(angle) * size;
          if (!j) ctx.moveTo(tx, ty); else ctx.lineTo(tx, ty);
        }
        ctx.closePath(); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
  }
  function init() {
    let gl = null;
    try { gl = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power', premultipliedAlpha: true }); } catch (_) { /* Canvas is a supported fallback. */ }
    if (gl) {
      try { renderer = webglRenderer(gl); isWebGL = true; } catch (error) { console.warn('EDEN: renderização indisponível', error); }
    }
    if (!renderer) {
      // A canvas with a WebGL context cannot acquire a 2D context.
      if (gl) {
        const replacement = canvas.cloneNode(false);
        canvas.replaceWith(replacement); canvas = replacement;
      }
      const ctx = canvas.getContext('2d'); if (ctx) renderer = canvasRenderer(ctx);
    }
    if (!renderer) { document.documentElement.classList.add('art-unavailable'); return; }
    canvas.dataset.renderer = isWebGL ? 'webgl' : 'canvas';
    resize(); restart();
  }
  function measureStops() {
    stops = sections.map(section => ({ name: section.dataset.scene, element: section, at: section.getBoundingClientRect().top + scrollY }));
  }
  function resize() {
    width = innerWidth; height = innerHeight; dpr = Math.min(devicePixelRatio || 1, compact ? 1.5 : 1.75);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    measureStops();
    draw(performance.now());
  }
  function draw(now) {
    if (!renderer || !stops.length) return;
    const { a, b, t, name, aSection, bSection } = sceneAt(scrollY);
    const mobile = width <= 760;
    const time = reduced.matches ? 0 : now * .001;
    const cx = mobile ? width * .5 : width * mix(a.x, b.x, t);
    let cy = height * mix(a.y, b.y, t);
    const scale = mobile ? Math.min(width * .39, height * .23) * mix(a.size, b.size, t) : Math.min(width * .275, height * .445) * mix(a.size, b.size, t);
    if (mobile) {
      const artCenter = (section, scene) => {
        if (scene.shape === 'scatter' || scene.shape === 'ambient') return height * .52;
        const panel = section.querySelector('.story-panel');
        return (panel?.getBoundingClientRect().bottom || height * .5) + 45 + scale * 1.15;
      };
      cy = mix(artCenter(aSection, a), artCenter(bSection, b), t);
    }
    const rotationY = mix(a.ry, b.ry, t) + (reduced.matches ? 0 : Math.sin(time * .13) * .12);
    const rotationZ = mix(a.rz, b.rz, t);
    const opacity = mix(a.opacity, b.opacity, t);
    if (reduced.matches) pointer = [-9999, -9999];
    else pointer = pointer.map((value, i) => mix(value, targetPointer[i], .12));
    renderer({ a, b, t, cx, cy, scale, rotationY, rotationZ, opacity, time });
    canvas.dataset.scene = name;
    document.documentElement.dataset.artReady = 'true';
  }
  function animate(now) {
    frame = requestAnimationFrame(animate);
    if (document.hidden || now - last < (compact ? 32 : 24)) return;
    last = now; draw(now);
  }
  function restart() {
    cancelAnimationFrame(frame); frame = 0;
    if (document.hidden || !renderer) return;
    last = 0; draw(performance.now());
    if (!reduced.matches) frame = requestAnimationFrame(animate);
  }
  addEventListener('pointermove', e => { if (e.pointerType !== 'touch') targetPointer = [e.clientX, e.clientY]; }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { targetPointer = [-9999, -9999]; });
  addEventListener('scroll', () => { if (reduced.matches) draw(performance.now()); }, { passive: true });
  addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', restart);
  reduced.addEventListener('change', restart);
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); cancelAnimationFrame(frame); canvas.dataset.renderer = 'context-lost'; });
  canvas.addEventListener('webglcontextrestored', () => { pair = ''; init(); });
  init();
  // The service carousel changes section heights after the deferred UI script runs.
  // Keep scroll anchors current after layout, font, orientation or viewport changes.
  if ('ResizeObserver' in window) {
    const layout = new ResizeObserver(() => { measureStops(); draw(performance.now()); });
    sections.forEach(section => layout.observe(section));
  }
})();
