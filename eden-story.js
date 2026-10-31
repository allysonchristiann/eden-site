(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const header = $('.site-header');
  const menuButton = $('.mobile-menu-button');
  const menu = $('#navMiddle');
  const setMenu = open => {
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.classList.toggle('is-open', open);
  };
  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  $$('#navMiddle a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });
  document.addEventListener('click', event => { if (!header.contains(event.target)) setMenu(false); });
  matchMedia('(min-width: 761px)').addEventListener('change', () => setMenu(false));
  $('#currentYear').textContent = new Date().getFullYear();
  // One document box and one scroll state own both the copy and its artwork.
  // The renderer consumes sync(), rather than maintaining a second timeline.
  const chapters = $$('.story-section');
  const limit = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
  const ease = value => value * value * (3 - 2 * value);
  let chapterBounds = [], panelFrame = 0, panelLayoutFrame = 0, viewport = innerHeight;
  let lastScroll = NaN, layoutWidth = innerWidth, resizeTimer = 0;
  function stateFor(index, scroll) {
    const item = chapterBounds[index], next = chapterBounds[index + 1];
    const entering = index === 0 ? 1 : ease(limit((scroll - item.boundary) / (viewport * .20)));
    const leaving = next ? 1 - ease(limit((scroll - next.boundary + viewport * .12) / (viewport * .12))) : 1;
    const opacity = reduced.matches ? 1 : Math.min(entering, leaving);
    const offsetY = reduced.matches ? 0 : (1 - entering) * 24 - (1 - leaving) * 24;
    return { index, section: item.section, scene: item.section.dataset.scene,
      boundary: item.boundary, nextBoundary: next?.boundary ?? Infinity,
      gate: opacity, opacity, offsetY,
      art: item.art ? { x: item.art.x, y: item.art.y - scroll + offsetY,
        width: item.art.width, height: item.art.height } : null,
      composition: { top: item.top - scroll + offsetY, bottom: item.bottom - scroll + offsetY }
    };
  }
  function readStory(scroll = scrollY) {
    if (!chapterBounds.length) return null;
    let index = 0;
    while (index < chapterBounds.length - 1 && scroll >= chapterBounds[index + 1].boundary) index++;
    return stateFor(index, scroll);
  }
  function syncStory(scroll = scrollY) {
    if (scroll !== lastScroll && !reduced.matches) {
      for (let i = 0; i < chapterBounds.length; i++) {
        const item = chapterBounds[i], state = stateFor(i, scroll);
        const opacity = state.opacity.toFixed(4), y = state.offsetY.toFixed(3) + 'px';
        if (opacity !== item.opacity) {
          item.group.style.setProperty('--composition-opacity', opacity);
          item.opacity = opacity;
        }
        if (y !== item.y) {
          item.group.style.setProperty('--composition-y', y);
          item.y = y;
        }
        const hidden = state.opacity < .0001;
        if (hidden !== item.hidden) {
          item.group.inert = hidden;
          if (hidden) item.group.setAttribute('aria-hidden', 'true');
          else item.group.removeAttribute('aria-hidden');
          item.group.dataset.reading = hidden ? 'offstage' : 'onstage';
          item.hidden = hidden;
        }
      }
      lastScroll = scroll;
    }
    return readStory(scroll);
  }
  window.edenStoryScroll = Object.freeze({ read: readStory, sync: syncStory });
  function updatePanels() {
    panelFrame = 0;
    if (!document.hidden) syncStory();
  }
  function queuePanels() {
    if (!panelFrame && !document.hidden) panelFrame = requestAnimationFrame(updatePanels);
  }
  function measurePanels() {
    panelLayoutFrame = 0;
    cancelAnimationFrame(panelFrame); panelFrame = 0;
    const groups = chapters.map(section => section.querySelector('.story-composition'));
    groups.forEach(group => {
      group.classList.remove('is-choreographed');
      group.inert = false; group.removeAttribute('aria-hidden');
    });
    viewport = innerHeight;
    chapterBounds = chapters.map((section, index) => {
      const group = groups[index], rect = group.getBoundingClientRect();
      const slot = group.querySelector('[data-art-slot]')?.getBoundingClientRect();
      const top = rect.top + scrollY;
      return { section, group, top, bottom: top + rect.height,
        boundary: index === 0 ? 0 : top - viewport * .66,
        art: slot ? { x: slot.left + slot.width / 2, y: slot.top + scrollY + slot.height / 2,
          width: slot.width, height: slot.height } : null,
        opacity: null, y: null, hidden: null };
    });
    if (!reduced.matches) groups.forEach(group => group.classList.add('is-choreographed'));
    lastScroll = NaN; syncStory();
    document.dispatchEvent(new Event('eden:storylayout'));
  }
  function queuePanelLayout() {
    if (!panelLayoutFrame) panelLayoutFrame = requestAnimationFrame(measurePanels);
  }
  addEventListener('scroll', queuePanels, { passive: true });
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    if (innerWidth !== layoutWidth) {
      layoutWidth = innerWidth; queuePanelLayout();
    } else {
      // Mobile browser chrome changes height repeatedly during a gesture.
      // Keep the common reading geometry stable until that change settles.
      resizeTimer = setTimeout(queuePanelLayout, 180);
    }
  }, { passive: true });
  document.addEventListener('visibilitychange', queuePanels);
  reduced.addEventListener('change', queuePanelLayout);
  if ('ResizeObserver' in window) {
    const layout = new ResizeObserver(queuePanelLayout);
    chapters.forEach(section => layout.observe(section));
  }
  measurePanels();

  // Manual carousel: no autoplay, all eight services stay accessible without JavaScript.
  const carousel = $('.service-carousel');
  const cards = $$('.service-card', carousel);
  $('#serviceDeck').classList.add('is-enhanced');
  let currentService = 0;
  function showService(index) {
    currentService = (index + cards.length) % cards.length;
    cards.forEach((card, i) => {
      card.hidden = i !== currentService;
      card.classList.toggle('is-active', i === currentService);
      card.classList.remove('is-changing');
    });
    if (!reduced.matches) {
      void cards[currentService].offsetWidth;
      cards[currentService].classList.add('is-changing');
    }
    $('#serviceCounter').textContent = `${String(currentService + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
  }
  $('.carousel-controls').hidden = false;
  $('#servicePrevious').addEventListener('click', () => showService(currentService - 1));
  $('#serviceNext').addEventListener('click', () => showService(currentService + 1));
  carousel.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const focusWasInsideCard = cards[currentService].contains(document.activeElement);
      showService(currentService + (event.key === 'ArrowRight' ? 1 : -1));
      if (focusWasInsideCard) $('.service-contact', cards[currentService]).focus();
    }
  });
  showService(0);
  queuePanelLayout();

})();
