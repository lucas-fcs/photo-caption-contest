const NodeCache = require('node-cache');

// One in-memory cache for the whole process (Node's require cache makes this
// module a singleton). Lives and dies with the process: a restart empties it,
// and each instance on a multi-instance deploy would have its own copy.
const cache = new NodeCache({
  stdTTL: 300, // seconds an entry stays valid
  // useClones (default true): get/set return copies, so code that mutates
  // a response object can never corrupt what is stored.
});

// Single source for key names, shared by the routes (read) and controllers (invalidate).
const cacheKeys = {
  allImages: () => 'images:all',
  image: (id) => `images:${id}`,
};

module.exports = { cache, cacheKeys };
