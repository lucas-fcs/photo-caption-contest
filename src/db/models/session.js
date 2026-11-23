'use strict';

const { Model } = require('sequelize');

// Used only by connect-session-sequelize (see src/config/session.js).
// Same fields as the store's default model, mapped to our own "sessions" table.
module.exports = (sequelize, DataTypes) => {
  class Session extends Model {}

  Session.init(
    {
      sid: {
        type: DataTypes.STRING(36),
        primaryKey: true,
      },
      expires: DataTypes.DATE,
      data: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: 'Session',
      tableName: 'sessions',
      underscored: true,
    },
  );

  return Session;
};
