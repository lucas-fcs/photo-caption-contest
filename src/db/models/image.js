'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Image extends Model {
    static associate(models) {
      Image.hasMany(models.Caption, {
        as: 'captions',
        foreignKey: 'imageId',
        onDelete: 'CASCADE',
      });
    }
  }

  Image.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: { msg: 'Title is required' },
          notEmpty: { msg: 'Title is required' },
        },
      },
      filename: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: { msg: 'Filename already in use' },
        validate: {
          notNull: { msg: 'Filename is required' },
          notEmpty: { msg: 'Filename is required' },
        },
      },
      altText: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: { msg: 'Alt text is required' },
          notEmpty: { msg: 'Alt text is required' },
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Image',
      tableName: 'images',
      underscored: true,
    },
  );

  return Image;
};
