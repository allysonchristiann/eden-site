/* EDEN — paint particle textures once on touch layouts; let native scrolling
   move them inside the same composition as their copy. No animation loop. */
(() => {
  'use strict';
  const enabled = matchMedia('(max-width: 760px)').matches ||
    (matchMedia('(pointer: coarse)').matches && innerWidth <= 1100);
  window.edenMobileMotion = Object.freeze({ enabled });
  if (!enabled) return;
  const root = document.documentElement;
  const backdrop = document.getElementById('edenParticles');
  if (!backdrop) return;
  root.classList.add('mobile-motion');
  backdrop.dataset.renderer = 'mobile-cached';
  const tau = Math.PI * 2;
  let seed = 7321, layoutWidth = innerWidth, resizeTimer = 0;
  const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
  const palette = ['#edbe34', '#e8e3ef', '#8951e9', '#238d84', '#456cae'];
  const entries = [];

  function triangle(ctx, x, y, size, angle, ink, alpha) {
    ctx.strokeStyle = ink; ctx.globalAlpha = alpha;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const a = angle + k * tau / 3;
      const px = x + Math.cos(a) * size, py = y + Math.sin(a) * size;
      if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.stroke();
  }
  const background = Array.from({ length: 220 }, (_, i) => ({
    x: random(), y: random(), size: i < 12 ? 7 + random() * 12 : 1.5 + random() * 3,
    angle: random() * tau, ink: palette[i % palette.length], alpha: .12 + random() * .25
  }));
  function paintBackdrop() {
    const width = innerWidth, height = innerHeight;
    const dpr = Math.min(1, Math.sqrt(500000 / (width * height)));
    backdrop.width = Math.round(width * dpr); backdrop.height = Math.round(height * dpr);
    const ctx = backdrop.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.lineWidth = .65;
    for (const p of background) triangle(ctx, p.x * width, p.y * height, p.size, p.angle, p.ink, p.alpha);
    ctx.globalAlpha = 1;
  }
  function bulbPoints() {
    return Array.from({ length: 1100 }, () => {
      const u = random() * tau, v = random();
      let y, radius;
      if (v < .84) {
        y = 1.1 - v / .84 * 1.95;
        const t = Math.min(1, Math.max(0, (-.15 - y) / .70));
        radius = y >= -.15 ? .8 * Math.sqrt(Math.max(0, 1 - ((y - .3) / .8) ** 2))
          : .6614 + (.25 - .6614) * t * t * (3 - 2 * t);
      } else {
        const t = (v - .84) / .16;
        radius = t < .75 ? .25 + .02 * Math.sin(t * 54) : .25 * Math.sqrt((1 - t) / .25);
        y = -.85 - t * .45;
      }
      const x = Math.cos(u) * radius, z = Math.sin(u) * radius;
      const px = x * Math.cos(-.08) + z * Math.sin(-.08);
      const pz = z * Math.cos(-.08) - x * Math.sin(-.08), factor = 4.5 / (4.5 - pz);
      const ink = y > .45 ? palette[0] : y > -.15 ? palette[1] : y > -.9 ? palette[2] : palette[3];
      return { x: (px * Math.cos(.34) - y * Math.sin(.34)) * factor,
        y: -(px * Math.sin(.34) + y * Math.cos(.34)) * factor,
        ink, alpha: Math.min(.95, Math.max(.24, .58 + pz * .35)), angle: random() * tau };
    });
  }
  async function sampleImage(src, width, height) {
    const image = new Image(); image.src = src; await image.decode();
    const mask = document.createElement('canvas'); mask.width = width; mask.height = height;
    const ctx = mask.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas indisponível');
    ctx.drawImage(image, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height).data;
    const light = [], blue = [];
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const j = (y * width + x) * 4, r = data[j], g = data[j + 1], b = data[j + 2], a = data[j + 3];
      let pool;
      if (a > 125 && r > 100 && Math.max(r, g, b) > 140) pool = light;
      else if (a > 45 && b > r + 8) pool = blue;
      else continue;
      pool.push({ x: x + .5, y: y + .5, ink: `rgb(${r},${g},${b})`, alpha: .82 });
    }
    return { light, blue };
  }
  function maskPoints(mask, count, chart) {
    if (!mask.light.length || (chart && !mask.blue.length)) throw new Error('Imagem indisponível');
    return Array.from({ length: count }, (_, i) => {
      const pool = chart && i % 10 >= 3 ? mask.blue : mask.light;
      const p = pool[Math.floor(random() * pool.length)];
      return { ...p, angle: random() * tau };
    });
  }
  function paintArtwork(entry) {
    const rect = entry.slot.getBoundingClientRect(), width = rect.width, height = rect.height;
    if (!width || !height) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.25, Math.sqrt(180000 / (width * height)));
    const canvas = entry.canvas || document.createElement('canvas');
    canvas.className = 'mobile-particle-art'; canvas.setAttribute('aria-hidden', 'true');
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.lineWidth = .55;
    const { minX, maxX, minY, maxY } = entry.bounds;
    const scale = Math.min((width - 24) / (maxX - minX), (height - 24) / (maxY - minY));
    const size = Math.min(2.4, Math.max(1.35, width / 170));
    for (const p of entry.points) triangle(ctx,
      width / 2 + (p.x - (minX + maxX) / 2) * scale,
      height / 2 + (p.y - (minY + maxY) / 2) * scale,
      size, p.angle, p.ink, p.alpha);
    ctx.globalAlpha = 1;
    if (!entry.canvas) entry.slot.append(canvas);
    entry.canvas = canvas; entry.slot.setAttribute('data-mobile-art-ready', '');
  }
  async function prepare() {
    paintBackdrop();
    const models = [
      ['inicio', async () => bulbPoints()],
      ['metodo', async () => maskPoints(await sampleImage('eden-growth.svg', 360, 252), 1400, true)],
      ['conversar', async () => maskPoints(await sampleImage('eden-logo.svg', 256, 256), 2000, false)]
    ];
    await Promise.all(models.map(async ([id, create]) => {
      const slot = document.querySelector(`#${id} [data-art-slot]`);
      if (!slot) return;
      try {
        const points = await create();
        const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
        for (const p of points) {
          bounds.minX = Math.min(bounds.minX, p.x); bounds.maxX = Math.max(bounds.maxX, p.x);
          bounds.minY = Math.min(bounds.minY, p.y); bounds.maxY = Math.max(bounds.maxY, p.y);
        }
        const entry = { slot, points, bounds }; entries.push(entry); paintArtwork(entry);
      } catch (_) { /* The illustration in this slot remains visible as its fallback. */ }
    }));
    root.dataset.artReady = 'true';
  }
  addEventListener('resize', () => {
    // Address-bar height changes stretch the existing texture; they never
    // allocate a new drawing buffer or restart the animation during scrolling.
    if (innerWidth === layoutWidth) return;
    layoutWidth = innerWidth; clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { paintBackdrop(); entries.forEach(paintArtwork); }, 120);
  }, { passive: true });
  prepare();
})();
