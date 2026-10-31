/* EDEN — time-based wheel easing, keeping the document and touch scrolling native. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const scrollKeys = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ']);
  let frame = 0, previous = 0, current = scrollY, target = scrollY, expected = scrollY;
  let limit = Math.max(0, root.scrollHeight - innerHeight);
  let kind = 'wheel', from = 0, start = 0, duration = 0, onComplete = null;
  const clamp = value => Math.max(0, Math.min(limit, value));
  const enabled = () => !reduced.matches && !document.hidden && !document.body.classList.contains('dialog-open');
  function stop() {
    cancelAnimationFrame(frame); frame = 0; previous = 0; onComplete = null;
    current = target = expected = scrollY;
  }
  function measure() {
    limit = Math.max(0, root.scrollHeight - innerHeight);
    target = clamp(target);
  }
  function write(value) {
    expected = clamp(value);
    window.scrollTo({ top: expected, behavior: 'instant' });
    // Browsers may round the physical scroll offset to a device pixel.
    current = expected = scrollY;
  }
  function tick(now) {
    frame = 0;
    if (!enabled()) { stop(); return; }
    const dt = previous ? Math.min(80, now - previous) : 1000 / 60;
    previous = now;
    if (kind === 'anchor') {
      if (!start) start = now;
      const progress = Math.min(1, (now - start) / duration);
      const ease = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
      write(from + (target - from) * ease);
      if (progress === 1) { finish(); return; }
    } else {
      // A fixed time constant gives the same glide on 60 Hz and 120 Hz displays.
      const next = current + (target - current) * (1 - Math.exp(-dt / 70));
      if (Math.abs(target - next) < 1) { write(target); finish(); return; }
      const before = current;
      write(next);
      // Stop if subpixel rounding can no longer advance the document.
      if (current === before || Math.abs(target - current) <= 2) { write(target); finish(); return; }
    }
    frame = requestAnimationFrame(tick);
  }
  function finish() {
    previous = 0;
    const done = onComplete; onComplete = null;
    if (done) done();
  }
  function begin() {
    if (!frame) { previous = 0; frame = requestAnimationFrame(tick); }
  }
  function nestedScroll(targetNode) {
    for (let el = targetNode instanceof Element ? targetNode : targetNode?.parentElement; el && el !== document.body && el !== root; el = el.parentElement) {
      if (el.matches('dialog, input, textarea, select, [contenteditable="true"], [role="listbox"]')) return true;
      if (el.scrollHeight > el.clientHeight + 1 && /auto|scroll|overlay/.test(getComputedStyle(el).overflowY)) return true;
    }
    return false;
  }
  addEventListener('wheel', event => {
    if (!enabled() || !event.cancelable || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY) || nestedScroll(event.target)) return;
    measure();
    const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
    const delta = event.deltaY * multiplier;
    const reversing = frame && Math.sign(delta) !== Math.sign(target - scrollY);
    const base = frame && kind === 'wheel' && !reversing ? target : scrollY;
    const next = clamp(base + delta);
    // At the page edges keep native overscroll/browser gestures available.
    if (next === base) return;
    event.preventDefault();
    if (!frame || kind !== 'wheel') { current = expected = scrollY; previous = 0; }
    kind = 'wheel'; target = next; onComplete = null;
    begin();
  }, { passive: false });
  function moveTo(value, done) {
    measure(); stop(); target = clamp(value);
    if (!enabled() || Math.abs(target - current) < 1) { write(target); if (done) done(); return; }
    kind = 'anchor'; from = current; start = 0;
    duration = Math.max(280, Math.min(580, 260 + Math.abs(target - current) * .035));
    onComplete = done; begin();
  }
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || !enabled()) return;
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link || link.hasAttribute('download') || link.target && link.target !== '_self') return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash || url.hash === '#') return;
    let id;
    try { id = decodeURIComponent(url.hash.slice(1)); } catch (_) { return; }
    const destination = document.getElementById(id);
    if (!destination) return;
    event.preventDefault();
    const padding = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
    const margin = parseFloat(getComputedStyle(destination).scrollMarginTop) || 0;
    const y = destination.getBoundingClientRect().top + scrollY - padding - margin;
    if (location.hash !== url.hash) history.pushState(history.state, '', url.hash);
    moveTo(y, () => {
      const temporary = !destination.hasAttribute('tabindex');
      if (temporary) destination.setAttribute('tabindex', '-1');
      destination.focus({ preventScroll: true });
      if (temporary) destination.addEventListener('blur', () => destination.removeAttribute('tabindex'), { once: true });
    });
  });
  // Any direct/native navigation takes over immediately: no fighting scrollbars,
  // keyboard, touch gestures, browser history or programmatic scrolling.
  addEventListener('scroll', () => { if (frame && Math.abs(scrollY - expected) > 2) stop(); }, { passive: true });
  addEventListener('keydown', event => { if (scrollKeys.has(event.key)) stop(); });
  addEventListener('pointerdown', stop, { passive: true });
  addEventListener('touchstart', stop, { passive: true });
  addEventListener('popstate', stop);
  addEventListener('hashchange', stop);
  addEventListener('resize', () => { stop(); measure(); }, { passive: true });
  document.addEventListener('visibilitychange', stop);
  reduced.addEventListener('change', stop);
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);
  new MutationObserver(() => { if (document.body.classList.contains('dialog-open')) stop(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.edenScroll = Object.freeze({ get active() { return Boolean(frame); }, get target() { return target; }, scrollTo: moveTo, stop });
})();
