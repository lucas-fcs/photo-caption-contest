const { cache } = require('../config/cache');

// Caches successful JSON responses under the key returned by keyFn(req).
// Hit: responds from memory and the controller never runs.
// Miss: wraps res.json so the body is stored when the controller responds.
// X-Cache (HIT/MISS) makes the behavior visible to clients and tests.
function cacheResponse(keyFn) {
  return (req, res, next) => {
    const key = keyFn(req);
    const cached = cache.get(key);

    if (cached !== undefined) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    res.set('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only 200s: a cached 404 would keep saying "not found" after the
      // resource appears, and errors should never outlive their cause.
      if (res.statusCode === 200) cache.set(key, body);
      return originalJson(body);
    };

    return next();
  };
}

module.exports = cacheResponse;
