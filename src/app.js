const express = require('express');

const healthRouter = require('./routes/health');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

app.use('/health', healthRouter);

// Must come after all routes: notFound catches anything unmatched,
// errorHandler catches anything passed to next(err) or thrown.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
