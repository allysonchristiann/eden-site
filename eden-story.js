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
  // Reversible text choreography follows the same native scroll as the artwork.
  // The reading zone stays fully opaque; only the viewport edges ease in/out.
  // Cache geometry on layout changes, never read it inside a scroll frame.
  const motionPanels = $$('#inicio .hero-copy, #cenario .story-statement, #metodo .story-panel, #conversar .final-copy');
  let panelBounds = [], panelFrame = 0, panelLayoutFrame = 0;
  const limit = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
  const ease = value => value * value * (3 - 2 * value);
  function resetPanels() {
    motionPanels.forEach(panel => {
      panel.classList.remove('story-drift');
      panel.style.removeProperty('--story-y');
      panel.style.removeProperty('--story-opacity');
    });
  }
  function updatePanels() {
    panelFrame = 0;
    if (reduced.matches || document.hidden) return;
    const scroll = scrollY, viewport = innerHeight;
    const focus = document.activeElement;
    for (const item of panelBounds) {
      const top = item.top - scroll, bottom = top + item.height;
      const entering = ease(limit((viewport - top) / (viewport * .3)));
      const leaving = ease(limit(bottom / (viewport * .18)));
      const focused = item.section === focus || item.panel.contains(focus);
      const opacity = focused ? 1 : .2 + .8 * Math.min(entering, leaving);
      const parallax = limit((top + item.height * .5 - viewport * .5) * .025, -10, 10);
      const y = focused ? 0 : (1 - entering) * 26 - (1 - leaving) * 14 + parallax;
      const nextY = y.toFixed(1), nextOpacity = opacity.toFixed(3);
      if (nextY !== item.y) { item.panel.style.setProperty('--story-y', nextY + 'px'); item.y = nextY; }
      if (nextOpacity !== item.opacity) { item.panel.style.setProperty('--story-opacity', nextOpacity); item.opacity = nextOpacity; }
    }
  }
  function queuePanels() {
    if (!panelFrame && !reduced.matches && !document.hidden) panelFrame = requestAnimationFrame(updatePanels);
  }
  function measurePanels() {
    panelLayoutFrame = 0;
    cancelAnimationFrame(panelFrame); panelFrame = 0;
    resetPanels();
    if (reduced.matches) { panelBounds = []; return; }
    panelBounds = motionPanels.map(panel => {
      const bounds = panel.getBoundingClientRect();
      return { panel, section: panel.closest('section'), top: bounds.top + scrollY, height: bounds.height, y: null, opacity: null };
    });
    motionPanels.forEach(panel => panel.classList.add('story-drift'));
    updatePanels();
  }
  function queuePanelLayout() {
    if (!panelLayoutFrame) panelLayoutFrame = requestAnimationFrame(measurePanels);
  }
  addEventListener('scroll', queuePanels, { passive: true });
  addEventListener('resize', queuePanelLayout, { passive: true });
  document.addEventListener('focusin', queuePanels);
  document.addEventListener('focusout', queuePanels);
  document.addEventListener('visibilitychange', queuePanels);
  reduced.addEventListener('change', queuePanelLayout);
  if ('ResizeObserver' in window) {
    const panelLayout = new ResizeObserver(queuePanelLayout);
    document.querySelectorAll('.story-section').forEach(section => panelLayout.observe(section));
  }
  measurePanels();

  // Manual carousel: no autoplay, all eight services stay accessible without JavaScript.
  const carousel = $('.service-carousel');
  const cards = $$('.service-card', carousel);
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

})();
