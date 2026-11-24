const healthRouter = require('./health');
const authRouter = require('./auth');
const imagesRouter = require('./images');

// Every API router and its mount path, in one list.
// app.js mounts them from here, and tests/docs.test.js reads the same list
// to check that every route is documented in docs/openapi.yaml
// (Express 5 no longer exposes a mounted router's path as text).
module.exports = [
  { path: '/health', router: healthRouter },
  { path: '/auth', router: authRouter },
  { path: '/images', router: imagesRouter },
];
