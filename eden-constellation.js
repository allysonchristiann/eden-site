(() => {
  "use strict";

  const canvas = document.getElementById("edenParticles");
  if (!canvas) return;

  const stage = canvas.parentElement;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = matchMedia("(max-width: 700px)").matches;
  const rand = (a, b) => a + Math.random() * (b - a);

  const W = 520, H = 640;
  const mask = document.createElement("canvas");

  mask.width = W;
  mask.height = H;

  const m = mask.getContext("2d", { willReadFrequently: true });
  if (!m) return;

  // Silhueta geometrica da lampada.
  function glassPath(c) {
    c.beginPath();
    c.moveTo(260, 33);
    c.bezierCurveTo(129, 33, 59, 132, 73, 252);
    c.bezierCurveTo(78, 330, 128, 374, 165, 412);
    c.bezierCurveTo(190, 439, 193, 450, 194, 464);
    c.lineTo(326, 464);
    c.bezierCurveTo(327, 450, 330, 439, 355, 412);
    c.bezierCurveTo(392, 374, 442, 330, 447, 252);
    c.bezierCurveTo(461, 132, 391, 33, 260, 33);
    c.closePath();
  }

  m.fillStyle = "#fff";
  glassPath(m);
  m.fill();

  m.beginPath();
  m.roundRect(194, 458, 132, 113, 12);
  m.fill();

  m.beginPath();
  m.roundRect(213, 565, 94, 25, 11);
  m.fill();

  m.beginPath();
  m.roundRect(231, 584, 58, 21, 10);
  m.fill();

  const alpha = m.getImageData(0, 0, W, H).data;
  const particles = [];
  const count = reduced ? 2300 : mobile ? 2000 : 4200;

  // As particulas sao criadas dentro da silhueta.
  for (let i = 0; i < count; i++) {
    let x = 0, y = 0, trial = 0;

    do {
      x = rand(66, 454);
      y = rand(31, 605);
      trial++;
    } while (
      alpha[(Math.floor(y) * W + Math.floor(x)) * 4 + 3] < 100 &&
      trial < 300
    );

    if (trial >= 300) continue;

    const base = y > 465;

    particles.push({
      x, y, base,
      s: rand(.75, base ? 1.9 : 2.2),
      phase: rand(0, Math.PI * 2),
      speed: rand(.5, 1.4),
      shade: rand(0, 1),
      dx: 0, dy: 0,
      vx: 0, vy: 0,
      fill: Math.random() < .19
    });
  }

  const dust = Array.from({
    length: mobile ? 45 : 100
  }, () => ({
    x: rand(0, 1),
    y: rand(0, 1),
    s: rand(.8, 2.4),
    phase: rand(0, 7)
  }));

  let w = 1, h = 1, scale = 1, ox = 0, oy = 0;
  let raf = 0, active = false;

  let pointerX = -10000;
  let pointerY = -10000;
  let pointerActive = false;

  function resize() {
    const r = stage.getBoundingClientRect();

    w = Math.max(1, r.width);
    h = Math.max(1, r.height);

    const dpr = Math.min(
      devicePixelRatio || 1,
      mobile ? 1.4 : 1.8
    );

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    scale = Math.min(w / W * .97, h / H * .98);
    ox = (w - W * scale) / 2;
    oy = (h - H * scale) / 2;

    render(performance.now());
  }

  function triangle(x, y, s, color, angle, filled) {
    ctx.beginPath();

    for (let i = 0; i < 3; i++) {
      const a = angle + i * 2 * Math.PI / 3;
      const xx = x + Math.cos(a) * s;
      const yy = y + Math.sin(a) * s;

      if (i === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }

    ctx.closePath();

    if (filled) {
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      ctx.strokeStyle = color;
      ctx.stroke();
    }
  }

  function render(time) {
    ctx.clearRect(0, 0, w, h);

    const t = time * .001;
    const middleX = w * .5;
    const middleY = h * .42;

    const glow = ctx.createRadialGradient(
      middleX, middleY, 8,
      middleX, middleY, Math.min(w, h) * .55
    );

    glow.addColorStop(0, "rgba(216,180,116,.095)");
    glow.addColorStop(.6, "rgba(16,42,83,.08)");
    glow.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = .8;

    // Particulas ambientais.
    for (const d of dust) {
      ctx.globalAlpha = .09 +
        .10 * (Math.sin(t * .6 + d.phase) + 1) / 2;

      triangle(
        d.x * w, d.y * h,
        d.s, "#d8b474",
        d.phase + t * .04, false
      );
    }

    // Contorno sutil da lampada.
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    ctx.globalAlpha = .17;
    ctx.strokeStyle = "#d5b677";
    ctx.lineWidth = 1.3;

    glassPath(ctx);
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(194, 458, 132, 113, 12);
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(213, 565, 94, 25, 11);
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(231, 584, 58, 21, 10);
    ctx.stroke();

    ctx.restore();

    // Filamento e detalhes da base.
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    ctx.globalAlpha = .24;
    ctx.strokeStyle = "#d8b474";
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(219, 448);
    ctx.lineTo(220, 365);
    ctx.lineTo(237, 335);
    ctx.lineTo(260, 357);
    ctx.lineTo(283, 335);
    ctx.lineTo(300, 365);
    ctx.lineTo(301, 448);
    ctx.stroke();

    for (const yy of [488, 514, 540, 564]) {
      ctx.beginPath();
      ctx.moveTo(202, yy);
      ctx.lineTo(318, yy);
      ctx.stroke();
    }

    ctx.restore();

    const reach = mobile ? 66 : 110;

    // Repulsao local das particulas pelo mouse.
    for (const p of particles) {
      const drift = reduced ? 0 :
        Math.sin(t * .45 * p.speed + p.phase) * 2.5;

      let x = ox + (p.x + drift) * scale;
      let y = oy + (
        p.y + (reduced ? 0 :
        Math.cos(t * .37 + p.phase) * 2)
      ) * scale;

      let tx = 0, ty = 0;

      if (pointerActive && !reduced) {
        const dx = x - pointerX;
        const dy = y - pointerY;
        const dist = Math.hypot(dx, dy);

        if (dist < reach) {
          const force = Math.pow(1 - dist / reach, 2);
          const distance = Math.max(dist, 1);

          tx = (dx / distance * 78 -
                dy / distance * 31) * force;

          ty = (dy / distance * 78 +
                dx / distance * 31) * force;
        }
      }

      // Inercia para retornar suavemente.
      p.vx = (p.vx + (tx - p.dx) * .15) * .74;
      p.vy = (p.vy + (ty - p.dy) * .15) * .74;

      p.dx += p.vx;
      p.dy += p.vy;

      x += p.dx;
      y += p.dy;

      const color = p.base
        ? "#b8c8df"
        : p.y < 270
          ? (p.shade < .70 ? "#e4c57e" : "#f5dfb3")
          : (p.shade < .52 ? "#d8b474" : "#7b9bc7");

      ctx.globalAlpha = p.base
        ? .65
        : .45 + p.shade * .48;

      triangle(
        x, y, p.s * scale * 1.4,
        color,
        p.phase + t * .11 * p.speed,
        p.fill
      );
    }

    ctx.globalAlpha = 1;
  }

  function step(time) {
    if (!active) return;

    render(time);
    raf = requestAnimationFrame(step);
  }

  function play(value) {
    cancelAnimationFrame(raf);

    active = Boolean(value) &&
      !reduced && !document.hidden;

    if (active) raf = requestAnimationFrame(step);
    else render(performance.now());
  }

  stage.addEventListener("pointermove", e => {
    if (e.pointerType === "touch") return;

    const r = stage.getBoundingClientRect();
    pointerX = e.clientX - r.left;
    pointerY = e.clientY - r.top;
    pointerActive = true;
  }, { passive: true });

  stage.addEventListener("pointerleave", () => {
    pointerActive = false;
  });

  document.addEventListener("visibilitychange", () => {
    play(!document.hidden);
  });

  if ("ResizeObserver" in window) {
    new ResizeObserver(resize).observe(stage);
  } else {
    window.addEventListener("resize", resize, {
      passive: true
    });
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      play(entries[0].isIntersecting);
    }, { threshold: .02 }).observe(stage);
  } else {
    play(true);
  }

  resize();

  // Aparicao dos elementos durante a rolagem.
  if (!reduced && "IntersectionObserver" in window) {
    const selector = [
      ".eden-tech-header",
      ".eden-tech-intro > div",
      ".eden-tech-card",
      ".eden-tech-footer",
      ".method-step",
      ".maturity-copy",
      ".last-content",
      ".experience-selector"
    ].join(",");

    const observer = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;

        e.target.classList.add("eden-scroll-visible");
        observer.unobserve(e.target);
      }
    }, {
      threshold: .08,
      rootMargin: "0px 0px -24px 0px"
    });

    document.querySelectorAll(selector).forEach((el, i) => {
      if (el.getBoundingClientRect().top > innerHeight * .83) {
        el.classList.add("eden-scroll-entry");
        el.style.setProperty(
          "--eden-scroll-delay",
          `${(i % 4) * 85}ms`
        );

        observer.observe(el);
      }
    });
  }
})();