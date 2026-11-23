const { sequelize, Image, Caption, User } = require('../db/models');
const HttpError = require('../utils/httpError');
const { serializeCaption } = require('./serializers');

async function create(req, res) {
  const imageId = req.params.id;
  // requireAuth already guaranteed a session; the author always comes from it,
  // never from the body (a userId sent by the client is ignored).
  const { userId } = req.session;
  const { text } = req.body ?? {};

  // Checked here because the model's trim setter would let a number through,
  // and Postgres would silently store it as text.
  if (typeof text !== 'string') throw new HttpError(400, 'Text must be a string');

  // Managed transaction: if the callback throws, Sequelize rolls everything back;
  // if it returns, Sequelize commits. Every query inside must receive `transaction`,
  // otherwise it runs on another connection, outside this unit of work.
  const caption = await sequelize.transaction(async (transaction) => {
    const image = await Image.findByPk(imageId, { attributes: ['id'], transaction });
    if (!image) throw new HttpError(404, 'Image not found');

    // The account may have been deleted while the session was still alive.
    const user = await User.findByPk(userId, { attributes: ['id'], transaction });
    if (!user) throw new HttpError(401, 'Authentication required');

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
