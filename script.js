(() => {
  'use strict';
  document.getElementById('year').textContent = new Date().getFullYear();
  const menu = document.querySelector('.menu-toggle');
  const links = document.querySelector('.nav-links');
  menu.addEventListener('click', () => {
    const opened = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(opened));
    menu.setAttribute('aria-label', opened ? 'Fechar menu' : 'Abrir menu');
    links.classList.toggle('open', opened);
  });
  document.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Abrir menu');
  }));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), {threshold:.09,rootMargin:'0px 0px 35px 0px'});
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  } else document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));

  const services = {
    contabilidade: {tag:'01 / CONTABILIDADE',title:'Contabilidade que gera clareza.',desc:'A contabilidade não precisa ser apenas uma obrigação. Quando organizada, ela se torna uma fonte confiável para entender a saúde e a evolução da empresa.',items:['Escrituração e organização das informações contábeis','Acompanhamento de obrigações e rotinas fiscais','Relatórios que dão contexto aos resultados do negócio']},
    bpo: {tag:'02 / BPO FINANCEIRO',title:'Sua operação financeira, organizada.',desc:'Da rotina de pagamentos à visão de caixa, o BPO ajuda a criar disciplina e previsibilidade para quem precisa manter a operação em movimento.',items:['Gestão de contas a pagar e a receber','Conciliações e padronização de processos','Acompanhamento do fluxo de caixa e rotinas financeiras']},
    estrategia: {tag:'03 / GESTÃO ESTRATÉGICA',title:'Decisões com visão de futuro.',desc:'Com dados e processos consistentes, a gestão estratégica conecta o financeiro às escolhas que determinam o crescimento do negócio.',items:['Análise de indicadores e desempenho financeiro','Projeções e cenários para planejamento','Apoio na avaliação de investimentos e expansão']}
  };
  const dialogs = [...document.querySelectorAll('dialog')];
  const serviceDialog = document.getElementById('serviceDialog');
  const contactDialog = document.getElementById('contactDialog');
  const quizDialog = document.getElementById('quizDialog');
  function openDialog(dialog) { dialogs.forEach(d=>{if(d.open)d.close();}); dialog.showModal(); }
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  dialogs.forEach(d => d.addEventListener('click', ev=>{ if(ev.target === d) d.close(); }));
  document.querySelectorAll('[data-open-contact]').forEach(button => button.addEventListener('click', () => openDialog(contactDialog)));
  document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', () => {
    const s = services[button.dataset.service];
    document.getElementById('serviceDialogEyebrow').textContent = s.tag;
    document.getElementById('serviceDialogTitle').textContent = s.title;
    document.getElementById('serviceDialogDesc').textContent = s.desc;
    document.getElementById('serviceDialogBullets').replaceChildren(...s.items.map(txt=>{const li=document.createElement('li');li.textContent=txt;return li;}));
    openDialog(serviceDialog);
  }));

  const stageData = [
    {name:'Sobrevivência.',desc:'A prioridade é pagar as contas e manter a operação funcionando. Os controles ainda são simples e muitas decisões passam pelo dono.'},
    {name:'Segurança.',desc:'As rotinas financeiras começam a ganhar organização. A empresa reduz surpresas, acompanha o caixa e estabelece processos mais confiáveis.'},
    {name:'Controle.',desc:'Receitas, despesas e custos ganham visibilidade. A empresa passa a entender melhor seus resultados e sua situação financeira.'},
    {name:'Desempenho.',desc:'Indicadores, rentabilidade e eficiência entram na rotina. O financeiro deixa de apenas registrar e começa a orientar melhorias.'},
    {name:'Estratégia.',desc:'O financeiro participa das decisões do negócio. Indicadores e projeções orientam investimentos, expansão e criação de valor.'}
  ];
  function setStage(index) {
    const st = stageData[index], detail=document.getElementById('stageDetail');
    document.querySelectorAll('[data-stage]').forEach(btn => {
      const active = Number(btn.dataset.stage)===index;
      btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));
    });
    detail.innerHTML=`<div class="stage-detail-label">ESTÁGIO ${String(index+1).padStart(2,'0')} / 05</div><div class="stage-detail-body"><div><h3>${st.name}</h3><p>${st.desc}</p></div><div class="stage-visual" aria-hidden="true"><div class="stage-visual-inner"><span class="stage-visual-caption">MATURIDADE FINANCEIRA</span><strong>${String(index+1).padStart(2,'0')}<span>/05</span></strong><div class="stage-meter">${Array.from({length:5},(_,i)=>`<i ${i<=index?'class="filled"':''}></i>`).join('')}</div></div></div></div>`;
  }
  document.querySelectorAll('[data-stage]').forEach(btn=>btn.addEventListener('click',()=>setStage(Number(btn.dataset.stage))));
  setStage(4);

  const quiz=[
    {q:'Como são feitos os controles financeiros?',opts:['Acompanhamos principalmente o saldo e os pagamentos.','Temos rotinas básicas, mas ainda pouco padronizadas.','Usamos processos e relatórios frequentes.','Acompanhamos indicadores e objetivos de negócio.']},
    {q:'Qual é a previsibilidade do fluxo de caixa?',opts:['Não temos uma projeção confiável.','Projetamos apenas os próximos dias ou semanas.','Mantemos projeções mensais e revisamos os desvios.','Trabalhamos com cenários de médio e longo prazo.']},
    {q:'Como sua empresa acompanha a rentabilidade?',opts:['Ainda não sabemos a margem real do negócio.','Analisamos o resultado de forma pontual.','Conhecemos custos, margens e principais indicadores.','Usamos análises de rentabilidade para direcionar decisões.']},
    {q:'Qual é o papel do financeiro nas decisões?',opts:['Quase tudo é decidido sem análises financeiras.','O financeiro ajuda quando aparece algum problema.','Os números orientam decisões operacionais frequentes.','O financeiro participa do planejamento estratégico.']}
  ];
  let step=0;let answers=[null,null,null,null];
  const quizContent=document.getElementById('quizContent');
  const initialQuizMarkup=quizContent.innerHTML;
  function renderQuiz(){
    quizContent.innerHTML=initialQuizMarkup;
    document.getElementById('quizCount').textContent=`QUESTÃO ${step+1} DE ${quiz.length}`;
    document.getElementById('quizProgress').style.width=`${((step+1)/quiz.length)*100}%`;
    document.getElementById('quizQuestion').textContent=quiz[step].q;
    const options=document.getElementById('quizOptions');
    quiz[step].opts.forEach((value,index)=>{
      const btn=document.createElement('button');btn.type='button';btn.className='quiz-option';btn.textContent=value;
      btn.setAttribute('aria-pressed',String(answers[step]===index));
      btn.addEventListener('click',()=>{answers[step]=index;options.querySelectorAll('button').forEach((other,i)=>other.setAttribute('aria-pressed',String(i===index)));document.getElementById('quizNext').disabled=false;});
      options.appendChild(btn);
    });
    document.getElementById('quizBack').style.visibility=step===0?'hidden':'visible';
    document.getElementById('quizNext').disabled=answers[step]===null;
    document.getElementById('quizNext').innerHTML=step===quiz.length-1?'Ver resultado →':'Continuar →';
    document.getElementById('quizBack').addEventListener('click',()=>{step--;renderQuiz();});
    document.getElementById('quizNext').addEventListener('click',()=>{if(answers[step]===null)return;if(step<quiz.length-1){step++;renderQuiz();}else showResult();});
  }
  function showResult(){
    const avg=answers.reduce((a,b)=>a+b,0)/quiz.length;
    // A pontuação é uma aproximação orientativa, não uma avaliação profissional.
    const level=Math.max(0,Math.min(4,Math.round(avg*4/3)));
    const s=stageData[level];
    quizContent.innerHTML=`<h2 id="quizTitle">Seu estágio estimado: ${s.name}</h2><p>Uma primeira leitura de onde está sua estrutura financeira hoje.</p><div class="quiz-result-number">${String(level+1).padStart(2,'0')}<span>/05</span></div><div class="stage-meter">${Array.from({length:5},(_,i)=>`<i ${i<=level?'class="filled"':''}></i>`).join('')}</div><p class="quiz-result-copy">${s.desc}</p><p class="quiz-result-copy"><strong>Importante:</strong> esta avaliação é simplificada e não substitui um diagnóstico realizado por profissionais.</p><div class="quiz-result-cta"><button type="button" class="button button-primary" id="quizContact">Solicitar uma análise ↗</button><button type="button" class="button button-outline" id="quizRepeat">Refazer avaliação</button></div>`;
    document.getElementById('quizContact').addEventListener('click',()=>openDialog(contactDialog));
    document.getElementById('quizRepeat').addEventListener('click',startQuiz);
  }
  function startQuiz(){step=0;answers=[null,null,null,null];renderQuiz();if(!quizDialog.open)openDialog(quizDialog);}
  document.getElementById('openQuiz').addEventListener('click',startQuiz);
  document.querySelectorAll('[data-open-quiz]').forEach(btn=>btn.addEventListener('click',startQuiz));

  // Antes da publicação, configure abaixo um endpoint HTTPS (Formspree, API própria etc.).
  // Vazio = formulário de demonstração, sem transmissão de dados.
  const CONTACT_FORM_ENDPOINT='';
  document.getElementById('contactForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form=e.currentTarget,feedback=document.getElementById('formFeedback');
    if(!form.reportValidity())return;
    const values=Object.fromEntries(new FormData(form));
    if(!CONTACT_FORM_ENDPOINT){
      feedback.textContent='Campos validados. Este protótipo não envia dados. Configure o endpoint de contato antes de publicar.';
      return;
    }
    const submit=form.querySelector('[type="submit"]');
    submit.disabled=true;feedback.textContent='Enviando...';
    try{
      const response=await fetch(CONTACT_FORM_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(values)});
      if(!response.ok)throw new Error('Falha no envio');
      feedback.textContent='Solicitação enviada. Entraremos em contato.';form.reset();
    }catch(err){feedback.textContent='Não foi possível enviar sua solicitação. Tente novamente mais tarde.';}
    finally{submit.disabled=false;}
  });
})();
