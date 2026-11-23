// Central error handler. Express recognizes it by its four arguments.
// Errors may carry a `status` (e.g. 400, 404, 409); anything else becomes 500.
// For 500s the client gets a generic message, and the details stay in the server log.

// Messages for UNIQUE violations, keyed by the constraint name Postgres reports.
// Sequelize fills err.errors by parsing the database's message text, which only
// works when Postgres answers in English; the constraint name is locale-independent.
// Names follow Postgres's default "<table>_<column>_key" (see the migrations).
const UNIQUE_CONSTRAINT_MESSAGES = {
  users_username_key: 'Username already taken',
  users_email_key: 'Email already registered',
};

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Model validations (length, format, required) are client errors.
  // The first message is enough for the client to fix the request.
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({ error: err.errors[0].message });
  }

  // The database's UNIQUE constraint is the source of truth for duplicates:
  // checking with a SELECT first would race with a concurrent insert.
  if (err.name === 'SequelizeUniqueConstraintError') {
    const constraint = err.parent && err.parent.constraint;
    const message = UNIQUE_CONSTRAINT_MESSAGES[constraint] || 'Resource already exists';
    return res.status(409).json({ error: message });
  }

  // express.json() sets status 400 on malformed JSON bodies.
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600
    ? err.status
    : 500;

  if (status >= 500) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  const message = err.type === 'entity.parse.failed' ? 'Malformed JSON body' : err.message;
  return res.status(status).json({ error: message });
}

module.exports = errorHandler;
