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

  const botao = form.querySelector('button[type="submit"]');
  const caixa = document.getElementById('formResult');
  const textoOriginal = botao.textContent;

  let enviando = false;
  let ticket = '';
  let timeout;
  let proximaConsulta;

  function mostrar(texto, estado) {
    caixa.textContent = texto;
    caixa.dataset.state = estado;
    caixa.classList.add('show');
    caixa.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }

  function finalizar(sucesso) {
    if (!enviando) return;

    enviando = false;
    clearTimeout(timeout);
    clearTimeout(proximaConsulta);

    botao.disabled = false;
    botao.textContent = textoOriginal;

    if (sucesso) {
      mostrar(
        'Solicitação enviada com sucesso! A EDEN recebeu seus dados.',
        'success'
      );

      form.reset();
      sessionStorage.removeItem('edenAvaliacao');
    } else {
      mostrar(
        'Não foi possível confirmar o envio. Verifique seu e-mail antes de tentar novamente.',
        'error'
      );
    }
  }

  window.edenEmailStatus = function(resultado) {
    if (!enviando || !resultado || resultado.id !== ticket) return;

    if (resultado.ok === true) {
      finalizar(true);
    }
  };

  function consultar() {
    if (!enviando) return;

    const url = new URL(form.action);
    url.searchParams.set('receipt', ticket);
    url.searchParams.set('_', String(Date.now()));

    const script = document.createElement('script');
    script.src = url.toString();
    script.async = true;

    const continuar = () => {
      script.remove();

      if (enviando) {
        proximaConsulta = setTimeout(consultar, 1800);
      }
    };

    script.onload = continuar;
    script.onerror = continuar;

    document.head.appendChild(script);
  }

  form.addEventListener('submit', function(evento) {
    evento.preventDefault();
    evento.stopImmediatePropagation();

    if (enviando || !form.reportValidity()) return;

    ticket = Array.from(
      crypto.getRandomValues(new Uint8Array(16)),
      b => b.toString(16).padStart(2, '0')
    ).join('');

    let campo = form.querySelector('[name="eden_ticket"]');

    if (!campo) {
      campo = document.createElement('input');
      campo.type = 'hidden';
      campo.name = 'eden_ticket';
      form.appendChild(campo);
    }

    campo.value = ticket;
    enviando = true;

    botao.disabled = true;
    botao.textContent = 'Enviando solicitação...';

    mostrar('Enviando seus dados à EDEN...', 'pending');

    const dados = new URLSearchParams(new FormData(form));

    fetch(form.action, {
      method: 'POST',
      mode: 'no-cors',
      credentials: 'omit',
      body: dados
    }).catch(erro => {
      console.warn('Resposta do envio indisponivel', erro);
    });

    timeout = setTimeout(() => finalizar(false), 60000);
    proximaConsulta = setTimeout(consultar, 1800);

  }, true);
})();