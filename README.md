# EDEN — Site institucional v3

Site estático original para a EDEN, com referência de linguagem visual minimalista, apresentações de produto, movimento sutil e tipografia editorial. Serviços: BPO financeiro, fluxo de caixa e tesouraria, planejamento e budget, controladoria e indicadores, contas a receber e cobrança, faturamento e apoio fiscal, relatórios financeiros. Textos próprios, baseados nos temas do Laboratório de Finanças; não foram reproduzidos seus depoimentos, resultados nem dados de contato.

## Arquivos

- `index.html` — página e metadados para `https://edenfin.com.br`.
- `styles.css` — visual responsivo, cenas e animações.
- `script.js` — interações, aba demonstrativa, FAQ e avaliação de quatro perguntas.
- `favicon.svg` — ícone original da EDEN.
- `CNAME` — configuração do domínio personalizado do GitHub Pages. **Não exclua este arquivo.**

## Atualizar o site GitHub Pages pelo PowerShell

Execute no **Windows PowerShell** onde você tem o repositório original:

```powershell
cd "$HOME\acme-publicacao\acme-site"
git pull --rebase origin main
Expand-Archive -Path "$HOME\Downloads\eden-site-v2.zip" -DestinationPath "$HOME\acme-publicacao\acme-site" -Force
git add index.html styles.css script.js favicon.svg CNAME README.md
git commit -m "Redesign premium do site EDEN"
git push origin main
```

Confirme que o ZIP foi baixado para Downloads. Não extraia dentro de uma subpasta extra. Se a pasta foi movida, altere o caminho dos comandos.

## Preview local

```powershell
cd "$HOME\acme-publicacao\acme-site"
Start-Process .\index.html
```

## Atenção antes de uso comercial

- A página não contém sistema real de dashboard: painéis, números, gráficos e cenários são ilustrações.
- A avaliação de maturidade tem caráter orientativo, não constitui aconselhamento profissional.
- O formulário **não envia os dados**. Ele prepara uma mensagem para cópia. Antes de ativar contatos reais, configure um destino de recebimento (ex.: endpoint seguro, anti-spam e consentimento LGPD) e informe um e-mail oficial da empresa.
- Revise os serviços reais prestados, dados de contato, termos, eventual inscrição profissional/empresa e política de privacidade.
- O domínio customizado depende de DNS no Registro.br. Mantenha `CNAME` com `edenfin.com.br`, e configure HTTPS no GitHub Pages quando possível.
- O site não depende de bibliotecas, serviços externos ou fontes remotas.

Para desabilitar animações, use o sistema operacional com **Reduzir movimento** ativado; o site respeita `prefers-reduced-motion`.

## Novidade da versão 3

Os sete serviços e as respectivas 47 entregas estão descritos em cartões com painéis expansíveis. Os botões de contato selecionam automaticamente o serviço desejado; o formulário continua sendo apenas uma demonstração sem envio.
