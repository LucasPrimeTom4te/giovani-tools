# Cadastro de Pessoas

Um programinha que faz cadastro de nome, email e idade.

## O que esse programa faz?

Você abre uma página no navegador, preenche um formulário com nome, email e idade, clica em salvar, e os dados aparecem em uma tabela. Tudo fica salvo no próprio computador.

## Como ligar o programa

Você está usando o **Claude no modo "code"**. Peça para ele executar os passos abaixo.

> **Passo 1** — Peça para o Claude:
> > "Rode npm start"
>
> O Claude vai rodar um comando e mostrar um endereço como `http://localhost:3000`.

> **Passo 2** — Clique no link `http://localhost:3000` que aparecer na resposta do Claude.
> O programa vai abrir no seu navegador.

> **Passo 3** — Pronto! Use o menu para navegar:
> - **Início** — página principal
> - **Formulário** — cadastrar uma pessoa
> - **Tabela** — ver a lista de pessoas cadastradas

## Como desligar o programa

Peça para o Claude:
> "Pare o servidor"

Ou aperte `Ctrl + C` no terminal.

## Como salvar as alterações no Git

Quando você ou o Claude fizerem alterações nos arquivos, use estes prompts:

**Salvar tudo de uma vez:**
> "Claude, faça um commit com a mensagem: 'descrição do que foi feito' e envie para o GitHub"

O Claude vai executar:
1. `git add .` — prepara os arquivos
2. `git commit -m "mensagem"` — salva a versão
3. `git push` — envia para o GitHub

**Se você quer só ver o que mudou:**
> "Claude, me mostre o que foi alterado"

## Como publicar na internet (Vercel)

> **Antes de publicar, certifique-se de que o Git está salvo (passo anterior).**

Peça para o Claude:
> "Claude, faça o deploy do projeto no Vercel"

O Claude vai:
1. Pedir para você fazer login na Vercel (se não tiver conta, crie em vercel.com)
2. Rodar `npx vercel` no terminal
3. Seguir o passo a passo com você

**Depois do deploy:** o Claude vai mostrar o link do seu site publicado (ex: `https://seu-projeto.vercel.app`).

## Personalizando o projeto

Peça para o Claude fazer alterações:

| O que você quer | O que pedir para o Claude |
|---|---|
| Mudar cores / visual | "Claude, mude as cores do site para um tema mais claro/escuro" |
| Adicionar campo | "Claude, adicione um campo de telefone no formulário e na tabela" |
| Mudar título | "Claude, troque o título 'Sistema de Registros' para 'Meu Cadastro'" |
| Adicionar página | "Claude, crie uma nova página de ajuda e adicione no menu" |

## Arquivos do projeto (para referência)

- `server.js` — o programa principal (como tudo funciona)
- `views/` — as páginas que aparecem no navegador
- `public/css/style.css` — as cores e estilos visuais
- `storage.js` — onde os dados são guardados
