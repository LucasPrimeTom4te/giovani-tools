# Guia para IAs — Projeto Giovani Tools

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
git clone https://github.com/LucasPrimeTom4te/giovani-tools.git
cd giovani-tools
```

### 4. Instalar dependências
```
npm install
```

### 5. Criar o arquivo .env
Crie um arquivo chamado `.env` na pasta do projeto com o conteúdo:
```
MONGODB_URI="mongodb+srv://..."
```
(Substituir pela connection string real do MongoDB Atlas — pedir ao responsável do projeto)

### 6. Rodar o projeto
```
npm start
```
Abrir o navegador em: http://localhost:3000

---

## Visão geral do sistema

Servidor Node.js puro (sem Express) com HTML estático em `views/`. Cada ferramenta do sistema é uma página HTML própria servida pelo servidor.

---

## Banco de dados — MongoDB (OBRIGATÓRIO)

**Todo dado persistido no sistema DEVE usar o MongoDB via `storage.js`.** Nunca use arquivos locais (`fs.writeFile`, `data.json`) para guardar dados do usuário — em produção no Vercel o sistema de arquivos é somente leitura e qualquer dado gravado assim seria perdido.

O `storage.js` expõe uma interface simples de chave-valor que salva no MongoDB Atlas:

```js
const storage = require('./storage');

// Ler um valor
const valor = await storage.getItem('minha-chave');  // retorna null se não existir

// Salvar um valor (qualquer tipo: string, número, objeto, array)
await storage.setItem('minha-chave', { foo: 'bar' });

// Remover um valor
await storage.removeItem('minha-chave');
```

> Todos os métodos são `async` — sempre use `await`.

A conexão com o MongoDB é feita automaticamente a partir da variável de ambiente `MONGODB_URI` definida no `.env` (local) e nas variáveis de ambiente do Vercel (produção). Você não precisa se preocupar com a conexão — o `storage.js` gerencia isso.

**Ao criar novos endpoints de API** que precisam persistir dados, sempre use `storage.getItem` / `storage.setItem`. Nunca escreva em arquivos.

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
storage.js         # camada de persistência — MongoDB (usar sempre)
views/             # páginas HTML de cada ferramenta
public/
  css/style.css    # estilos globais do sistema
  js/              # scripts estáticos compartilhados
.env               # variáveis de ambiente (gitignored — nunca commitar)
package.json       # dependências do projeto
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
  <aside class="sidebar">
    <div class="sidebar-header">Ferramentas</div>
    <nav class="sidebar-nav">
      <a href="/">Início</a>
      <a href="/notepad">Bloco de Notas</a>
      <a href="/nomeferramenta" class="active">Nome da Ferramenta</a>
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

**Atenção:** adicionar a nova rota na sidebar de TODAS as outras views também (index.html, notepad.html, config.html).

### 2. Registrar a rota em server.js

Adicione a nova rota no objeto `routes`:

```js
const routes = {
  '/': 'index.html',
  '/config': 'config.html',
  '/notepad': 'notepad.html',
  '/nomeferramenta': 'nomeferramenta.html',  // ← adicionar aqui
};
```

### 3. Adicionar card no dashboard (views/index.html)

Dentro de `<div class="tools-grid">`, adicione:

```html
<a href="/nomeferramenta" class="tool-card">
  <div class="tool-icon tool-icon--blue">🔧</div>
  <div>
    <div class="tool-name">Nome da Ferramenta</div>
    <div class="tool-desc">Descrição curta do que a ferramenta faz.</div>
  </div>
  <span class="tool-badge tool-badge--available">Disponível</span>
</a>
```

### 4. Tratar chaves de API e segredos

Se a ferramenta usa uma chave de API:

- **Nunca** deixar a chave hardcoded no HTML.
- Adicionar ao `.env`: `NOME_API_KEY=valor`
- Adicionar também nas variáveis de ambiente do Vercel (painel do projeto)
- Expor via endpoint no `server.js` dentro do bloco `/api/config GET`:

```js
res.end(JSON.stringify({
  novaApiKey: process.env.NOVA_API_KEY || '',  // ← adicionar aqui
}));
```

- No HTML da ferramenta, buscar a chave via:

```js
let apiKey = '';
fetch('/api/config').then(r => r.json()).then(cfg => { apiKey = cfg.novaApiKey || ''; });
```

### 5. Verificar .gitignore

Confirmar que `.env` está no `.gitignore`. Nunca commitar segredos ou a connection string do MongoDB.

---

## Padrões de estilo

- CSS global em `public/css/style.css` — usar as classes existentes antes de criar novas.
- Classes principais: `.card`, `.card-header`, `.card-body`, `.sidebar`, `.dashboard-content`, `.heading`, `.form-group`, `.form-input`, `.btn`.
- Estilos específicos de uma ferramenta ficam em `<style>` dentro do próprio HTML da view.

---

## Sistema de autenticação — OBRIGATÓRIO

O sistema possui autenticação baseada em sessão (cookie `HttpOnly`). **Toda nova funcionalidade deve respeitar essas regras:**

### Usuários
- **Usuário master**: definido pelas variáveis de ambiente `MASTER_USER` e `MASTER_PASS`. Nunca é armazenado no banco — sempre validado pelo ENV.
- **Usuários comuns**: armazenados no MongoDB via `storage.getItem('auth-users')` (array de objetos com `id`, `username`, `passwordHash`, `createdAt`).
- Senhas nunca são salvas em texto puro — sempre use `auth.hashPassword(senha)` de `auth.js`.

### Proteger novas rotas de página (HTML)
Toda rota nova é automaticamente protegida pelo middleware de auth em `server.js`. **Não é necessário nenhum código extra** — o handler já redireciona para `/login` se não houver sessão válida.

Se a rota for exclusiva do master, adicione a verificação explícita:
```js
if (urlPath === '/minha-rota') {
  if (!session.isMaster) { redirect(res, '/'); return; }
}
```

### Proteger novos endpoints de API
Todos os endpoints `/api/*` já exigem sessão válida (o middleware retorna 401 se não autenticado). Para endpoints restritos ao master, adicione:
```js
if (!session.isMaster) { json(res, 403, { error: 'Acesso negado' }); return; }
```

### Sidebar das views
Toda nova view deve incluir o bloco de sidebar com o link de Usuários (oculto por padrão, exibido só para o master) e o botão de logout:
```html
<nav class="sidebar-nav">
  <a href="/">Início</a>
  <!-- outros links -->
  <span class="sidebar-section">Sistema</span>
  <a href="/users" id="navUsers" style="display:none">Usuários</a>
  <a href="/config">Configurações</a>
</nav>
<div style="padding:1rem;margin-top:auto;border-top:1px solid #eee;">
  <div id="sidebarUser" style="font-size:0.8rem;color:#666;margin-bottom:0.5rem;"></div>
  <button onclick="fetch('/api/auth/logout',{method:'POST'}).then(()=>location.href='/login')" style="font-size:0.8rem;background:none;border:none;color:#999;cursor:pointer;padding:0;font-family:inherit;">Sair</button>
</div>
```
E no `<script>` da página:
```js
fetch('/api/auth/me').then(r=>r.json()).then(me=>{
  document.getElementById('sidebarUser').textContent = me.username || '';
  if (me.isMaster) document.getElementById('navUsers').style.display = '';
});
```

### Variáveis de ambiente necessárias
```
MASTER_USER=giovanni       # usuário do master
MASTER_PASS=...            # senha do master
PASSWORD_SALT=...          # salt para hash de senhas (nunca alterar após produção)
```

---

## Padrões de backend

- Novos endpoints API seguem o padrão `if (urlPath === '/api/rota' && method === 'GET') { ... }` em `server.js`. **Usar `urlPath` (sem query string), não `url`.**
- Para persistir dados, **sempre** usar `await storage.getItem('chave')` e `await storage.setItem('chave', valor)`.
- Não usar `npm install` sem necessidade — o servidor não usa Express nem frameworks externos (exceto `mongodb`, já instalado).

---

## Checklist ao integrar uma nova ferramenta

- [ ] Arquivo criado em `views/nomeferramenta.html` com sidebar e layout do sistema
- [ ] Rota adicionada em `server.js` no objeto `routes`
- [ ] Card adicionado em `views/index.html` no dashboard
- [ ] Link adicionado na sidebar de **todas** as outras views
- [ ] Chaves de API movidas para `.env` e expostas via `/api/config`
- [ ] Dados persistidos via `storage.js` (MongoDB) — nunca em arquivos locais
- [ ] `.env` está no `.gitignore`
- [ ] Servidor reiniciado e rota testada
