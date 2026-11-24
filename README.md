# Photo Caption Contest

Backend for a photo caption contest. The server hosts a few images; anyone can see the images and their captions, and only authenticated users can add captions.

> Work in progress. This README will be completed in the final phase.

## Stack

Node.js, Express, PostgreSQL, Sequelize (with sequelize-cli), Jest and Supertest.

## Local setup

Requirements: Node.js 21.7 or newer and a local PostgreSQL server.

```bash
npm install
cp .env.example .env   # then fill in DB_USER and DB_PASSWORD
npx sequelize-cli db:create
NODE_ENV=test npx sequelize-cli db:create
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
npm run dev
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
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```

## API documentation

- **Swagger UI:** `http://localhost:3000/api-docs`, generated from [`docs/openapi.yaml`](docs/openapi.yaml). "Try it out" works with the session: call `POST /auth/login` on the page and the browser sends the cookie on the next calls.
- **Postman:** import [`docs/photo-caption-contest.postman_collection.json`](docs/photo-caption-contest.postman_collection.json) and run it with the Collection Runner. Every request has tests, and the folders run in order (login before captions). Change the `baseUrl` variable to target another environment. A run creates a new user and a few captions.

A test (`tests/docs.test.js`) fails if a route exists in Express but is missing from `openapi.yaml`, or the other way around.

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

Tests run against the separate `photo_caption_contest_test` database. The schema is rebuilt from the migrations once per run, and the data is reset with the seeders before each test file.

## Images

The images in `src/public/images/` are generated placeholders. They can be replaced with real photos that keep the same filenames.
