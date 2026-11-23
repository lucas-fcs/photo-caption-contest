const path = require('path');
const express = require('express');

const { sessionMiddleware } = require('./config/session');
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const imagesRouter = require('./routes/images');
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

// src/public/images/pier.jpg -> GET /static/images/pier.jpg
// Registered before the session so static files never touch the session store.
// A missing file falls through to notFound (JSON 404).
app.use('/static', express.static(path.join(__dirname, 'public')));

app.use(sessionMiddleware);

app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/images', imagesRouter);

// Must come after all routes: notFound catches anything unmatched,
// errorHandler catches anything passed to next(err) or thrown.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
