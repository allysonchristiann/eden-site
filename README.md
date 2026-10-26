# EDEN Soluções Financeiras — site institucional

Protótipo responsivo inspirado na linguagem visual e nos padrões de navegação e apresentação de produtos da Apple. Identidade, gráficos e ilustrações originais da EDEN. Conteúdo institucional reescrito a partir dos temas publicados pelo Laboratório de Finanças (https://labfinancas.com.br/).

## Executar

Abra `index.html` no navegador. Opcionalmente, sirva localmente com:

```bash
python3 -m http.server 8000
```

Depois, acesse `http://localhost:8000`.

## Funcionalidades

- Layout responsivo desktop e mobile, menu adaptativo e animações de entrada.
- Modal com informações das três soluções.
- Seletor interativo dos cinco níveis de maturidade financeira.
- Questionário interativo de quatro perguntas, com estágio orientativo.
- Formulário de contato com validação HTML5.
- Respeita `prefers-reduced-motion`, navegação por teclado e fechamento de modais com Esc.

## Antes de publicar

1. **Formulário de contato:** configurar `CONTACT_FORM_ENDPOINT` no arquivo `script.js` com um endpoint HTTPS real (API própria, Formspree etc.). Na ausência dele, o formulário informa explicitamente que os dados não são enviados. Conferir requisitos de CORS, autenticação, antispam e tratamento de dados pessoais.
2. **Identidade e conteúdo:** revisar nome, textos e serviços para assegurar que são realmente prestados pela EDEN. Não foram utilizados nomes, depoimentos nem números de experiência de clientes do Laboratório de Finanças.
3. **Informações empresariais:** inserir contatos oficiais, CNPJ, política de privacidade e outros dados regulatórios aplicáveis, após confirmação.
4. **Infraestrutura:** hospedar via HTTPS (Netlify, Vercel, Cloudflare Pages ou servidor web de sua escolha).
5. **SEO:** conferir metatags, domínio canônico e política de cookies caso sejam ativadas ferramentas de análise.

A interface do painel apresenta **dados fictícios** e não se conecta a contas financeiras.
