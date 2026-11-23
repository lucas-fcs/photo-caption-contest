'use strict';

// Storage for express-session (via connect-session-sequelize).
// Created here instead of store.sync() so the whole schema lives in migrations.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sessions', {
      sid: {
        type: Sequelize.STRING(36),
        primaryKey: true,
        allowNull: false,
      },
      expires: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      data: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // The store periodically deletes rows WHERE expires < now.
    await queryInterface.addIndex('sessions', ['expires']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sessions');
  },
};
