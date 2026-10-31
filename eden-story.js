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
  // Each chapter enters and leaves at an exact scroll position. The small
  // empty interval between chapters keeps two unrelated messages offscreen
  // together, and reversing scroll reverses every reveal without a timer.
  const chapters = $$('.story-section');
  const motionGroups = $$('.story-panel, .service-carousel');
  const limit = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
  const ease = value => value * value * (3 - 2 * value);
  let chapterBounds = [], groupBounds = [], panelFrame = 0, panelLayoutFrame = 0;
  let viewport = innerHeight;
  function resetPanels() {
    document.documentElement.classList.remove('story-scroll-ready');
    motionGroups.forEach(group => {
      group.classList.remove('story-drift');
      group.inert = false;
      group.removeAttribute('aria-hidden');
      group.style.removeProperty('--story-opacity');
      group.querySelectorAll('.story-beat').forEach(beat => {
        beat.classList.remove('story-beat');
        beat.style.removeProperty('--beat-y');
        beat.style.removeProperty('--beat-opacity');
      });
    });
  }
  function chapterGate(index, scroll) {
    const incoming = index === 0 ? 1 : ease(limit((scroll - chapterBounds[index].boundary - viewport * .02) / (viewport * .14)));
    const next = chapterBounds[index + 1];
    const outgoing = next ? 1 - ease(limit((scroll - next.boundary + viewport * .14) / (viewport * .12))) : 1;
    return Math.min(incoming, outgoing);
  }
  function readStory(scroll = scrollY) {
    let index = 0;
    while (index < chapterBounds.length - 1 && scroll >= chapterBounds[index + 1].boundary) index++;
    const current = chapterBounds[index], next = chapterBounds[index + 1];
    return {
      index,
      section: current?.section || chapters[0],
      scene: current?.section.dataset.scene || 'bulb-right',
      boundary: current?.boundary || 0,
      nextBoundary: next?.boundary ?? Infinity,
      sceneProgress: current ? limit((scroll - current.boundary) / Math.max(1, (next?.boundary ?? current.bottom) - current.boundary)) : 0,
      gate: current ? chapterGate(index, scroll) : 1
    };
  }
  window.edenStoryScroll = Object.freeze({ read: readStory });
  function updatePanels() {
    panelFrame = 0;
    if (reduced.matches || document.hidden) return;
    const scroll = scrollY;
    for (const item of groupBounds) {
      const gate = chapterGate(item.index, scroll);
      const offstage = gate < .002;
      if (offstage !== item.hidden) {
        item.group.inert = offstage;
        if (offstage) item.group.setAttribute('aria-hidden', 'true');
        else item.group.removeAttribute('aria-hidden');
        item.group.dataset.reading = offstage ? 'offstage' : 'onstage';
        item.hidden = offstage;
      }
      const opacity = gate.toFixed(3);
      if (opacity !== item.opacity) {
        item.group.style.setProperty('--story-opacity', opacity);
        item.opacity = opacity;
      }
      for (const beat of item.beats) {
        // Start each line as it reaches the lower reading zone. Its final
        // position is always its natural place in the page, never a sticky layer.
        const entering = item.index === 0 ? 1 : ease(limit((viewport * .88 - (beat.top - scroll)) / (viewport * .22)));
        const beatOpacity = entering.toFixed(3);
        const y = ((1 - entering) * 24).toFixed(2);
        if (beatOpacity !== beat.opacity) {
          beat.node.style.setProperty('--beat-opacity', beatOpacity);
          beat.opacity = beatOpacity;
        }
        if (y !== beat.y) {
          beat.node.style.setProperty('--beat-y', y + 'px');
          beat.y = y;
        }
      }
    }
  }
  function queuePanels() {
    if (!panelFrame && !reduced.matches && !document.hidden) panelFrame = requestAnimationFrame(updatePanels);
  }
  function measurePanels() {
    panelLayoutFrame = 0;
    cancelAnimationFrame(panelFrame); panelFrame = 0;
    resetPanels();
    viewport = innerHeight;
    chapterBounds = chapters.map((section, index) => {
      const rect = section.getBoundingClientRect();
      const top = rect.top + scrollY;
      return { section, top, bottom: top + rect.height, boundary: index === 0 ? 0 : top - viewport * .52 };
    });
    if (reduced.matches) { groupBounds = []; return; }
    groupBounds = motionGroups.map(group => {
      const index = chapters.indexOf(group.closest('.story-section'));
      const nodes = [...group.children].filter(node => !node.hidden);
      const beats = nodes.map(node => ({ node, top: node.getBoundingClientRect().top + scrollY, opacity: null, y: null }));
      group.classList.add('story-drift');
      beats.forEach(beat => beat.node.classList.add('story-beat'));
      return { group, index, beats, opacity: null, hidden: null };
    });
    document.documentElement.classList.add('story-scroll-ready');
    updatePanels();
  }
  function queuePanelLayout() {
    if (!panelLayoutFrame) panelLayoutFrame = requestAnimationFrame(measurePanels);
  }
  addEventListener('scroll', queuePanels, { passive: true });
  addEventListener('resize', queuePanelLayout, { passive: true });
  document.addEventListener('visibilitychange', queuePanels);
  reduced.addEventListener('change', queuePanelLayout);
  if ('ResizeObserver' in window) {
    const panelLayout = new ResizeObserver(queuePanelLayout);
    chapters.forEach(section => panelLayout.observe(section));
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
  queuePanelLayout();

})();
