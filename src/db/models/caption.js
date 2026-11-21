'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Caption extends Model {
    static associate(models) {
      // With an alias, Sequelize would infer the FK as "authorId".
      // The column is user_id, so the foreignKey must be explicit.
      Caption.belongsTo(models.User, { as: 'author', foreignKey: 'userId' });
      Caption.belongsTo(models.Image, { as: 'image', foreignKey: 'imageId' });
    }
  }

  Caption.init(
    {
      text: {
        type: DataTypes.STRING(280),
        allowNull: false,
        // Trim runs in the setter, before validation, so "   " fails the length check.
        set(value) {
          this.setDataValue('text', typeof value === 'string' ? value.trim() : value);
        },
        validate: {
          notNull: { msg: 'Text is required' },
          len: { args: [1, 280], msg: 'Text must be 1-280 characters' },
        },
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { notNull: { msg: 'User is required' } },
      },
      imageId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { notNull: { msg: 'Image is required' } },
      },
    },
    {
      sequelize,
      modelName: 'Caption',
      tableName: 'captions',
      underscored: true,
    },
  );

  return Caption;
};
