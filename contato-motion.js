'use strict';

// The page remains readable without JS; only decorative motion is added here.
(() => {
  const svg = document.getElementById('contactConnection');
  if (!svg) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const body = document.body;
  const art = svg.closest('.contact-art');
  const paths = [...svg.querySelectorAll('.connection-paths path')];
  const packetGroup = document.getElementById('connectionPackets');
  const revealElements = [...document.querySelectorAll('[data-contact-reveal]')];
  const namespace = 'http://www.w3.org/2000/svg';
  const packets = Array.from({length: 27}, (_, index) => {
    const node = document.createElementNS(namespace, 'path');
    node.setAttribute('d', 'M0 -3.2L2.8 2L-2.8 2Z');
    node.setAttribute('fill', 'none');
    node.setAttribute('stroke', index % 4 === 0 ? '#62a6b1' : '#dfb956');
    node.setAttribute('stroke-width', '.85');
    packetGroup.append(node);
    const path = paths[index % paths.length];
    return {node, path, length: path.getTotalLength(), phase: (index * .381966) % 1, speed: .034 + index % 5 * .004};
  });
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => value * value * (3 - 2 * value);
  const pointer = {x: -1000, y: -1000};
  let frame = 0;
  let lastTime = 0;
  let clock = 0;
  let artVisible = true;
  let dirty = true;
  let artProgress = 1;
  let bounds = null;

  const updateScroll = () => {
    const height = window.innerHeight;
    revealElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const enter = ease(clamp((height * .97 - rect.top) / (height * .2)));
      const leave = ease(clamp((rect.bottom - 18) / (height * .12)));
      const progress = reduced.matches ? 1 : Math.min(enter, leave);
      element.style.setProperty('--contact-opacity', progress.toFixed(3));
      element.style.setProperty('--contact-y', `${((1 - enter) * 19).toFixed(2)}px`);
    });
    bounds = svg.getBoundingClientRect();
    artVisible = bounds.bottom > 0 && bounds.top < height;
    artProgress = reduced.matches ? 1 : ease(clamp((height * .95 - bounds.top) / (Math.min(bounds.height, height * .28) + 20)));
    art.style.setProperty('--trace-offset', ((1 - artProgress) * 500).toFixed(1));
    art.style.setProperty('--mark-opacity', Math.max(.18, artProgress).toFixed(3));
    art.style.setProperty('--mark-scale', (.85 + .15 * artProgress).toFixed(3));
    dirty = false;
  };

  const render = time => {
    frame = 0;
    if (dirty) updateScroll();
    const dt = Math.min(40, Math.max(0, time - lastTime));
    lastTime = time;
    if (!reduced.matches) clock += dt / 1000;
    packets.forEach((packet, index) => {
      const phase = (packet.phase + clock * packet.speed) % 1;
      const point = packet.path.getPointAtLength(phase * packet.length);
      const sx = bounds.left + point.x / 520 * bounds.width;
      const sy = bounds.top + point.y / 230 * bounds.height;
      const proximity = reduced.matches ? 0 : Math.max(0, 1 - Math.hypot(pointer.x - sx, pointer.y - sy) / 85);
      const fade = Math.min(1, phase * 8, (1 - phase) * 8) * artProgress;
      packet.node.setAttribute('transform', `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)}) rotate(${index * 47 + clock * 9}) scale(${(1 + proximity * 1.8).toFixed(2)})`);
      packet.node.setAttribute('opacity', (fade * (.48 + proximity * .52)).toFixed(3));
    });
    if (!reduced.matches && artVisible && !document.hidden) frame = requestAnimationFrame(render);
  };
  const requestRender = () => {
    if (!frame && !document.hidden) frame = requestAnimationFrame(render);
  };
  const onScroll = () => { dirty = true; requestRender(); };
  window.addEventListener('scroll', onScroll, {passive: true});
  window.addEventListener('resize', onScroll, {passive: true});
  art.addEventListener('pointermove', event => {
    pointer.x = event.clientX; pointer.y = event.clientY; requestRender();
  }, {passive: true});
  art.addEventListener('pointerleave', () => {
    pointer.x = -1000; pointer.y = -1000; requestRender();
  }, {passive: true});
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame); frame = 0;
    } else {
      lastTime = performance.now(); onScroll();
    }
  });
  reduced.addEventListener('change', () => {
    body.classList.toggle('contact-motion', !reduced.matches);
    lastTime = performance.now(); onScroll();
  });
  // Layout changes from a restored assessment or the browser's form controls.
  if ('ResizeObserver' in window) new ResizeObserver(onScroll).observe(document.querySelector('.layout'));
  body.classList.toggle('contact-motion', !reduced.matches);
  updateScroll();
  requestRender();
})();
