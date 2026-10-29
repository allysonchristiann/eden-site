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
          const li = document.createElement('li');
          li.textContent = `${i + 1}. ${item.pergunta}`;

          const span = document.createElement('span');
          span.textContent = item.resposta;

          li.append(span);
          list.append(li);

          return `${i + 1}. ${item.pergunta}\nResposta: ${item.resposta}`;
        });

        document.getElementById('avaliacaoHidden').value =
          `${stored.score} — ${stored.result}\n${lines.join('\n\n')}`;
      }
    } catch {}
  }

  form.addEventListener('submit',event => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const data = new FormData(form);

    const summary = [
      'CONTATO EDEN',
      `Nome: ${data.get('nome')}`,
      `E-mail: ${data.get('email')}`,
      `Empresa: ${data.get('empresa')}`,
      `Telefone: ${data.get('telefone') || 'Não informado'}`,
      `Solução: ${data.get('servico')}`,
      `Mensagem: ${data.get('mensagem') || 'Não informada'}`,
      data.get('avaliacao')
        ? `\nAVALIAÇÃO FINANCEIRA\n${data.get('avaliacao')}`
        : ''
    ].filter(Boolean).join('\n');

    const area = document.getElementById('formResult');
    area.replaceChildren();
    area.classList.add('show');

    const title = document.createElement('strong');
    title.textContent = 'Solicitação preparada. Nenhum e-mail foi enviado.';

    const preview = document.createElement('textarea');
    preview.readOnly = true;
    preview.value = summary;
    preview.setAttribute('aria-label','Resumo da solicitação');

    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copiar dados';

    copy.addEventListener('click',async () => {
      try {
        await navigator.clipboard.writeText(summary);
        copy.textContent = 'Dados copiados ✓';
      } catch {
        preview.focus();
        preview.select();
        copy.textContent = 'Selecione e copie os dados acima';
      }
    });

    area.append(title,preview,copy);

    area.scrollIntoView({
      behavior:matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block:'nearest'
    });
  });
})();