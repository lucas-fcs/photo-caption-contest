const path = require('path');
const express = require('express');

const { sessionMiddleware } = require('./config/session');
const { docsRouter } = require('./config/swagger');
const apiRoutes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// On Render, HTTPS ends at a proxy and the app receives plain HTTP.
// Trusting the first proxy lets Express see the original HTTPS request,
// which express-session needs before it sends a `secure` cookie.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(express.json());

// Static files and docs come before the session, so they never touch the session store.
// src/public/images/pier.jpg -> GET /static/images/pier.jpg
// A missing file falls through to notFound (JSON 404).
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/api-docs', docsRouter);

app.use(sessionMiddleware);

apiRoutes.forEach(({ path: mountPath, router }) => app.use(mountPath, router));

// Must come after all routes: notFound catches anything unmatched,
// errorHandler catches anything passed to next(err) or thrown.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
