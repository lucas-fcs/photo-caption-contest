'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Caption, {
        as: 'captions',
        foreignKey: 'userId',
        onDelete: 'CASCADE',
      });
    }

    // Second line of defense: even if a query explicitly loads the hash,
    // serializing the instance (res.json) never exposes it.
    toJSON() {
      const values = { ...this.get() };
      delete values.passwordHash;
      return values;
    }
  }

  User.init(
    {
      username: {
        type: DataTypes.STRING(30),
        allowNull: false,
        // 409 message lives in errorHandler (keyed by constraint name).
        unique: true,
        set(value) {
          this.setDataValue('username', typeof value === 'string' ? value.trim() : value);
        },
        validate: {
          notNull: { msg: 'Username is required' },
          len: { args: [3, 30], msg: 'Username must be 3-30 characters' },
        },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        // Normalized so "Lucas@X.com" and "lucas@x.com" are the same account.
        set(value) {
          this.setDataValue('email', typeof value === 'string' ? value.trim().toLowerCase() : value);
        },
        validate: {
          notNull: { msg: 'Email is required' },
          isEmail: { msg: 'Email must be valid' },
        },
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: { msg: 'Password hash is required' },
        },
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      underscored: true,
      // Every query leaves the hash out by default...
      defaultScope: {
        attributes: { exclude: ['passwordHash'] },
      },
      // ...and login opts in explicitly with User.scope('withPassword').
      // Calling a named scope replaces the default one, so "exclude nothing"
      // brings every column back (an `include` would list password_hash twice).
      scopes: {
        withPassword: {
          attributes: { exclude: [] },
        },
      },
    },
  );

  return User;
};
