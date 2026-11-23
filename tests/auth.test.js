const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const { db, resetDatabase, closeDatabase } = require('./helpers/db');
const { loginAs } = require('./helpers/auth');
const { DEMO_USER } = require('../src/db/seeders/20261121130100-demo-user');

beforeAll(resetDatabase);
afterAll(closeDatabase);

const register = (body) => request(app).post('/auth/register').send(body);
const login = (body) => request(app).post('/auth/login').send(body);

const newUser = (overrides = {}) => ({
  username: 'newbie',
  email: 'newbie@example.com',
  password: 'correct-horse',
  ...overrides,
});

describe('POST /auth/register', () => {
  it('creates a user and responds 201 with id, username and email only', async () => {
    const res = await register(newUser());

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(Number), username: 'newbie', email: 'newbie@example.com' });
  });

  it('stores a bcrypt hash, never the plain password', async () => {
    const user = await db.User.scope('withPassword').findOne({ where: { username: 'newbie' } });

    expect(user.passwordHash).not.toBe('correct-horse');
    await expect(bcrypt.compare('correct-horse', user.passwordHash)).resolves.toBe(true);
  });

  it('does not log the user in (no session cookie)', async () => {
    const res = await register(newUser({ username: 'nocookie', email: 'nocookie@example.com' }));

    expect(res.status).toBe(201);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('normalizes the email to lowercase', async () => {
    const res = await register(newUser({ username: 'casey', email: 'Casey@Example.COM' }));

    expect(res.body.email).toBe('casey@example.com');
  });

  it('accepts a password of exactly 72 bytes', async () => {
    const res = await register(newUser({ username: 'long72', email: 'long72@example.com', password: 'a'.repeat(72) }));

    expect(res.status).toBe(201);
  });

  describe('validation (400)', () => {
    it.each([
      ['missing username', { username: undefined }, 'Username must be a string'],
      ['missing email', { email: undefined }, 'Email must be a string'],
      ['missing password', { password: undefined }, 'Password must be a string'],
      ['numeric password', { password: 12345678 }, 'Password must be a string'],
      ['username too short', { username: 'ab' }, 'Username must be 3-30 characters'],
      ['username too long', { username: 'a'.repeat(31) }, 'Username must be 3-30 characters'],
      ['invalid email', { email: 'not-an-email' }, 'Email must be valid'],
      ['password under 8 characters', { password: 'short7!' }, 'Password must be at least 8 characters'],
      ['password over 72 bytes', { password: 'a'.repeat(73) }, 'Password must be at most 72 bytes'],
      // 25 characters, but 4 bytes each in UTF-8 = 100 bytes.
      ['multibyte password over 72 bytes', { password: '😀'.repeat(25) }, 'Password must be at most 72 bytes'],
    ])('rejects %s', async (_label, overrides, error) => {
      const res = await register(newUser({ username: 'valid', email: 'valid@example.com', ...overrides }));

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error });
    });

    it('rejects a request without a body', async () => {
      const res = await request(app).post('/auth/register');

      expect(res.status).toBe(400);
    });
  });

  describe('conflicts (409)', () => {
    it('rejects a username already taken', async () => {
      const res = await register(newUser({ username: DEMO_USER.username, email: 'unique1@example.com' }));

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'Username already taken' });
    });

    it('rejects an email already registered, regardless of case', async () => {
      const res = await register(newUser({ username: 'unique2', email: DEMO_USER.email.toUpperCase() }));

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'Email already registered' });
    });
  });
});

describe('POST /auth/login', () => {
  it('responds 200 with the user and sets a session cookie', async () => {
    const res = await login({ email: DEMO_USER.email, password: DEMO_USER.password });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, username: DEMO_USER.username, email: DEMO_USER.email });

    const [cookie] = res.headers['set-cookie'];
    expect(cookie).toMatch(/^pcc\.sid=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Expires=/);
  });

  it('persists the session in the sessions table', async () => {
    const before = await db.Session.count();

    await login({ email: DEMO_USER.email, password: DEMO_USER.password });

    await expect(db.Session.count()).resolves.toBe(before + 1);
  });

  it('accepts the email in any case and with surrounding spaces', async () => {
    const res = await login({ email: `  ${DEMO_USER.email.toUpperCase()} `, password: DEMO_USER.password });

    expect(res.status).toBe(200);
  });

  it.each([
    ['wrong password', { email: DEMO_USER.email, password: 'wrong-password' }],
    ['unknown email', { email: 'nobody@example.com', password: DEMO_USER.password }],
  ])('responds 401 with a generic message for %s', async (_label, body) => {
    const res = await login(body);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid credentials' });
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it.each([
    ['missing email', { password: DEMO_USER.password }],
    ['missing password', { email: DEMO_USER.email }],
    ['empty email', { email: '   ', password: DEMO_USER.password }],
    ['empty password', { email: DEMO_USER.email, password: '' }],
    ['non-string password', { email: DEMO_USER.email, password: 12345678 }],
  ])('responds 400 for %s', async (_label, body) => {
    const res = await login(body);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Email and password are required' });
  });

  it('issues a new session id on every login (session fixation)', async () => {
    const agent = request.agent(app);

    const first = await agent.post('/auth/login').send({ email: DEMO_USER.email, password: DEMO_USER.password });
    const second = await agent.post('/auth/login').send({ email: DEMO_USER.email, password: DEMO_USER.password });

    const sid = (res) => res.headers['set-cookie'][0].split(';')[0];
    expect(sid(second)).not.toBe(sid(first));
  });
});

describe('GET /auth/me', () => {
  it('returns the logged-in user', async () => {
    const agent = await loginAs();

    const res = await agent.get('/auth/me');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, username: DEMO_USER.username, email: DEMO_USER.email });
  });

  it('responds 401 without a session', async () => {
    const res = await request(app).get('/auth/me');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Authentication required' });
  });

  it('responds 401 with a forged session cookie', async () => {
    const res = await request(app).get('/auth/me').set('Cookie', 'pcc.sid=s%3Aforged.invalidsignature');

    expect(res.status).toBe(401);
  });

  it('responds 401 and ends the session when the account no longer exists', async () => {
    await register(newUser({ username: 'ghost', email: 'ghost@example.com' }));
    const agent = await loginAs({ email: 'ghost@example.com', password: 'correct-horse' });
    await db.User.destroy({ where: { username: 'ghost' } });

    const res = await agent.get('/auth/me');
    expect(res.status).toBe(401);

    const again = await agent.get('/auth/me');
    expect(again.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('responds 204, clears the cookie and ends the session', async () => {
    const agent = await loginAs();
    const before = await db.Session.count();

    const res = await agent.post('/auth/logout');

    expect(res.status).toBe(204);
    expect(res.headers['set-cookie'][0]).toMatch(/^pcc\.sid=;/);
    await expect(db.Session.count()).resolves.toBe(before - 1);

    const me = await agent.get('/auth/me');
    expect(me.status).toBe(401);
  });

  it('responds 401 without a session', async () => {
    const res = await request(app).post('/auth/logout');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Authentication required' });
  });
});
