const fs = require('fs');
const path = require('path');
const db = require('../../src/db/models');

const SEEDERS_DIR = path.join(__dirname, '..', '..', 'src', 'db', 'seeders');

function assertTestDatabase() {
  const { database } = db.sequelize.config;
  if (process.env.NODE_ENV !== 'test' || !database.endsWith('_test')) {
    throw new Error(`Refusing to reset "${database}": not a test database`);
  }
}

// Empties every table and re-applies the seeders by calling their `up()` directly.
// RESTART IDENTITY resets the id sequences, so seeded ids are always 1, 2, 3...
async function resetDatabase() {
  assertTestDatabase();

  await db.sequelize.query('TRUNCATE TABLE captions, images, users RESTART IDENTITY CASCADE');

  const queryInterface = db.sequelize.getQueryInterface();
  const seeders = fs.readdirSync(SEEDERS_DIR).filter((f) => f.endsWith('.js')).sort();
  for (const file of seeders) {
    await require(path.join(SEEDERS_DIR, file)).up(queryInterface, db.Sequelize);
  }
}

async function closeDatabase() {
  await db.sequelize.close();
}

module.exports = { db, resetDatabase, closeDatabase };
