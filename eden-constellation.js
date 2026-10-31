(() => {
  "use strict";

  const canvas = document.getElementById("edenParticles");
  if (!canvas) return;

  const stage = canvas.parentElement;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = window.matchMedia("(max-width: 700px)").matches;

  const random = (min, max) => min + Math.random() * (max - min);
  const colors = ["#d8b474", "#7c9cc9", "#f0d6a3", "#456fa8", "#c4d4e8"];

  let width = 0;
  let height = 0;
  let frame = 0;
  let active = false;
  let mouseX = 0;
  let mouseY = 0;
  let smoothX = 0;
  let smoothY = 0;

  const count = mobile ? 155 : 470;

  // Particulas distribuídas em torno da letra E e de uma nuvem de dados.
  const particles = Array.from({ length: count }, (_, i) => {
    const structured = Math.random() < 0.67;
    let x;
    let y;

    if (structured) {
      const segment = i % 4;
      if (segment === 0) {
        x = random(-.56, -.47);
        y = random(-.60, .60);
      } else {
        x = random(-.53, segment === 2 ? .30 : .55);
        y = [-.51, 0, .51][segment === 1 ? 0 : segment === 2 ? 1 : 2];
        y += random(-.085, .085);
      }
    } else {
      const angle = random(0, Math.PI * 2);
      const radius = Math.sqrt(Math.random());
      x = Math.cos(angle) * radius * .85;
      y = Math.sin(angle) * radius * .85;
    }

    return {
      x, y,
      size: random(.7, 2.7),
      phase: random(0, Math.PI * 2),
      speed: random(.35, 1.2),
      color: colors[i % colors.length],
      alpha: random(.30, .95)
    };
  });

  function resize() {
    const rect = stage.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    draw(0);
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);

    smoothX += (mouseX - smoothX) * .045;
    smoothY += (mouseY - smoothY) * .045;

    const cx = width * .50;
    const cy = height * .50;
    const scaleX = width * .43;
    const scaleY = height * .40;

    // Orbitas discretas em azul-marinho e dourado.
    ctx.globalAlpha = .16;
    ctx.strokeStyle = "#d8b474";
    ctx.lineWidth = .7;
    ctx.beginPath();
    ctx.ellipse(cx, cy, width * .33, height * .40, -.22, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#4776b5";
    ctx.beginPath();
    ctx.ellipse(cx, cy, width * .43, height * .29, .32, 0, Math.PI * 2);
    ctx.stroke();

    for (const p of particles) {
      const movement = reduced ? 0 : time * .00024 * p.speed;
      const driftX = Math.sin(movement + p.phase) * 7;
      const driftY = Math.cos(movement + p.phase) * 7;

      const x = cx + p.x * scaleX + driftX + smoothX * (12 + p.size * 2);
      const y = cy + p.y * scaleY + driftY + smoothY * (12 + p.size * 2);

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(x, y - p.size);
      ctx.lineTo(x + p.size, y + p.size);
      ctx.lineTo(x - p.size, y + p.size);
      ctx.closePath();
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  function animate(time) {
    draw(time);
    if (active) frame = requestAnimationFrame(animate);
  }

  function setActive(value) {
    cancelAnimationFrame(frame);
    active = value && !reduced && !document.hidden;
    if (active) frame = requestAnimationFrame(animate);
    else draw(0);
  }

  stage.addEventListener("pointermove", event => {
    const rect = stage.getBoundingClientRect();
    mouseX = ((event.clientX - rect.left) / rect.width - .5) * 2;
    mouseY = ((event.clientY - rect.top) / rect.height - .5) * 2;
    if (reduced) draw(0);
  }, { passive: true });

  stage.addEventListener("pointerleave", () => {
    mouseX = 0;
    mouseY = 0;
  });

  if ("ResizeObserver" in window) {
    new ResizeObserver(resize).observe(stage);
  } else {
    window.addEventListener("resize", resize, { passive: true });
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      setActive(entries[0].isIntersecting);
    }, { threshold: .05 }).observe(stage);

    if (!reduced) {
      const targets = document.querySelectorAll(".eden-tech-card");
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("eden-visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: .12 });

      targets.forEach((element, i) => {
        element.classList.add("eden-entering");
        element.style.transitionDelay = `${(i % 4) * 85}ms`;
        observer.observe(element);
      });
    }
  } else {
    setActive(true);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      active = false;
    } else {
      setActive(true);
    }
  });

  resize();
})();