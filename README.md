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
