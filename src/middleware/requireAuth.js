const HttpError = require('../utils/httpError');

// API, not a website: respond 401 instead of redirecting to a login page.
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return next(new HttpError(401, 'Authentication required'));
  }
  return next();
}

module.exports = requireAuth;
