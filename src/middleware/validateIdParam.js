const HttpError = require('../utils/httpError');

// Largest value a Postgres INTEGER column can hold.
const MAX_INTEGER_ID = 2147483647;

// Validates a route param as a positive integer and stores the parsed number
// in req.params. Builds the middleware for a given param name and label.
function validateIdParam(paramName, label) {
  return (req, res, next) => {
    const raw = req.params[paramName];

    if (!/^[1-9]\d*$/.test(raw)) {
      return next(new HttpError(400, `Invalid ${label} id`));
    }

    const id = Number(raw);
    // A valid positive integer, but no row can have it: querying would overflow.
    if (id > MAX_INTEGER_ID) {
      return next(new HttpError(404, `${label[0].toUpperCase()}${label.slice(1)} not found`));
    }

    req.params[paramName] = id;
    return next();
  };
}

module.exports = validateIdParam;
