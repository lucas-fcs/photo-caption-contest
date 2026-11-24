# Photo Caption Contest

Backend for a photo caption contest. The server hosts a few images; anyone can browse the images and their captions, and only authenticated users can add captions.

**Live API:** https://LIVE-URL-PENDING · **Interactive docs:** https://LIVE-URL-PENDING/api-docs

> Hosted on Render's free plan, which puts the service to sleep after 15 minutes without traffic. The first request after that takes 30 to 60 seconds; the following ones are fast.

Based on the Codecademy "Photo Caption Contest" portfolio project.

## Features

- Public listing of images, and image detail with its captions (newest first)
- Account registration and session-based login, with sessions stored in PostgreSQL
- Caption creation for logged-in users, inside a database transaction
- In-memory cache for the image endpoints, invalidated when a caption is added
- OpenAPI 3 documentation with Swagger UI, plus a Postman collection with tests
- 100+ integration tests (Jest + Supertest) against a dedicated test database

## Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 24, CommonJS |
| Framework | Express 5 |
| Database | PostgreSQL (local in development, [Neon](https://neon.tech) in production) |
| ORM | Sequelize 6 + sequelize-cli (migrations and seeders) |
| Auth | bcrypt, express-session, connect-session-sequelize |
| Cache | node-cache |
| Docs | OpenAPI 3.0, swagger-ui-express |
| Tests | Jest, Supertest |
| Hosting | [Render](https://render.com) (web service) + Neon (database) |

## API overview

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | Health check |
| GET | `/images` | — | List images (cached) |
| GET | `/images/:id` | — | Image with its captions (cached) |
| POST | `/images/:id/captions` | Session | Add a caption |
| POST | `/auth/register` | — | Create an account |
| POST | `/auth/login` | — | Log in (sets the `pcc.sid` cookie) |
| POST | `/auth/logout` | Session | Log out |
| GET | `/auth/me` | Session | Current user |
| GET | `/static/images/:filename` | — | Image files |

Errors always have the shape `{ "error": "message" }`. The full contract, with examples, is in [`docs/openapi.yaml`](docs/openapi.yaml) and on `/api-docs`.

## Design decisions

- **`401` instead of a redirect.** The original brief asks to redirect unauthenticated users. This is a pure JSON API with no login page to redirect to, so protected routes answer `401 { "error": "Authentication required" }`, which any client can handle.
- **Database on Neon, not on Render.** Render's free PostgreSQL expires after 30 days. Neon's free plan does not, so the API runs on Render and the data lives on Neon.
- **Sessions in PostgreSQL.** The session table is created by a migration, like the rest of the schema. Sessions survive restarts and deploys, which an in-memory store would not.
- **Login hardening.** The session id is regenerated on login (prevents session fixation). A wrong email takes as long as a wrong password, because the password is still compared against a dummy hash, so response time does not reveal who is registered. Passwords are limited to 72 bytes, the most bcrypt actually uses.
- **Transaction on caption creation.** Checking the image and inserting the caption run as one unit of work.
- **Cache invalidated after the commit.** Invalidating inside the transaction would let a concurrent request re-cache the old data before the new caption is visible. Only `200` responses are cached, and an `X-Cache: HIT|MISS` header makes the behavior visible.
- **Duplicates detected by the database.** `409` comes from the `UNIQUE` constraints, mapped by constraint name. Checking with a `SELECT` first would race with a concurrent insert, and Sequelize's own parsing of the error only works when PostgreSQL answers in English.
- **Migrations run in the build.** Render's free plan has no pre-deploy step. A failing migration fails the build, so the previous version keeps serving.

## Project structure

```
├── render.yaml            # Render Blueprint (deploy as code)
├── docs/
│   ├── openapi.yaml
│   └── photo-caption-contest.postman_collection.json
├── src/
│   ├── app.js             # builds the Express app (no listen), used by the tests
│   ├── server.js          # starts the HTTP server
│   ├── config/            # env, database, session, cache, auth, swagger
│   ├── db/                # models, migrations, seeders
│   ├── routes/            # routers + index.js with every mount path
│   ├── controllers/       # thin handlers + JSON serializers
│   ├── middleware/        # requireAuth, cache, validateIdParam, notFound, errorHandler
│   └── public/images/     # image files served under /static
└── tests/                 # integration tests and helpers
```

## Local setup

Requirements: Node.js 24 and a local PostgreSQL server.

```bash
npm install
cp .env.example .env   # fill in DB_USER, DB_PASSWORD and SESSION_SECRET
npx sequelize-cli db:create
NODE_ENV=test npx sequelize-cli db:create
npm run db:migrate
npm run db:seed
npm run dev
```

Generate a `SESSION_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

On Windows PowerShell, create the test database with:

```powershell
$env:NODE_ENV='test'; npx sequelize-cli db:create; Remove-Item Env:NODE_ENV
```

The API runs on `http://localhost:3000`. Check it with `GET /health`.

### Resetting the database

Executed seeders are tracked, so undo them **before** undoing the migrations:

```bash
npx sequelize-cli db:seed:undo:all
npx sequelize-cli db:migrate:undo:all
npm run db:migrate
npm run db:seed
```

## Demo account

The seeders create a public demo user:

| Field | Value |
|---|---|
| Username | `demo` |
| Email | `demo@example.com` |
| Password | `demo12345` |

## Tests

```bash
npm test
```

Tests run against the separate `photo_caption_contest_test` database. The schema is rebuilt from the migrations once per run, the data is reset with the seeders before each test file, and the cache is flushed before each test. The reset helper refuses to run against any database whose name does not end in `_test`.

## API documentation

- **Swagger UI:** `/api-docs`, generated from [`docs/openapi.yaml`](docs/openapi.yaml). "Try it out" works with the session: call `POST /auth/login` on the page and the browser sends the cookie on the next calls.
- **Postman:** import [`docs/photo-caption-contest.postman_collection.json`](docs/photo-caption-contest.postman_collection.json) and run it with the Collection Runner. Every request has tests, and the folders run in order (login before captions). Change the `baseUrl` variable to target another environment. A run creates a new user and a few captions.

A test (`tests/docs.test.js`) fails if a route exists in Express but is missing from `openapi.yaml`, or the other way around.

## Deployment

The web service is described in [`render.yaml`](render.yaml).

1. **Neon:** create a project in the AWS `us-east-1` region and copy the **direct** (not pooled) connection string.
2. **Render:** New → Blueprint, select this repository, and paste the connection string into `DATABASE_URL`. `SESSION_SECRET` is generated by Render.
3. Every push to `main` deploys: `npm ci`, migrations, seeds, then `npm start`. Render checks `/health` before switching traffic.

## Images

The images in `src/public/images/` are generated placeholders. They can be replaced with real photos that keep the same filenames.

## Next steps

Out of the current scope, in rough order of value:

- Rate limiting on `POST /auth/login` to slow down password guessing
- Log the user in right after registration
- Shared cache (Redis) if the API ever runs on more than one instance
- Caption voting, editing and deletion
- Real photos instead of the placeholders
- Lower bcrypt cost in the test environment to speed up the suite
- A dedicated PostgreSQL role for the app, with access to its databases only

## License

ISC
