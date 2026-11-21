const { Router } = require('express');

const imagesController = require('../controllers/imagesController');
const captionsController = require('../controllers/captionsController');
const validateIdParam = require('../middleware/validateIdParam');

const router = Router();
const validateImageId = validateIdParam('id', 'image');

// Express 5 forwards errors thrown by async handlers to errorHandler,
// so the controllers need no try/catch.
router.get('/', imagesController.list);
router.get('/:id', validateImageId, imagesController.show);
router.post('/:id/captions', validateImageId, captionsController.create);

module.exports = router;
