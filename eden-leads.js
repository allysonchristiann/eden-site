'use strict';

(() => {
  const page = 'contato.html';

  document.querySelectorAll('.nav-cta').forEach(link => {
    link.href = page;
    link.innerHTML = 'Agendar diagnóstico <span aria-hidden="true">↗</span>';
  });

  document.querySelectorAll('a[href="#conversar"]').forEach(link => {
    link.href = page;
  });

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-open-contact]');
    if (!trigger) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const service = trigger.dataset.contactService;

    location.assign(
      service
        ? `${page}?servico=${encodeURIComponent(service)}`
        : page
    );
  }, true);

  const body = document.getElementById('quizBody');
  if (!body) return;

  let adding = false;

  const attach = () => {
    if (
      adding ||
      !body.querySelector('.quiz-result-score') ||
      body.querySelector('.eden-result-cta')
    ) return;

    adding = true;

    const area = document.createElement('div');
    area.className = 'eden-result-cta';
    area.style.cssText = 'display:grid;gap:10px;margin:24px 0 18px';

    const link = document.createElement('a');
    link.className = 'pill-button pill-dark';
    link.href = 'contato.html?avaliacao=1';
    link.style.cssText =
      'display:flex;justify-content:center;text-align:center;background:#286ae5;color:white';
    link.textContent = 'Continuar para contato ↗';

    const explanation = document.createElement('small');
    explanation.style.cssText = 'color:#a9b9d3;line-height:1.5';
    explanation.textContent =
      'Suas respostas acompanham o formulário de contato.';

    link.addEventListener('click', event => {
      try {
        const result =
          body.querySelector('#quizTitle')?.textContent || '';

        const score =
          body.querySelector('.quiz-result-score')?.textContent || '';

        const items = questions.map((q,index) => ({
          pergunta: q.text,
          resposta: q.answers[answers[index]] || 'Não respondida'
        }));

        sessionStorage.setItem(
          'edenAvaliacao',
          JSON.stringify({score,result,items})
        );
      } catch {
        event.preventDefault();
        alert('Não foi possível transferir a avaliação.');
      }
    });

    area.append(link,explanation);

    const repeat = [...body.querySelectorAll('button')]
      .find(el => /Refazer avaliação/.test(el.textContent));

    if (repeat) repeat.before(area);
    else body.append(area);

    adding = false;
  };

  new MutationObserver(attach).observe(body,{
    childList:true,
    subtree:true
  });

  attach();
})();