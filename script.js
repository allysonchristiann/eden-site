
'use strict';
document.documentElement.classList.add('js');

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

$('#currentYear').textContent = new Date().getFullYear();

const header = $('.site-header');
const progress = $('.scroll-progress');
const scene = $('.vision-scene');
let framePending = false;
function paintScroll() {
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  progress.style.transform = `scaleX(${Math.min(1, Math.max(0, scrollY / maxScroll))})`;
  header.classList.toggle('scrolled', scrollY > 18);
  if (!reducedMotion && scene) {
    const bounds = scene.getBoundingClientRect();
    const total = Math.max(1, bounds.height - innerHeight);
    const value = Math.max(0, Math.min(1, -bounds.top / total));
    scene.style.setProperty('--scene', value.toFixed(3));
  }
  framePending = false;
}
window.addEventListener('scroll', () => {
  if (!framePending) { framePending = true; requestAnimationFrame(paintScroll); }
}, { passive: true });
window.addEventListener('resize', paintScroll, { passive: true });
paintScroll();

if ('IntersectionObserver' in window && !reducedMotion) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  }, { rootMargin: '0px 0px -60px 0px', threshold: 0.06 });
  $$('.reveal').forEach(el => observer.observe(el));
} else { $$('.reveal').forEach(el => el.classList.add('is-visible')); }

const menuButton = $('.mobile-menu-button');
const navMiddle = $('#navMiddle');
function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Abrir menu');
  navMiddle.classList.remove('is-open');
}
menuButton.addEventListener('click', () => {
  const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isExpanded));
  menuButton.setAttribute('aria-label', isExpanded ? 'Abrir menu' : 'Fechar menu');
  navMiddle.classList.toggle('is-open', !isExpanded);
});
$$('.nav-middle a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

const quizModal = $('#quizModal');
const contactModal = $('#contactModal');
const dialogs = [quizModal, contactModal];
let restoringFocus = null;
function openModal(dialog) {
  dialogs.forEach(item => { if (item.open) item.close(); });
  restoringFocus = document.activeElement;
  dialog.showModal();
  document.body.classList.add('dialog-open');
}
function closeModal(dialog) { if (dialog.open) dialog.close(); }
for (const dialog of dialogs) {
  $$('[data-close-modal]', dialog).forEach(button => button.addEventListener('click', () => closeModal(dialog)));
  dialog.addEventListener('click', event => { if (event.target === dialog) closeModal(dialog); });
  dialog.addEventListener('close', () => {
    if (!dialogs.some(d => d.open)) document.body.classList.remove('dialog-open');
    if (restoringFocus?.isConnected) restoringFocus.focus({ preventScroll: true });
  });
}

const chartPaths = {
  caixa: 'M0 205C82 186 129 212 198 176S299 160 354 174 460 112 518 127 617 86 686 95 784 65 844 74 927 32 960 21',
  indicadores: 'M0 209C56 198 122 179 177 194S273 126 332 142 445 123 497 128 600 61 648 80 744 54 809 70 911 38 960 16',
  planejamento: 'M0 222C68 210 108 205 177 196S307 188 375 164 484 154 534 129 648 107 706 82 822 60 875 43 932 25 960 8'
};
const views = {
  caixa: {
    kicker: 'VISÃO DO CAIXA', title: 'Saiba onde está.\nPlaneje onde quer chegar.',
    desc: 'Acompanhe entradas, saídas e possibilidades com uma leitura simples e objetiva.',
    metrics: [['Visibilidade', 'Dia a dia'], ['Perspectiva', 'Futuro'], ['Prioridade', 'Clareza']]
  },
  indicadores: {
    kicker: 'INDICADORES', title: 'Decisões melhores.\nDados mais claros.',
    desc: 'Transforme a rotina financeira em sinais úteis para avaliar o desempenho do negócio.',
    metrics: [['Análise', 'Evolução'], ['Foco', 'Resultado'], ['Leitura', 'Simples']]
  },
  planejamento: {
    kicker: 'PLANEJAMENTO', title: 'Enxergue cenários.\nEvolua com direção.',
    desc: 'Antecipe decisões e organize prioridades com uma perspectiva de médio e longo prazo.',
    metrics: [['Horizonte', 'Cenários'], ['Prioridade', 'Estratégia'], ['Direção', 'Futuro']]
  }
};
const viewTabs = $$('.experience-tab');
function selectView(name, focus = false) {
  const data = views[name]; if (!data) return;
  viewTabs.forEach(tab => {
    const selected = tab.dataset.view === name;
    tab.classList.toggle('active', selected);
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected) $('#tabPanel').setAttribute('aria-labelledby', tab.id);
  });
  if (focus) viewTabs.find(tab => tab.dataset.view === name).focus();
  $('#productKicker').textContent = data.kicker;
  $('#productTitle').textContent = data.title;
  $('#productTitle').style.whiteSpace = 'pre-line';
  $('#productDescription').textContent = data.desc;
  data.metrics.forEach(([label, value], index) => {
    $(`#stat${['One','Two','Three'][index]}Label`).textContent = label;
    $(`#stat${['One','Two','Three'][index]}`).textContent = value;
  });
  $('#productLine').setAttribute('d', chartPaths[name]);
  $('#productArea').setAttribute('d', `${chartPaths[name]}V250H0Z`);
  const screen = $('.product-screen');
  screen.classList.remove('is-switching');
  void screen.offsetWidth;
  if (!reducedMotion) screen.classList.add('is-switching');
}
viewTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectView(tab.dataset.view));
  tab.addEventListener('keydown', event => {
    let target = null;
    if (event.key === 'ArrowRight') target = viewTabs[(index + 1) % viewTabs.length];
    if (event.key === 'ArrowLeft') target = viewTabs[(index + viewTabs.length - 1) % viewTabs.length];
    if (event.key === 'Home') target = viewTabs[0];
    if (event.key === 'End') target = viewTabs[viewTabs.length - 1];
    if (target) { event.preventDefault(); selectView(target.dataset.view, true); }
  });
});
selectView('caixa');

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
let currentQuestion = 0;
let answers = Array(questions.length).fill(null);
function showQuestion() {
  const q = questions[currentQuestion];
  $('#quizCount').textContent = `PERGUNTA ${currentQuestion + 1} DE ${questions.length}`;
  $('#quizProgress').style.width = `${(currentQuestion + 1) / questions.length * 100}%`;
  $('#quizTitle').textContent = q.text;
  $('#quizIntro').textContent = 'Selecione a opção que melhor descreve sua realidade.';
  $('#quizOptions').replaceChildren(...q.answers.map((answer, i) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'quiz-choice';
    button.setAttribute('aria-pressed', String(answers[currentQuestion] === i));
    if (answers[currentQuestion] === i) button.classList.add('is-selected');
    button.textContent = answer;
    button.addEventListener('click', () => {
      answers[currentQuestion] = i;
      $$('.quiz-choice').forEach((el, j) => {
        el.classList.toggle('is-selected', j === i);
        el.setAttribute('aria-pressed', String(j === i));
      });
      $('#quizNext').disabled = false;
    });
    return button;
  }));
  $('#quizPrevious').hidden = currentQuestion === 0;
  $('#quizNext').disabled = answers[currentQuestion] === null;
  $('#quizNext').textContent = currentQuestion === questions.length - 1 ? 'Ver resultado →' : 'Continuar →';
}
function showResult() {
  const score = answers.reduce((sum, answer) => sum + (answer ?? 0), 0);
  const stageIndex = score <= 2 ? 0 : score <= 5 ? 1 : score <= 7 ? 2 : score <= 10 ? 3 : 4;
  const stage = stages[stageIndex];
  const area = $('#quizBody');
  area.replaceChildren();
  const scoreLabel = document.createElement('p'); scoreLabel.className = 'quiz-result-score'; scoreLabel.textContent = `ESTÁGIO ${stageIndex + 1} DE 5`;
  const heading = document.createElement('h2'); heading.id = 'quizTitle'; heading.textContent = stage.name;
  const desc = document.createElement('p'); desc.textContent = stage.summary;
  const list = document.createElement('ul'); list.className = 'quiz-result-list';
  stage.steps.forEach(str => { const li = document.createElement('li'); li.textContent = `↗  ${str}`; list.append(li); });
  const note = document.createElement('p'); note.className = 'form-legal'; note.textContent = 'Resultado orientativo baseado nas suas respostas, não é um diagnóstico profissional.';
  const again = document.createElement('button'); again.type = 'button'; again.className = 'pill-button pill-dark'; again.textContent = 'Refazer avaliação ↗';
  again.addEventListener('click', startQuiz);
  area.append(scoreLabel, heading, desc, list, again, note);
}
const initialQuizMarkup = $('#quizBody').innerHTML;
function startQuiz() {
  if (!$('#quizNext')) $('#quizBody').innerHTML = initialQuizMarkup;
  answers = Array(questions.length).fill(null);
  currentQuestion = 0;
  $('#quizPrevious').onclick = () => { currentQuestion = Math.max(0, currentQuestion - 1); showQuestion(); };
  $('#quizNext').onclick = () => {
    if (answers[currentQuestion] === null) return;
    if (currentQuestion < questions.length - 1) { currentQuestion++; showQuestion(); }
    else showResult();
  };
  showQuestion();
}
$$('[data-open-quiz]').forEach(button => button.addEventListener('click', () => { startQuiz(); openModal(quizModal); }));

$$('[data-open-contact]').forEach(button => button.addEventListener('click', () => {
  const service = button.dataset.contactService;
  if (service) $('#contactForm select[name="servico"]').value = service;
  openModal(contactModal);
}));
$('#contactForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const values = new FormData(form);
  const message = [
    'Solicitação de contato — EDEN',
    `Nome: ${values.get('nome')}`,
    `E-mail: ${values.get('email')}`,
    `Empresa: ${values.get('empresa')}`,
    `Interesse: ${values.get('servico')}`,
    `Mensagem: ${values.get('mensagem') || '(não informada)'}`
  ].join('\n');
  const status = $('#formResult');
  status.replaceChildren();
  let copied = false;
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(message); copied = true; }
  } catch { copied = false; }
  status.textContent = copied
    ? 'Solicitação copiada. O formulário ainda não realiza envios; cole a mensagem no canal de contato da EDEN.'
    : 'Solicitação preparada abaixo. Copie a mensagem manualmente; o formulário ainda não realiza envios.';
  if (!copied) {
    const text = document.createElement('textarea'); text.rows = 6; text.readOnly = true; text.value = message;
    text.style.width = '100%'; text.style.marginTop = '12px'; text.style.padding = '12px'; text.style.border = '1px solid #ccd4e1'; text.style.borderRadius = '9px';
    status.append(text); text.focus(); text.select();
  }
});

if (performance.getEntriesByType('navigation')[0]?.type === 'reload') {
    const resetEden = () => {
        document.querySelectorAll('details').forEach(el => {
            el.open = false;
        });
        document.querySelectorAll('form').forEach(el => el.reset());
        document.querySelectorAll('dialog[open]').forEach(el => el.close());
        document.body.classList.remove('dialog-open');
        window.scrollTo(0, 0);
    };

    resetEden();

    window.addEventListener('pageshow', () => {
        resetEden();
        requestAnimationFrame(resetEden);
        setTimeout(() => {
            document.documentElement.style.removeProperty('scroll-behavior');
        }, 300);
    });
}
