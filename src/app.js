const path = require('path');
const express = require('express');

const healthRouter = require('./routes/health');
const imagesRouter = require('./routes/images');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

// src/public/images/pier.jpg -> GET /static/images/pier.jpg
// A missing file falls through to notFound (JSON 404).
app.use('/static', express.static(path.join(__dirname, 'public')));

app.use('/health', healthRouter);
app.use('/images', imagesRouter);

// Must come after all routes: notFound catches anything unmatched,
// errorHandler catches anything passed to next(err) or thrown.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
