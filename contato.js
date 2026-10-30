'use strict';

(() => {
  document.getElementById('year').textContent = new Date().getFullYear();

  const params = new URLSearchParams(location.search);
  const form = document.getElementById('leadForm');
  const service = params.get('servico');

  if (
    service &&
    [...form.elements.servico.options].some(option => option.value === service)
  ) {
    form.elements.servico.value = service;
  }

  if (params.get('avaliacao') === '1') {
    try {
      const stored = JSON.parse(
        sessionStorage.getItem('edenAvaliacao') || 'null'
      );

      if (stored?.items?.length) {
        document.getElementById('avaliacaoResumo').classList.add('show');

        document.getElementById('etapaResumo').textContent =
          `${stored.score} — ${stored.result}`;

        const list = document.getElementById('respostasResumo');

        const lines = stored.items.map((item,i) => {
          const pergunta = String(item.pergunta || '').replace(/^\s*\d+[.)]\s*/, '');
          const li = document.createElement('li');
          li.textContent = pergunta;

          const span = document.createElement('span');
          span.textContent = item.resposta;

          li.append(span);
          list.append(li);

          return `${i + 1}. ${pergunta}\nResposta: ${item.resposta}`;
        });

        document.getElementById('avaliacaoHidden').value =
          `${stored.score} — ${stored.result}\n${lines.join('\n\n')}`;
      }
    } catch {}
  }

})();