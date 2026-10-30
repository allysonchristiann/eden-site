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

  form.addEventListener('submit', async event => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const button = form.querySelector('button[type="submit"]');
    if (button.disabled) return;

    const data = new FormData(form);
    const feedback = document.getElementById('formResult');

    feedback.classList.add('show');
    feedback.replaceChildren();

    const payload = {
      name: String(data.get('nome') || '').trim(),
      email: String(data.get('email') || '').trim(),
      empresa: String(data.get('empresa') || '').trim(),
      telefone: String(data.get('telefone') || '').trim(),
      servico: String(data.get('servico') || '').trim(),
      mensagem: String(data.get('mensagem') || '').trim(),
      avaliacao_financeira:
        String(data.get('avaliacao') || '').trim() || 'Não realizada',
      _subject: 'Novo contato EDEN - ' +
        String(data.get('empresa') || 'Site EDEN').trim(),
      _template: 'table',
      _url: 'https://edenfin.com.br/contato.html',
      _honey: String(data.get('_honey') || '')
    };

    if (payload._honey) return;

    const textoOriginal = button.textContent;

    button.disabled = true;
    button.textContent = 'Enviando solicitação...';
    feedback.textContent = 'Enviando seus dados com segurança...';

    try {
      const response = await fetch(
        'https://formsubmit.co/ajax/contato@edenfin.com.br',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const result = await response.json();

      const success =
        result.success === true ||
        result.success === 'true';

      if (!response.ok || !success) {
        const message = String(result.message || '');

        if (/activat|confirm/i.test(message)) {
          feedback.textContent =
            'O formulário ainda precisa ser ativado. ' +
            'Verifique contato@edenfin.com.br e confirme ' +
            'a mensagem enviada pelo FormSubmit.';
          return;
        }

        throw new Error(message || 'Falha no envio');
      }

      feedback.textContent =
        'Solicitação enviada com sucesso! ' +
        'Obrigado pelo contato. A EDEN responderá pelo e-mail informado.';

      form.reset();
      sessionStorage.removeItem('edenAvaliacao');

    } catch (error) {
      console.error('Erro ao enviar formulário:', error);

      feedback.textContent =
        'Não foi possível enviar sua solicitação. ' +
        'Tente novamente ou escreva para contato@edenfin.com.br.';

    } finally {
      button.disabled = false;
      button.textContent = textoOriginal;
    }
  });
})();