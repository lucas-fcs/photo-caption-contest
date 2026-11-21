// An error that already knows its HTTP status. Controllers throw it
// (e.g. `throw new HttpError(404, 'Image not found')`) and the central
// errorHandler turns it into `{ "error": message }` with that status.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

module.exports = HttpError;
