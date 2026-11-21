// Runs once before the whole Jest run: rebuilds the test database schema
// from the migrations, so tests always see the current schema.
// Data is reset per test file by tests/helpers/db.js.
const { execSync } = require('child_process');

module.exports = async () => {
  const env = { ...process.env, NODE_ENV: 'test' };
  const run = (cmd) => execSync(`npx sequelize-cli ${cmd}`, { env, stdio: 'pipe' });

  run('db:migrate:undo:all');
  run('db:migrate');
};
