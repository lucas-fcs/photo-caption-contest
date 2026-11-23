require('./env');

const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const { sequelize } = require('../db/models');

// Fail fast: a missing secret must never fall back to a default value.
if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is not set. See .env.example.');
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const isProduction = process.env.NODE_ENV === 'production';

// Sessions live in the "sessions" table (model "Session", created by a migration).
// The store also deletes expired rows every 15 minutes.
const store = new SequelizeStore({
  db: sequelize,
  table: 'Session',
  expiration: ONE_DAY_MS,
});

// The default "connect.sid" reveals the stack; a neutral name does not.
const SESSION_COOKIE_NAME = 'pcc.sid';

const cookieOptions = {
  httpOnly: true, // not readable from JavaScript, which limits XSS damage
  sameSite: 'lax', // not sent on cross-site POSTs, which limits CSRF
  secure: isProduction, // HTTPS only in production; local dev runs on plain HTTP
  path: '/',
};

const sessionMiddleware = session({
  name: SESSION_COOKIE_NAME,
  secret: process.env.SESSION_SECRET,
  store,
  resave: false, // do not rewrite unchanged sessions on every request
  saveUninitialized: false, // anonymous visitors do not create rows; only login does
  cookie: { ...cookieOptions, maxAge: ONE_DAY_MS },
});

module.exports = {
  sessionMiddleware,
  store,
  SESSION_COOKIE_NAME,
  cookieOptions,
};
