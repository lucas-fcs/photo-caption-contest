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
        unique: { msg: 'Username already taken' },
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
        unique: { msg: 'Email already registered' },
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
      // ...and login (phase 4) opts in explicitly with User.scope('withPassword').
      scopes: {
        withPassword: {
          attributes: { include: ['passwordHash'] },
        },
      },
    },
  );

  return User;
};
