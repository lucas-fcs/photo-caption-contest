# Photo Caption Contest — Especificação

Backend de uma plataforma de concurso de legendas para fotos. O servidor hospeda algumas imagens; qualquer pessoa vê as imagens e suas legendas, e apenas usuários autenticados (sessão) podem criar legendas.

Projeto de portfólio, baseado no enunciado do Codecademy. **Escopo fechado:** o que não está aqui não entra sem decisão explícita.

---

## 1. Stack

| Camada | Escolha |
|---|---|
| Runtime | Node.js LTS, CommonJS |
| Framework | Express |
| Banco | PostgreSQL (local no desenvolvimento, Neon em produção) |
| ORM | Sequelize v6 + sequelize-cli |
| Auth | bcrypt + express-session + connect-session-sequelize |
| Cache | node-cache (em memória) |
| Docs | Swagger UI (`swagger-ui-express`) servindo `docs/openapi.yaml` |
| Testes | Jest + Supertest, banco de teste separado |
| Deploy | Render (web service) + Neon (Postgres) |

## 2. Decisões já tomadas

1. **Acesso não autenticado** a rota protegida → `401` em JSON, sem redirect. O enunciado fala em redirecionar, mas numa API pura o correto é o status code; a escolha é explicada no README.
2. **Banco de produção no Neon**, não no Postgres gratuito do Render (que expira em 30 dias). A API continua no Render.
3. **Testes automatizados entram no escopo**, escritos junto com cada fase.
4. **Imagens** ficam versionadas em `src/public/images/` e são servidas como estáticos. O banco guarda só o `filename`. Sem upload.

## 3. Modelo de dados

Convenção: tabelas e colunas em `snake_case` (`underscored: true`), JSON da API em `camelCase`.

### users
| Coluna | Tipo | Regras |
|---|---|---|
| id | integer PK | autoincrement |
| username | string(30) | único, obrigatório, 3–30 caracteres |
| email | string | único, obrigatório, formato de e-mail |
| password_hash | string | obrigatório — **nunca** sai na resposta da API |
| created_at / updated_at | timestamp | |

### images
| Coluna | Tipo | Regras |
|---|---|---|
| id | integer PK | autoincrement |
| title | string | obrigatório |
| filename | string | único, obrigatório |
| alt_text | string | obrigatório (acessibilidade) |
| description | text | opcional |
| created_at / updated_at | timestamp | |

### captions
| Coluna | Tipo | Regras |
|---|---|---|
| id | integer PK | autoincrement |
| text | string(280) | obrigatório, 1–280 caracteres (após trim) |
| user_id | integer FK → users.id | obrigatório, `ON DELETE CASCADE` |
| image_id | integer FK → images.id | obrigatório, `ON DELETE CASCADE` |
| created_at / updated_at | timestamp | |

**Associações:** `User.hasMany(Caption)`, `Image.hasMany(Caption)`, `Caption.belongsTo(User, { as: 'author' })`, `Caption.belongsTo(Image)`.

**Seeders:** 4–6 imagens (com título, alt text e descrição) e 1 usuário demo (senha documentada no README, hash gerado com bcrypt no seeder).

## 4. Endpoints

Formato padrão de erro: `{ "error": "mensagem legível" }`.

### Saúde
**`GET /health`** → `200 { "status": "ok" }`. Usado em testes e no health check do Render.

### Imagens e legendas

**`GET /images`** — público, em cache
```json
200 [
  { "id": 1, "title": "Pier ao entardecer", "url": "/static/images/pier.jpg", "altText": "..." }
]
```

**`GET /images/:id`** — público, em cache
```json
200 {
  "id": 1, "title": "...", "url": "/static/images/pier.jpg", "altText": "...", "description": "...",
  "captions": [
    { "id": 7, "text": "...", "createdAt": "2026-11-21T14:00:00.000Z",
      "author": { "id": 2, "username": "lucas" } }
  ]
}
```
- `400` se `id` não for inteiro positivo · `404` se a imagem não existir
- Legendas ordenadas da mais recente para a mais antiga

**`POST /images/:id/captions`** — **requer sessão** (a partir da fase 4)
```json
body: { "text": "Minha legenda" }
201 { "id": 8, "text": "Minha legenda", "imageId": 1, "author": { "id": 2, "username": "lucas" }, "createdAt": "..." }
```
- `400` validação · `401` sem sessão · `404` imagem inexistente
- Roda dentro de `sequelize.transaction()`: verifica a imagem e cria a legenda numa única unidade
- Invalida a chave de cache `images:<id>`
- **Provisório na fase 3:** antes de existir auth, o `userId` vem no body (`{ "text", "userId" }`), marcado com `TODO(fase 4)`. Na fase 4 passa a vir de `req.session.userId` e o campo some do body.

**`GET /static/images/:filename`** — arquivos estáticos.

### Autenticação (fase 4)

| Rota | Body | Sucesso | Erros |
|---|---|---|---|
| `POST /auth/register` | `{ username, email, password }` (senha ≥ 8) | `201 { id, username, email }` | `400`, `409` (username/e-mail já existe) |
| `POST /auth/login` | `{ email, password }` | `200 { id, username, email }` + cookie de sessão | `400`, `401` (mensagem genérica: credenciais inválidas) |
| `POST /auth/logout` | — | `204` | `401` |
| `GET /auth/me` | — | `200 { id, username, email }` | `401` |

Middleware `requireAuth`: se não houver `req.session.userId`, responde `401 { "error": "Authentication required" }`.

## 5. Cache (fase 5)

- `node-cache` com TTL de 300 s
- Chaves: `images:all` e `images:<id>`
- Middleware de cache aplicado só nas duas rotas GET de imagens
- `POST` de legenda faz `del('images:<id>')`
- Em testes, o cache é limpo entre os casos (`flushAll`)

## 6. Sessão (fase 4)

- `express-session` com store `connect-session-sequelize` (tabela de sessões no próprio Postgres)
- Cookie: `httpOnly: true`, `sameSite: 'lax'`, `secure: true` em produção, `maxAge` de 1 dia
- `app.set('trust proxy', 1)` em produção (Render fica atrás de proxy)
- `SESSION_SECRET` vem do ambiente

## 7. Estrutura de pastas

```
├── .sequelizerc
├── .env.example
├── jest.config.js
├── README.md
├── docs/
│   ├── openapi.yaml
│   └── photo-caption-contest.postman_collection.json
├── src/
│   ├── app.js            # monta o app e exporta (sem listen) — usado pelos testes
│   ├── server.js         # importa app e chama listen
│   ├── config/           # database.js (lê env), session.js, swagger
│   ├── db/
│   │   ├── models/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/       # requireAuth, cache, errorHandler, notFound
│   └── public/images/
└── tests/
```

`src/config/database.js` define os ambientes `development`, `test` e `production`. Produção usa `DATABASE_URL` com SSL obrigatório.

## 8. Variáveis de ambiente

```
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=
DB_PASSWORD=
DB_NAME=photo_caption_contest_dev
DB_NAME_TEST=photo_caption_contest_test
DATABASE_URL=          # só produção (Neon)
SESSION_SECRET=
```

## 9. Testes

- Banco `photo_caption_contest_test` separado, `NODE_ENV=test`
- Antes da suíte: migrations + seeders no banco de teste; o estado é limpo entre os arquivos de teste
- Testes de integração via Supertest contra `app.js`
- Cada fase só termina com os testes dela passando

## 10. Fases

Cada fase termina com: testes passando, verificação manual no Postman, commit.

| # | Fase | Critério de pronto | Quando |
|---|---|---|---|
| 1 | **Setup** | Express sobe, `GET /health` responde, `.sequelizerc` + `sequelize init`, bancos dev e test criados, Jest rodando com o teste do health | antes de 06/12 |
| 2 | **Dados** | Models, migrations e associações; seeders de imagens e usuário demo; `db:migrate` e `db:seed:all` rodam do zero | antes de 06/12 |
| 3 | **Imagens e legendas** | 3 endpoints da seção 4 (POST com `userId` provisório), estáticos servidos, testes de integração cobrindo sucesso e erros (400/404) | antes de 06/12 |
| 4 | **Auth** | register/login/logout/me, `requireAuth` no POST de legendas, sessão persistida no Postgres, testes cobrindo 401/409 | depois |
| 5 | **Cache** | Middleware com node-cache e invalidação no POST, testes | depois |
| 6 | **Docs** | `openapi.yaml` completo com exemplos, Swagger em `/api-docs`, coleção do Postman exportada | depois |
| 7 | **Deploy** | Banco no Neon, API no Render, migrations/seeds no deploy, README final com link ao vivo | depois |

## 11. Fora do escopo

Frontend, upload de imagens, votação em legendas, edição ou exclusão de legendas, papéis de admin, JWT, Redis, armazenamento em nuvem. Podem virar "próximos passos" no README.
