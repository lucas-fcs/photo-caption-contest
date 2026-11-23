'use strict';

const bcrypt = require('bcrypt');
const { SALT_ROUNDS } = require('../../config/auth');

// Public demo account, documented in the README. Not a secret.
const DEMO_USER = {
  username: 'demo',
  email: 'demo@example.com',
  password: 'demo12345',
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  DEMO_USER,

  async up(queryInterface) {
    const now = new Date();
    const passwordHash = await bcrypt.hash(DEMO_USER.password, SALT_ROUNDS);

    await queryInterface.bulkInsert('users', [
      {
        username: DEMO_USER.username,
        email: DEMO_USER.email,
        password_hash: passwordHash,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { username: DEMO_USER.username });
  },
};
