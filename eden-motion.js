(async () => {
  "use strict";

  const hero = document.querySelector("#inicio");
  const original = document.querySelector("#edenParticles");
  if (!hero || !original) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = matchMedia("(max-width: 750px)").matches;

  function fallback() {
    document.documentElement.classList.add("eden-motion-fallback");
    const script = document.createElement("script");
    script.src = "eden-constellation.js?v=3.0";
    document.body.append(script);
  }

  let THREE;

  try {
    THREE = await import(
      "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js"
    );
  } catch (error) {
    console.warn("WebGL indisponivel:", error);
    fallback();
    return;
  }

  const root = document.createElement("div");
  root.id = "eden-motion-layer";
  root.setAttribute("aria-hidden", "true");
  document.body.prepend(root);

  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: mobile ? "low-power" : "high-performance"
    });
  } catch (error) {
    root.remove();
    fallback();
    return;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(
    Math.min(devicePixelRatio || 1, mobile ? 1.3 : 1.8)
  );

  root.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, .1, 100);
  camera.position.z = 13;

  const group = new THREE.Group();
  scene.add(group);

  const rand = (a, b) => a + Math.random() * (b - a);

  const smooth = (a, b, v) => {
    const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  const palette = [
    0xd8b474, 0xf1d59e, 0x8daac8,
    0x3e669a, 0xe9e6dc, 0xb38b51
  ].map(c => new THREE.Color(c));

  // Mascara da lampada
  const mask = document.createElement("canvas");
  mask.width = 520;
  mask.height = 640;

  const m = mask.getContext("2d", {
    willReadFrequently: true
  });

  m.fillStyle = "#fff";
  m.beginPath();
  m.moveTo(260, 33);
  m.bezierCurveTo(129, 33, 59, 132, 73, 252);
  m.bezierCurveTo(78, 330, 128, 374, 165, 412);
  m.bezierCurveTo(190, 439, 193, 450, 194, 464);
  m.lineTo(326, 464);
  m.bezierCurveTo(327, 450, 330, 439, 355, 412);
  m.bezierCurveTo(392, 374, 442, 330, 447, 252);
  m.bezierCurveTo(461, 132, 391, 33, 260, 33);
  m.fill();

  for (const [x, y, w, h] of [
    [194, 458, 132, 113],
    [213, 565, 94, 25],
    [231, 584, 58, 21]
  ]) {
    m.fillRect(x, y, w, h);
  }

  const maskPixels = m.getImageData(0, 0, 520, 640).data;
  const n = reduced ? 3000 : mobile ? 4200 : 11500;

  const pos = new Float32Array(n * 3);
  const target = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const seeds = new Float32Array(n);
  const sizes = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    let x, y;

    do {
      x = rand(70, 448);
      y = rand(35, 604);
    } while (
      maskPixels[
        (Math.floor(y) * 520 + Math.floor(x)) * 4 + 3
      ] < 100
    );

    const j = i * 3;

    // Posicao inicial: lampada
    pos[j] = (x - 260) / 96;
    pos[j + 1] = (318 - y) / 138;
    pos[j + 2] = rand(-.48, .48);

    // Posicao final: constelacao 3D
    const a = rand(0, Math.PI * 2);
    const z = rand(-1, 1);
    const surface = Math.random() < .82
      ? rand(.87, 1.02)
      : rand(.28, .92);

    const r = Math.sqrt(1 - z * z) * surface;
    const side = i % 2 ? -1 : 1;

    target[j] = (
      side * .54 + Math.cos(a) * r * .98
    ) * 1.7;

    target[j + 1] = z * r * .92 * 1.9;
    target[j + 2] = Math.sin(a) * r * .9 + rand(-.12, .12);

    const c = palette[Math.floor(rand(0, palette.length))];

    colors[j] = c.r;
    colors[j + 1] = c.g;
    colors[j + 2] = c.b;

    seeds[i] = rand(0, Math.PI * 2);
    sizes[i] = rand(3.3, 8.4);
  }

  function buildGeometry(p, t, c, s, sizesArray) {
    const g = new THREE.BufferGeometry();

    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("aTarget", new THREE.BufferAttribute(t, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(c, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(s, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(sizesArray, 1));

    return g;
  }

  const uniforms = {
    uTime: { value: 0 },
    uMorph: { value: 0 },
    uScatter: { value: 0 },
    uOpacity: { value: 1 },
    uPointer: { value: new THREE.Vector2(-9, -9) },
    uPointerStrength: { value: 0 },
    uPixelRatio: { value: renderer.getPixelRatio() }
  };

  const vertexShader = `
    attribute vec3 aTarget;
    attribute vec3 aColor;
    attribute float aSeed;
    attribute float aSize;

    uniform float uTime, uMorph, uScatter;
    uniform float uPixelRatio, uPointerStrength;
    uniform vec2 uPointer;

    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vec3 p = mix(position, aTarget, uMorph);

      p += vec3(
        sin(uTime * .28 + aSeed),
        cos(uTime * .22 + aSeed),
        sin(uTime * .18 + aSeed)
      ) * uScatter * .35;

      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      vec4 clip = projectionMatrix * mv;

      vec2 ndc = clip.xy / clip.w;
      vec2 d = ndc - uPointer;

      float dist = length(d);
      float impact = pow(
        1.0 - smoothstep(.0, .23, dist), 2.0
      ) * uPointerStrength;

      clip.xy += normalize(d + vec2(.0001))
        * impact * .23 * clip.w;

      gl_Position = clip;

      gl_PointSize = clamp(
        aSize * uPixelRatio * 13.0 / max(3.0, -mv.z),
        2.1, 15.0
      );

      vColor = aColor;
      vAlpha = .78 + (
        .53 + .32 * sin(aSeed * 17.0)
      ) * uPointerStrength * .12;
    }
  `;

  const fragmentShader = `
    varying vec3 vColor;
    varying float vAlpha;

    uniform float uOpacity;

    void main() {
      vec2 p = gl_PointCoord * 2.0 - 1.0;

      float floorEdge = p.y + .72;
      float roofEdge = .86 - 1.7 * abs(p.x) - p.y;
      float border = min(floorEdge, roofEdge);

      if (border < .0) discard;

      float edge = 1.0 - smoothstep(.08, .27, border);
      float alpha = (edge * .89 + .10)
        * vAlpha * uOpacity;

      if (alpha < .012) discard;

      gl_FragColor = vec4(vColor, alpha);
    }
  `;

  function makeMaterial(u) {
    return new THREE.ShaderMaterial({
      uniforms: u,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending
    });
  }

  const cloud = new THREE.Points(
    buildGeometry(pos, target, colors, seeds, sizes),
    makeMaterial(uniforms)
  );

  group.add(cloud);

  // Particulas ambientais espalhadas pela pagina
  const count = mobile ? 115 : 330;

  const bp = new Float32Array(count * 3);
  const bc = new Float32Array(count * 3);
  const bs = new Float32Array(count);
  const bz = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const j = i * 3;

    bp[j] = rand(-13, 13);
    bp[j + 1] = rand(-6.8, 6.8);
    bp[j + 2] = rand(-4, -1);

    const c = palette[Math.floor(rand(0, palette.length))];

    bc[j] = c.r;
    bc[j + 1] = c.g;
    bc[j + 2] = c.b;

    bs[i] = rand(0, 7);
    bz[i] = rand(2, 8);
  }

  const bgUniforms = {
    ...uniforms,
    uOpacity: { value: .16 },
    uScatter: { value: .8 },
    uPointerStrength: { value: 0 }
  };

  const bg = new THREE.Points(
    buildGeometry(bp, bp.slice(), bc, bs, bz),
    makeMaterial(bgUniforms)
  );

  scene.add(bg);

  let scroll = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseOn = false;
  let last = 0;

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(innerWidth, innerHeight, false);
    uniforms.uPixelRatio.value = renderer.getPixelRatio();
  }

  addEventListener("resize", resize, { passive: true });
  resize();

  addEventListener("pointermove", e => {
    if (e.pointerType === "touch") return;

    mouseX = e.clientX / innerWidth * 2 - 1;
    mouseY = 1 - e.clientY / innerHeight * 2;
    mouseOn = true;
  }, { passive: true });

  addEventListener("pointerout", e => {
    if (!e.relatedTarget) mouseOn = false;
  });

  addEventListener("scroll", () => {
    scroll = scrollY / Math.max(1, innerHeight);
  }, { passive: true });

  scroll = scrollY / Math.max(1, innerHeight);

  function animate(now) {
    if (!reduced) requestAnimationFrame(animate);
    if (document.hidden) return;
    if (mobile && now - last < 28) return;

    last = now;

    const clock = reduced ? 0 : now * .001;
    const morph = smooth(.45, 1.7, scroll);

    uniforms.uTime.value = clock;
    uniforms.uMorph.value = morph;
    uniforms.uScatter.value = reduced
      ? 0
      : Math.min(.5, .10 + scroll * .08);

    uniforms.uOpacity.value =
      1 - .78 * smooth(1.4, 2.9, scroll);

    bgUniforms.uTime.value = clock;

    // Transformacao e movimento durante o scroll
    const x = mobile
      ? 0
      : 3.9 - 5.9 * smooth(.4, 2.2, scroll)
        + 2.3 * Math.sin(Math.max(0, scroll - 2.2) * .47);

    const y = mobile
      ? -1.8
      : -.1 + 1.1 * smooth(.5, 2.1, scroll)
        + .45 * Math.sin(scroll * .56);

    group.position.x += (x - group.position.x) * .055;
    group.position.y += (y - group.position.y) * .055;

    const size = (mobile ? 1.2 : 1.9)
      * (1 - .26 * smooth(.45, 1.8, scroll));

    group.scale.setScalar(size);
    group.rotation.y = clock * .046 + mouseX * .095;
    group.rotation.x = mouseY * .065;

    // Parallax do fundo
    bg.position.x += (
      mouseX * -.28 - bg.position.x
    ) * .026;

    bg.position.y += (
      mouseY * -.20 - bg.position.y
    ) * .026;

    uniforms.uPointer.value.set(
      mouseOn ? mouseX : -9,
      mouseOn ? mouseY : -9
    );

    uniforms.uPointerStrength.value += (
      (mouseOn ? 1 : 0) -
      uniforms.uPointerStrength.value
    ) * .08;

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);

  // Entradas animadas durante a rolagem
  if (!reduced && "IntersectionObserver" in window) {
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("eden-motion-visible");
          reveal.unobserve(e.target);
        }
      });
    }, {
      threshold: .12,
      rootMargin: "0px 0px -25px 0px"
    });

    const selector = [
      ".section-heading",
      ".eden-tech-intro",
      ".method-step",
      ".experience-selector",
      ".maturity-copy",
      ".last-content"
    ].join(",");

    document.querySelectorAll(selector).forEach((el, i) => {
      if (el.getBoundingClientRect().top > innerHeight * .8) {
        el.classList.add("eden-motion-reveal");
        el.style.setProperty(
          "--motion-delay",
          `${i % 3 * 100}ms`
        );
        reveal.observe(el);
      }
    });
  }
})();