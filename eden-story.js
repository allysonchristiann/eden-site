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
  const updateHeader = () => header.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();
  $('#currentYear').textContent = new Date().getFullYear();
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: .15 });
    $$('.story-panel').forEach(panel => observer.observe(panel));
  }

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

  const questions = [
    { text: 'Como sua empresa registra as movimentações financeiras?', answers: ['Não existe um controle consistente.', 'Usamos planilhas ou registros manuais.', 'Temos uma rotina organizada.', 'Usamos indicadores e análises regularmente.'] },
    { text: 'Com que frequência o fluxo de caixa é acompanhado?', answers: ['Não acompanhamos com regularidade.', 'Quando aparece uma necessidade.', 'Semanalmente ou em uma rotina definida.', 'Com projeções e revisão de cenários.'] },
    { text: 'Como são tomadas as decisões financeiras importantes?', answers: ['Principalmente pela urgência.', 'Com base no saldo disponível.', 'Com relatórios e histórico financeiro.', 'Com indicadores, cenários e planejamento.'] },
    { text: 'Qual é a situação dos processos financeiros?', answers: ['São pouco definidos.', 'Dependem bastante das pessoas.', 'São documentados e acompanhados.', 'São integrados à estratégia da empresa.'] }
  ];
  const stages = [
    { name: 'Sobrevivência', summary: 'O primeiro passo é criar visibilidade sobre entradas, saídas e compromissos.', steps: ['Registrar movimentações de forma consistente.', 'Separar o caixa da empresa do pessoal.', 'Estabelecer uma rotina de acompanhamento.'] },
    { name: 'Segurança', summary: 'Já existem controles iniciais. Agora, é hora de dar previsibilidade à rotina.', steps: ['Padronizar processos financeiros.', 'Acompanhar contas a pagar e a receber.', 'Definir uma visão regular do fluxo de caixa.'] },
    { name: 'Controle', summary: 'Você já construiu uma base para organizar decisões e ganhar eficiência.', steps: ['Usar indicadores financeiros relevantes.', 'Criar uma cadência de análise de resultados.', 'Acompanhar custos e oportunidades de melhoria.'] },
    { name: 'Desempenho', summary: 'Seu próximo avanço pode estar na análise de cenários e no planejamento.', steps: ['Conectar indicadores a metas.', 'Analisar tendências com regularidade.', 'Criar cenários para decisões importantes.'] },
    { name: 'Estratégia', summary: 'Sua empresa demonstra práticas mais maduras de gestão financeira.', steps: ['Revisar hipóteses e indicadores continuamente.', 'Integrar planejamento financeiro à estratégia.', 'Evoluir processos conforme o negócio cresce.'] }
  ];
  const modal = $('#quizModal');
  const body = $('#quizBody');
  let currentQuestion = 0;
  let answers = Array(questions.length).fill(null);
  let returnFocus = null;
  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }
  function title(text) {
    const heading = node('h2', '', text);
    heading.id = 'quizTitle'; heading.tabIndex = -1;
    return heading;
  }
  function renderQuestion(focus = true) {
    const q = questions[currentQuestion];
    const count = node('p', 'quiz-count', `Pergunta ${currentQuestion + 1} de ${questions.length}`);
    const progress = node('div', 'quiz-progress');
    progress.setAttribute('aria-hidden', 'true');
    const fill = node('span'); fill.style.width = `${(currentQuestion + 1) / questions.length * 100}%`; progress.append(fill);
    const heading = title(q.text);
    const choices = node('fieldset', 'quiz-choices');
    choices.append(node('legend', '', 'Selecione a opção que melhor descreve sua realidade.'));
    const buttons = node('div', 'quiz-buttons');
    const back = node('button', 'quiz-back', '← Voltar'); back.type = 'button'; back.disabled = currentQuestion === 0;
    back.id = 'quizPrevious';
    const next = node('button', 'button', currentQuestion === questions.length - 1 ? 'Ver resultado →' : 'Continuar →');
    next.type = 'button'; next.id = 'quizNext'; next.disabled = answers[currentQuestion] === null;
    q.answers.forEach((answer, i) => {
      const label = node('label', 'quiz-choice');
      const radio = node('input'); radio.type = 'radio'; radio.name = 'quizAnswer'; radio.value = String(i); radio.checked = answers[currentQuestion] === i;
      radio.addEventListener('change', () => { answers[currentQuestion] = i; next.disabled = false; });
      label.append(radio, node('span', '', answer)); choices.append(label);
    });
    back.addEventListener('click', () => { currentQuestion = Math.max(0, currentQuestion - 1); renderQuestion(); });
    next.addEventListener('click', () => {
      if (answers[currentQuestion] === null) return;
      if (currentQuestion < questions.length - 1) { currentQuestion++; renderQuestion(); }
      else renderResult();
    });
    buttons.append(back, next);
    body.replaceChildren(count, progress, heading, choices, buttons);
    if (focus) heading.focus();
  }
  function renderResult() {
    const score = answers.reduce((sum, answer) => sum + answer, 0);
    const index = score <= 2 ? 0 : score <= 5 ? 1 : score <= 7 ? 2 : score <= 10 ? 3 : 4;
    const stage = stages[index];
    const scoreLabel = `Estágio ${index + 1} de ${stages.length}`;
    const heading = title(stage.name);
    const list = node('ul', 'quiz-result-list');
    stage.steps.forEach(step => list.append(node('li', '', step)));
    const actions = node('div', 'quiz-result-actions');
    const contact = node('a', 'button', 'Continuar para contato'); contact.href = 'contato.html?avaliacao=1';
    const error = node('p', 'quiz-error'); error.setAttribute('role', 'status'); error.hidden = true;
    contact.addEventListener('click', event => {
      try {
        sessionStorage.setItem('edenAvaliacao', JSON.stringify({ score: scoreLabel, result: stage.name,
          items: questions.map((q, i) => ({ pergunta: q.text, resposta: q.answers[answers[i]] })) }));
      } catch {
        event.preventDefault();
        error.hidden = false;
        error.textContent = 'Seu navegador não permitiu salvar a avaliação. Você pode seguir para o contato e contar seu resultado na mensagem.';
        contact.href = 'contato.html';
        contact.replaceWith(Object.assign(node('a', 'button', 'Ir para contato'), { href: 'contato.html' }));
      }
    });
    const again = node('button', 'quiz-back', 'Refazer avaliação'); again.type = 'button';
    again.addEventListener('click', startQuiz);
    actions.append(contact, again);
    body.replaceChildren(node('p', 'quiz-count', scoreLabel), heading, node('p', 'quiz-result-description', stage.summary), list, actions, error);
    heading.focus();
  }
  function startQuiz() { currentQuestion = 0; answers = Array(questions.length).fill(null); renderQuestion(); }
  $$('[data-open-quiz]').forEach(button => button.addEventListener('click', () => {
    returnFocus = button;
    setMenu(false);
    currentQuestion = 0; answers = Array(questions.length).fill(null); renderQuestion(false);
    modal.showModal(); document.body.classList.add('dialog-open'); $('#quizTitle').focus();
  }));
  $('.dialog-close', modal).addEventListener('click', () => modal.close());
  modal.addEventListener('click', event => {
    if (event.target !== modal) return;
    const r = modal.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) modal.close();
  });
  modal.addEventListener('close', () => { document.body.classList.remove('dialog-open'); if (returnFocus?.isConnected) returnFocus.focus(); });
})();
