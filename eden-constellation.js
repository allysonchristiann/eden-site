(() => {
  "use strict";

  const canvas = document.getElementById("edenParticles");
  if (!canvas) return;

  const stage = canvas.parentElement;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const mobile = matchMedia("(max-width: 700px)").matches;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rand = (a, b) => a + Math.random() * (b - a);

  const palette = [
    "#e7c47c", "#d4a860", "#f2dbaa",
    "#91adc8", "#537bad", "#e2e7ed"
  ];

  const total = reduced ? 1100 : mobile ? 900 : 3100;
  const points = [];

  let w = 1, h = 1, raf = 0, active = false, last = 0;
  let twistX = 0, twistY = 0, scrollShift = 0;

  const pointer = {
    x: -1000, y: -1000,
    strength: 0, target: 0
  };

  for (let i = 0; i < total; i++) {
    let x, y, z;

    if (Math.random() < .81) {
      const az = rand(0, Math.PI * 2);
      const polar = Math.acos(rand(-1, 1));
      const shell = Math.random() < .74
        ? rand(.84, 1.06)
        : rand(.26, .96);

      const organic = 1 + .07 * Math.sin(az * 5 + polar * 4);

      x = -.16 + Math.sin(polar) * Math.cos(az) *
          shell * .97 * organic;

      y = -.20 + Math.cos(polar) *
          shell * .96 * organic;

      z = Math.sin(polar) * Math.sin(az) *
          shell * .72;
    } else {
      const t = Math.pow(Math.random(), .77);
      const radius = (1 - t) * .27 + .07;

      x = .19 + t * .53 + rand(-radius, radius);
      y = .29 + t * .88 + rand(-radius, radius);
      z = rand(-radius, radius) * 1.6;
    }

    points.push({
      x, y, z,
      ox: 0, oy: 0,
      size: rand(.75, 2.7),
      speed: rand(.55, 1.35),
      phase: rand(0, Math.PI * 2),
      hue: Math.random(),
      fill: Math.random() < .23
    });
  }

  const dust = Array.from({
    length: mobile ? 55 : 130
  }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: rand(.5, 2.3),
    color: palette[Math.floor(Math.random() * palette.length)],
    phase: rand(0, Math.PI * 2)
  }));

  function resize() {
    const r = stage.getBoundingClientRect();

    w = Math.max(1, r.width);
    h = Math.max(1, r.height);

    const dpr = Math.min(
      devicePixelRatio || 1,
      mobile ? 1.4 : 1.65
    );

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint(performance.now());
  }

  function triangle(x, y, radius, color, rotation, filled) {
    ctx.beginPath();

    for (let k = 0; k < 3; k++) {
      const a = rotation + k * Math.PI * 2 / 3;
      const xx = x + Math.cos(a) * radius;
      const yy = y + Math.sin(a) * radius;

      if (k === 0) ctx.moveTo(xx, yy);
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

  function paint(now) {
    ctx.clearRect(0, 0, w, h);

    const t = now * .001;
    const smooth = reduced ? 0 : Math.sin(t * .12);

    const scale = Math.min(w * .37, h * .42);
    const cx = w * .48;
    const cy = h * .47;

    pointer.strength +=
      (pointer.target - pointer.strength) * .075;

    twistY += (
      ((pointer.x / w - .5) * .26 * pointer.strength || 0) -
      twistY
    ) * .025;

    twistX += (
      ((pointer.y / h - .5) * .16 * pointer.strength || 0) -
      twistX
    ) * .025;

    const yaw = smooth * .17 + twistY + scrollShift * .34;
    const pitch = Math.cos(t * .14) * .10 + twistX;

    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosX = Math.cos(pitch);
    const sinX = Math.sin(pitch);

    const glow = ctx.createRadialGradient(
      cx, cy, 7, cx, cy, scale * 1.25
    );

    glow.addColorStop(0, "rgba(21,49,86,.24)");
    glow.addColorStop(.65, "rgba(10,31,65,.10)");
    glow.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = .83;

    for (const d of dust) {
      const dx = d.x * w + (
        reduced ? 0 : Math.sin(t * .16 + d.phase) * 8
      );

      const dy = d.y * h + (
        reduced ? 0 : Math.cos(t * .22 + d.phase) * 6
      );

      ctx.globalAlpha = .12 +
        .13 * (Math.sin(t * .6 + d.phase) + 1) / 2;

      triangle(
        dx, dy, d.size, d.color, d.phase, false
      );
    }

    for (const p of points) {
      const yy = p.y + (
        reduced ? 0 :
        Math.sin(t * .25 * p.speed + p.phase) * .013
      );

      const xx = p.x + (
        reduced ? 0 :
        Math.cos(t * .23 * p.speed + p.phase) * .013
      );

      const xr = xx * cosY - p.z * sinY;
      const zr = xx * sinY + p.z * cosY;
      const yr = yy * cosX - zr * sinX;
      const depth = yy * sinX + zr * cosX;

      const perspective = 2.4 / (2.4 - depth * .40);

      const px = cx + xr * scale * perspective;
      const py = cy + yr * scale * perspective;

      let goalX = 0;
      let goalY = 0;

      if (pointer.strength > .015) {
        const dx = px - pointer.x;
        const dy = py - pointer.y;
        const dist = Math.hypot(dx, dy);
        const reach = mobile ? 92 : 148;

        if (dist < reach) {
          const power = Math.pow(
            1 - dist / reach, 2
          ) * pointer.strength;

          const dirX = dx / Math.max(dist, 1);
          const dirY = dy / Math.max(dist, 1);

          const spiral = 30 * power;
          const push = 95 * power;

          goalX = dirX * push - dirY * spiral;
          goalY = dirY * push + dirX * spiral;
        }
      }

      p.ox += (goalX - p.ox) * (reduced ? 1 : .17);
      p.oy += (goalY - p.oy) * (reduced ? 1 : .17);

      const posX = px + p.ox;
      const posY = py + p.oy;

      const size = p.size *
        (.85 + Math.max(0, depth) * .60) *
        perspective;

      ctx.globalAlpha = Math.min(
        1, .46 + depth * .22 + p.hue * .37
      );

      const color = yr < -.25
        ? palette[Math.floor(p.hue * 3)]
        : yr < .4
          ? palette[Math.floor(p.hue * 4)]
          : palette[3 + Math.floor(p.hue * 3)];

      triangle(
        posX, posY, size, color,
        p.phase + t * .10 * p.speed,
        p.fill
      );
    }

    ctx.globalAlpha = 1;
  }

  function animate(now) {
    if (!active) return;

    if (!mobile || now - last > 28) {
      paint(now);
      last = now;
    }

    raf = requestAnimationFrame(animate);
  }

  function play(visible) {
    cancelAnimationFrame(raf);

    active = Boolean(visible) &&
      !reduced && !document.hidden;

    if (active) raf = requestAnimationFrame(animate);
    else paint(performance.now());
  }

  stage.addEventListener("pointerenter", e => {
    if (e.pointerType === "touch") return;

    const r = stage.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    pointer.target = 1;
  });

  stage.addEventListener("pointermove", e => {
    if (e.pointerType === "touch") return;

    const r = stage.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    pointer.target = 1;
  }, { passive: true });

  stage.addEventListener("pointerleave", () => {
    pointer.target = 0;
  });

  addEventListener("scroll", () => {
    scrollShift = Math.min(
      1, scrollY / Math.max(innerHeight, 1)
    );
  }, { passive: true });

  if ("ResizeObserver" in window) {
    new ResizeObserver(resize).observe(stage);
  } else {
    addEventListener("resize", resize, { passive: true });
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      play(entries[0].isIntersecting);
    }, { threshold: .02 }).observe(stage);

    if (!reduced) {
      const obs = new IntersectionObserver(entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("eden-visible");
            obs.unobserve(e.target);
          }
        }
      }, { threshold: .1 });

      document.querySelectorAll(".eden-tech-card")
        .forEach((el, i) => {
          el.classList.add("eden-entering");
          el.style.transitionDelay = `${(i % 4) * 85}ms`;
          obs.observe(el);
        });
    }
  } else {
    play(true);
  }

  document.addEventListener("visibilitychange", () => {
    play(!document.hidden);
  });

  resize();
})();