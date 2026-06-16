# Guia para IAs — Projeto Thiago Tools

## Perfil do usuário — LEIA PRIMEIRO

**Os usuários deste projeto são leigos em tecnologia.** Isso muda como você deve se comunicar e agir:

- Nunca assuma que o usuário sabe o que é terminal, Git, Node, npm, variável de ambiente ou qualquer termo técnico.
- Sempre explique o que vai fazer antes de fazer, em português simples.
- Se uma etapa exige uma ação do usuário (instalar algo, clicar em algum lugar, abrir um programa), dê instruções passo a passo, com prints mentais ou descrições visuais.
- Prefira fazer você mesmo do que pedir para o usuário fazer manualmente.
- Se algo der errado, explique a causa em linguagem simples e corrija sem jargão.
- Quando terminar uma tarefa, diga o que foi feito em 1-2 frases simples, sem termos técnicos.

---

## Como responder aos pedidos comuns de um leigo

### "Quero adicionar uma ferramenta nova"
O usuário vai arrastar ou mencionar um arquivo HTML. Você deve:
1. Analisar o arquivo e explicar em português o que ele faz.
2. Integrar ao sistema seguindo o checklist da seção "Como integrar".
3. Iniciar o servidor e confirmar que funciona.
4. Dizer algo como: "Pronto! A ferramenta [nome] já aparece no menu e no dashboard."

### "Salva / envia / manda pro GitHub"
Fazer commit e push. Explicar brevemente: "Salvei todas as alterações e enviei para o repositório no GitHub."

### "Tá quebrado / tá feio / não tá funcionando"
Não pedir descrição técnica — abrir o preview, tirar screenshot, identificar o problema e corrigir.

### "Como faço pra rodar isso no meu computador?"
Ver seção de configuração do ambiente abaixo.

---

## Configuração do ambiente (Windows — usuário do zero)

Se o usuário precisar rodar o projeto localmente pela primeira vez, guie nesta ordem:

### 1. Instalar o Git
- Acesse: https://git-scm.com/download/win
- Clique em "Click here to download" (versão mais recente)
- Execute o instalador e clique em "Next" em tudo — as opções padrão estão corretas
- Ao terminar, abra o menu Iniciar, procure "Git Bash" e abra

### 2. Instalar o Node.js
- Acesse: https://nodejs.org
- Baixe a versão "LTS" (botão verde maior)
- Execute o instalador e clique em "Next" em tudo
- Para verificar: abra o "Prompt de Comando" (Win+R → digite `cmd` → Enter) e digite `node -v`. Deve aparecer algo como `v20.x.x`

### 3. Clonar o projeto
No Git Bash ou Prompt de Comando:
```
git clone https://github.com/LucasPrimeTom4te/thiago-tools.git
cd thiago-tools
```

### 4. Instalar dependências
```
npm install
```

### 5. Criar o arquivo .env
Crie um arquivo chamado `.env` na pasta do projeto com o conteúdo:
```
GROQ_API_KEY=sua_chave_aqui
```
(Substituir `sua_chave_aqui` pela chave real — ver tutorial em `/tutorial-ncm`)

### 6. Rodar o projeto
```
npm start
```
Abrir o navegador em: http://localhost:3000

---

## Visão geral do sistema

Servidor Node.js puro (sem Express) com HTML estático em `views/`. Cada ferramenta do sistema é uma página HTML própria servida pelo servidor. O dashboard (`/`) exibe todas as ferramentas em cards com iframes.

---

## Comandos

```
npm start          # inicia o servidor na porta 3000
npm test           # roda os testes
```

---

## Estrutura de arquivos

```
server.js          # roteador e lógica do servidor
storage.js         # camada de persistência (data.json)
views/             # páginas HTML de cada ferramenta
public/
  css/style.css    # estilos globais do sistema
  js/              # scripts estáticos compartilhados
data.json          # dados persistidos (gitignored)
.env               # variáveis de ambiente (gitignored)
.claude/
  launch.json      # configuração do preview no Claude Code
```

---

## Como integrar um novo arquivo HTML ao sistema

Ao receber um arquivo HTML standalone (ex: uma ferramenta que usa uma API externa), siga estes passos em ordem:

### 1. Criar a view integrada

Coloque o arquivo em `views/nomeferramenta.html`. A página deve usar o layout padrão do sistema:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Nome da Ferramenta</title>
  <link rel="stylesheet" href="/css/style.css">
  <!-- estilos específicos da ferramenta aqui -->
</head>
<body class="dashboard">
<script>if(window.self!==window.top)document.body.classList.add('in-iframe');</script>
  <aside class="sidebar">
    <div class="sidebar-header">Meu Sistema</div>
    <nav class="sidebar-nav">
      <a href="/">Início</a>
      <a href="/ncm">Identificar NCM</a>
      <a href="/lpco">Leitura de Documentos LPCO</a>
      <a href="/nomeferramenta" class="active">Nome da Ferramenta</a>
      <span class="sidebar-section">Ajuda</span>
      <details class="sidebar-submenu">
        <summary>Tutoriais</summary>
        <a href="/tutorial-ncm">Como usar o NCM</a>
      </details>
      <span class="sidebar-section">Sistema</span>
      <a href="/config">Configurações</a>
    </nav>
  </aside>
  <main class="dashboard-content">
    <!-- conteúdo da ferramenta aqui -->
  </main>
</body>
</html>
```

**Atenção:** adicionar a nova rota na sidebar de TODAS as outras views também (index.html, ncm.html, lpco.html, config.html, tutorial-ncm.html).

O snippet `<script>if(window.self!==window.top)...</script>` logo após `<body>` é obrigatório — ele esconde a sidebar quando a página está embutida no dashboard como iframe.

### 2. Registrar a rota em server.js

Adicione a nova rota no objeto `routes`:

```js
const routes = {
  '/': 'index.html',
  '/ncm': 'ncm.html',
  '/lpco': 'lpco.html',
  '/config': 'config.html',
  '/tutorial-ncm': 'tutorial-ncm.html',
  '/nomeferramenta': 'nomeferramenta.html',  // ← adicionar aqui
};
```

### 3. Adicionar card no dashboard (views/index.html)

Dentro de `<div class="dashboard-grid">`, adicione:

```html
<div class="card" data-card="nomeferramenta" data-colspan="1">
  <div class="card-header">Nome da Ferramenta</div>
  <div class="card-body">
    <iframe src="/nomeferramenta" loading="lazy"></iframe>
    <div class="resize-handle" title="Arrastar para redimensionar"></div>
  </div>
</div>
```

### 4. Tratar chaves de API e segredos

Se a ferramenta usa uma chave de API:

- **Nunca** deixar a chave hardcoded no HTML.
- Adicionar ao `.env`: `NOME_API_KEY=valor`
- Expor via endpoint no `server.js` dentro do bloco `/api/config GET`:

```js
res.end(JSON.stringify({
  groqApiKey: process.env.GROQ_API_KEY || '',
  novaApiKey: process.env.NOVA_API_KEY || '',  // ← adicionar aqui
}));
```

- No HTML da ferramenta, buscar a chave via:

```js
let apiKey = '';
fetch('/api/config').then(r => r.json()).then(cfg => { apiKey = cfg.novaApiKey || ''; });
```

### 5. Verificar .gitignore

Confirmar que `.env` e `data.json` estão no `.gitignore`. Nunca commitar segredos.

---

## Padrões de estilo

- CSS global em `public/css/style.css` — usar as classes existentes antes de criar novas.
- Classes principais: `.card`, `.card-header`, `.card-body`, `.sidebar`, `.dashboard-content`, `.heading`, `.form-group`, `.form-input`, `.btn`.
- Estilos específicos de uma ferramenta ficam em `<style>` dentro do próprio HTML da view.
- Variáveis CSS do sistema: `--txt`, `--txt2`, `--txt3`, `--border`, `--border2`, `--surface`, `--bg`.
- Para ferramentas com design próprio (ex: NCM), usar variáveis locais e `@media (prefers-color-scheme: dark)` para suporte a tema escuro.

---

## Padrões de backend

- Novos endpoints API seguem o padrão `if (url === '/api/rota' && method === 'GET') { ... }` em `server.js`.
- Para persistir dados, usar `storage.getItem('chave')` e `storage.setItem('chave', valor)`.
- Não usar `npm install` sem necessidade — o servidor não usa Express nem frameworks externos.

---

## Checklist ao integrar uma nova ferramenta

- [ ] Arquivo criado em `views/nomeferramenta.html` com sidebar e layout do sistema
- [ ] Script de detecção de iframe adicionado logo após `<body>`
- [ ] Rota adicionada em `server.js` no objeto `routes`
- [ ] Card adicionado em `views/index.html` no dashboard
- [ ] Link adicionado na sidebar de **todas** as outras views
- [ ] Chaves de API movidas para `.env` e expostas via `/api/config`
- [ ] `.env` está no `.gitignore`
- [ ] Servidor reiniciado e rota testada
- [ ] Screenshot do preview tirada para confirmar que o layout está correto
