# CLAUDE.md — Photo Caption Contest

## Contexto
Projeto de portfólio do Lucas (backend Node/Express). A especificação completa está em `SPEC.md`: ela é a fonte da verdade sobre escopo, modelo de dados, endpoints e fases. Se algo pedido conflitar com a SPEC, aponte o conflito antes de implementar.

Lucas está aprendendo com este projeto. Ao implementar, explique de forma breve as decisões que não forem óbvias, como associações do Sequelize, transação e sessão. Não precisa explicar o trivial.

## Idioma
- Converse em português.
- Código, nomes de arquivos, commits, `openapi.yaml` e README em inglês.

## Como trabalhar
- Trabalhe **uma fase por vez**, na ordem da SPEC (seção 10). Não adiante funcionalidades de fases futuras.
- No começo de cada fase, apresente um plano curto (arquivos que vai criar ou alterar) e espere o ok.
- No fim de cada fase:
  1. rode os testes e mostre o resultado;
  2. liste o que testar manualmente no Postman (método, URL, body, resposta esperada);
  3. sugira uma mensagem de commit (Conventional Commits) — **não faça commit nem push sem pedido**.
- Não adicione dependências fora das listadas na SPEC sem perguntar.
- Escopo fechado: ideias extras vão para uma lista de "próximos passos", não para o código.

## Convenções de código
- CommonJS (`require`/`module.exports`) — compatível com sequelize-cli.
- Banco em `snake_case` (`underscored: true`), JSON da API em `camelCase`.
- Controllers finos; erros vão para o middleware `errorHandler` central.
- Formato de erro: `{ "error": "mensagem" }`, com status codes corretos (400, 401, 404, 409, 500).
- Nunca retornar `password_hash`. Nunca logar senhas nem segredos.
- `src/app.js` exporta o app sem `listen`; `src/server.js` sobe o servidor.
- Configuração sensível só via variáveis de ambiente; manter `.env.example` atualizado e `.env` fora do Git.

## Comandos (ajuste quando os scripts existirem)
- `npm run dev` — servidor com nodemon
- `npm test` — Jest (`NODE_ENV=test`, banco de teste)
- `npx sequelize-cli db:migrate` / `db:migrate:undo:all`
- `npx sequelize-cli db:seed:all` / `db:seed:undo:all`

## Testes
- Jest + Supertest contra `src/app.js`, banco `photo_caption_contest_test`.
- Toda rota nova vem com testes do caminho feliz e dos erros previstos na SPEC.
- Uma fase só está pronta com todos os testes passando.
