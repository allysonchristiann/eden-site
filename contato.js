'use strict';

(() => {
  const form = document.getElementById('leadForm');
  if (!form) return;

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const params = new URLSearchParams(location.search);
  const select = form.elements.namedItem('servico');
  const escolhido = params.get('servico');

  if (escolhido && select &&
      [...select.options].some(o => o.value === escolhido)) {
    select.value = escolhido;
  }

  if (params.get('avaliacao') === '1') {
    try {
      const avaliacao = JSON.parse(
        sessionStorage.getItem('edenAvaliacao') || 'null'
      );

      if (avaliacao && Array.isArray(avaliacao.items) &&
          avaliacao.items.length) {
        const painel = document.getElementById('avaliacaoResumo');
        const etapa = document.getElementById('etapaResumo');
        const lista = document.getElementById('respostasResumo');
        const campo = document.getElementById('avaliacaoHidden');

        painel.classList.add('show');
        etapa.textContent = [avaliacao.score, avaliacao.result]
          .filter(Boolean).join(' — ');

        lista.replaceChildren();

        const linhas = avaliacao.items.map((item, i) => {
          const pergunta = String(item.pergunta || '')
            .replace(/^\s*\d+[.)]\s*/, '');
          const resposta = String(item.resposta || 'Não informada');

          const li = document.createElement('li');
          li.textContent = pergunta;

          const span = document.createElement('span');
          span.textContent = resposta;

          li.append(span);
          lista.append(li);

          return `${i + 1}. ${pergunta}\nResposta: ${resposta}`;
        });

        campo.value = `${etapa.textContent}\n\n${linhas.join('\n\n')}`;
      }
    } catch (erro) {
      console.warn('Avaliacao indisponivel', erro);
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (!form.reportValidity()) return;
    if (form.elements.namedItem('_honey')?.value) return;

    const valor = nome =>
      String(form.elements.namedItem(nome)?.value || '').trim();

    const linhas = [
      '*Novo contato - EDEN*',
      `*Nome:* ${valor('nome')}`,
      `*Empresa:* ${valor('empresa')}`,
      `*E-mail:* ${valor('email')}`,
      valor('telefone') ? `*Telefone:* ${valor('telefone')}` : '',
      `*Solução de interesse:* ${valor('servico')}`,
      valor('mensagem') ? `*Mensagem:* ${valor('mensagem')}` : '',
      valor('avaliacao') ? `*Avaliação financeira:*\n${valor('avaliacao')}` : ''
    ].filter(Boolean);

    const mensagem = encodeURIComponent(linhas.join('\n\n'));

    window.location.assign(
      'https://wa.me/5511972147686?text=' + mensagem
    );
  }, true);
})();