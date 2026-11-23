const { Router } = require('express');

const imagesController = require('../controllers/imagesController');
const captionsController = require('../controllers/captionsController');
const validateIdParam = require('../middleware/validateIdParam');
const requireAuth = require('../middleware/requireAuth');
const cacheResponse = require('../middleware/cache');
const { cacheKeys } = require('../config/cache');

const router = Router();
const validateImageId = validateIdParam('id', 'image');

// Express 5 forwards errors thrown by async handlers to errorHandler,
// so the controllers need no try/catch.
router.get('/', cacheResponse(cacheKeys.allImages), imagesController.list);
// Cache after validation: invalid ids never become keys, and the id is already
// a number, so /images/1 and /images/01 cannot create two entries.
router.get(
  '/:id',
  validateImageId,
  cacheResponse((req) => cacheKeys.image(req.params.id)),
  imagesController.show,
);
// requireAuth first: without a session the answer is 401, whatever the id.
router.post('/:id/captions', requireAuth, validateImageId, captionsController.create);

module.exports = router;
