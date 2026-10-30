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

(function edenFormDelivery() {
  const form = document.getElementById("leadForm");
  if (!form) return;

  const button = form.querySelector('button[type="submit"]');
  const result = document.getElementById("formResult");
  const original = button.textContent;

  const frame = document.createElement("iframe");
  frame.name = "edenEnvioSilencioso";
  frame.style.display = "none";
  frame.setAttribute("aria-hidden", "true");
  document.body.appendChild(frame);

  form.target = frame.name;

  let enviando = false;
  let ticket = "";
  let limite;

  function mostrar(texto, estado) {
    result.textContent = texto;
    result.classList.add("show");
    result.dataset.state = estado;
  }

  function finalizar(sucesso) {
    enviando = false;
    clearTimeout(limite);
    button.disabled = false;
    button.textContent = original;

    if (sucesso) {
      mostrar(
        "✓ Solicitação enviada com sucesso! " +
        "A EDEN recebeu seus dados e entrará em contato.",
        "success"
      );

      form.reset();
      sessionStorage.removeItem("edenAvaliacao");
    } else {
      mostrar(
        "Não foi possível confirmar o envio. " +
        "Verifique seu e-mail antes de tentar novamente.",
        "error"
      );
    }
  }

  window.edenEmailStatus = function(data) {
    if (!enviando || data.id !== ticket) return;
    if (data.ok) finalizar(true);
  };

  function verificar() {
    if (!enviando) return;

    const script = document.createElement("script");

    const url = new URL(form.action);
    url.searchParams.set("receipt", ticket);
    url.searchParams.set("_", Date.now());

    script.src = url.toString();

    const proxima = () => {
      script.remove();
      if (enviando) setTimeout(verificar, 1800);
    };

    script.onload = proxima;
    script.onerror = proxima;

    document.head.appendChild(script);
  }

  form.addEventListener("submit", function(event) {
    event.preventDefault();

    if (enviando || !form.reportValidity()) return;

    ticket = Array.from(
      crypto.getRandomValues(new Uint8Array(16)),
      b => b.toString(16).padStart(2, "0")
    ).join("");

    let campo = form.querySelector('[name="eden_ticket"]');

    if (!campo) {
      campo = document.createElement("input");
      campo.type = "hidden";
      campo.name = "eden_ticket";
      form.appendChild(campo);
    }

    campo.value = ticket;

    enviando = true;
    button.disabled = true;
    button.textContent = "Enviando solicitação...";

    mostrar("Enviando seus dados à EDEN...", "pending");

    HTMLFormElement.prototype.submit.call(form);

    limite = setTimeout(() => finalizar(false), 60000);

    setTimeout(verificar, 1200);
  });
})();