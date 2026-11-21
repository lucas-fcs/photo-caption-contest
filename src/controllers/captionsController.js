const { sequelize, Image, Caption, User } = require('../db/models');
const HttpError = require('../utils/httpError');
const { MAX_INTEGER_ID } = require('../middleware/validateIdParam');
const { serializeCaption } = require('./serializers');

const isValidId = (value) => Number.isInteger(value) && value >= 1 && value <= MAX_INTEGER_ID;

async function create(req, res) {
  const imageId = req.params.id;
  // TODO(fase 4): take the author from req.session.userId and drop userId from the body.
  const { text, userId } = req.body ?? {};

  // Checked here because the model's trim setter would let a number through,
  // and Postgres would silently store it as text.
  if (typeof text !== 'string') throw new HttpError(400, 'Text must be a string');
  if (!isValidId(userId)) throw new HttpError(400, 'Invalid userId');

  // Managed transaction: if the callback throws, Sequelize rolls everything back;
  // if it returns, Sequelize commits. Every query inside must receive `transaction`,
  // otherwise it runs on another connection, outside this unit of work.
  const caption = await sequelize.transaction(async (transaction) => {
    const image = await Image.findByPk(imageId, { attributes: ['id'], transaction });
    if (!image) throw new HttpError(404, 'Image not found');

    const user = await User.findByPk(userId, { attributes: ['id'], transaction });
    if (!user) throw new HttpError(400, 'Invalid userId');

    const created = await Caption.create({ text, userId, imageId }, { transaction });

    return Caption.findByPk(created.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'username'] }],
      transaction,
    });
  });

  // TODO(fase 5): invalidate the cache key `images:<imageId>`.

  res.status(201).json(serializeCaption(caption, { withImageId: true }));
}

module.exports = { create };
