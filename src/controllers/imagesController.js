const { Image, Caption, User } = require('../db/models');
const HttpError = require('../utils/httpError');
const { serializeImageSummary, serializeImageDetail } = require('./serializers');

async function list(req, res) {
  const images = await Image.findAll({
    attributes: ['id', 'title', 'filename', 'altText'],
    order: [['id', 'ASC']],
  });

  res.json(images.map(serializeImageSummary));
}

async function show(req, res) {
  const captionsAssoc = { model: Caption, as: 'captions' };

  // One query with two nested JOINs: image -> captions -> author.
  // The order on the included model uses the association, not the column name alone.
  const image = await Image.findByPk(req.params.id, {
    include: [
      {
        ...captionsAssoc,
        include: [{ model: User, as: 'author', attributes: ['id', 'username'] }],
      },
    ],
    order: [
      [captionsAssoc, 'createdAt', 'DESC'],
      // Tie-breaker: captions created in the same millisecond keep a stable order.
      [captionsAssoc, 'id', 'DESC'],
    ],
  });

  if (!image) throw new HttpError(404, 'Image not found');

  res.json(serializeImageDetail(image));
}

module.exports = { list, show };
