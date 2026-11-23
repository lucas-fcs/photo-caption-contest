const { promisify } = require('util');
const bcrypt = require('bcrypt');

const { User } = require('../db/models');
const HttpError = require('../utils/httpError');
const { SALT_ROUNDS, MIN_PASSWORD_LENGTH, MAX_PASSWORD_BYTES } = require('../config/auth');
const { SESSION_COOKIE_NAME, cookieOptions } = require('../config/session');
const { serializeUser } = require('./serializers');

// Compared against when the email does not exist, so a wrong email takes
// as long as a wrong password and response time does not reveal who is registered.
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-not-a-real-password', SALT_ROUNDS);

const isString = (value) => typeof value === 'string';

// express-session uses callbacks; promisify lets us await them.
// bind() is needed because these methods rely on `this` being the session.
const regenerateSession = (req) => promisify(req.session.regenerate.bind(req.session))();
const saveSession = (req) => promisify(req.session.save.bind(req.session))();
const destroySession = (req) => promisify(req.session.destroy.bind(req.session))();

async function endSession(req, res) {
  await destroySession(req);
  // Same options as when the cookie was set, or the browser keeps it.
  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
}

function validatePassword(password) {
  if (!isString(password)) throw new HttpError(400, 'Password must be a string');
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    throw new HttpError(400, `Password must be at most ${MAX_PASSWORD_BYTES} bytes`);
  }
}

async function register(req, res) {
  const { username, email, password } = req.body ?? {};

  if (!isString(username)) throw new HttpError(400, 'Username must be a string');
  if (!isString(email)) throw new HttpError(400, 'Email must be a string');
  validatePassword(password);

  // Length/format checks run in the model (400); duplicates hit the
  // UNIQUE constraints (409). Both are mapped by errorHandler.
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ username, email, passwordHash });

  res.status(201).json(serializeUser(user));
}

async function login(req, res) {
  const { email, password } = req.body ?? {};

  if (!isString(email) || !isString(password) || !email.trim() || !password) {
    throw new HttpError(400, 'Email and password are required');
  }

  const user = await User.scope('withPassword').findOne({
    where: { email: email.trim().toLowerCase() },
  });
  const passwordMatches = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

  // Same message for both cases: never say which one was wrong.
  if (!user || !passwordMatches) throw new HttpError(401, 'Invalid credentials');

  // New session id on login, so an id planted before login (session fixation) is useless.
  await regenerateSession(req);
  req.session.userId = user.id;
  await saveSession(req);

  res.status(200).json(serializeUser(user));
}

async function logout(req, res) {
  await endSession(req, res);
  res.status(204).end();
}

async function me(req, res) {
  const user = await User.findByPk(req.session.userId);

  // The account was deleted while the session was still alive.
  if (!user) {
    await endSession(req, res);
    throw new HttpError(401, 'Authentication required');
  }

  res.status(200).json(serializeUser(user));
}

module.exports = { register, login, logout, me };
