const request = require('supertest');
const app = require('../src/app');
const { db, resetDatabase, closeDatabase } = require('./helpers/db');
const { loginAs } = require('./helpers/auth');
const { DEMO_USER } = require('../src/db/seeders/20261121130100-demo-user');

let agent;
let demoUser;

beforeAll(async () => {
  await resetDatabase();
  demoUser = await db.User.findOne({ where: { username: DEMO_USER.username } });
  agent = await loginAs();
});
afterAll(closeDatabase);

const postCaption = (imageId, body) => agent.post(`/images/${imageId}/captions`).send(body);

describe('POST /images/:id/captions', () => {
  it('creates a caption by the logged-in user and responds 201', async () => {
    const res = await postCaption(1, { text: 'My caption' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      text: 'My caption',
      imageId: 1,
      author: { id: demoUser.id, username: DEMO_USER.username },
      createdAt: expect.any(String),
    });
    expect(new Date(res.body.createdAt).toString()).not.toBe('Invalid Date');
  });

  it('ignores a userId sent in the body: the author comes from the session', async () => {
    const other = await db.User.create({
      username: 'impersonated',
      email: 'impersonated@example.com',
      passwordHash: 'not-a-real-hash',
    });

    const res = await postCaption(1, { text: 'Who wrote me?', userId: other.id });

    expect(res.status).toBe(201);
    expect(res.body.author.id).toBe(demoUser.id);
  });

  it('persists the caption, visible first in GET /images/:id', async () => {
    const created = await postCaption(2, { text: 'Latest on image 2' });

    const res = await request(app).get('/images/2');

    expect(res.body.captions[0]).toMatchObject({ id: created.body.id, text: 'Latest on image 2' });
  });

  it('trims the text before saving', async () => {
    const res = await postCaption(1, { text: '   spaced out   ' });

    expect(res.status).toBe(201);
    expect(res.body.text).toBe('spaced out');
  });

  it('accepts exactly 280 characters', async () => {
    const res = await postCaption(1, { text: 'a'.repeat(280) });

    expect(res.status).toBe(201);
  });

  describe('authentication (401)', () => {
    it('rejects a request without a session and creates nothing', async () => {
      const before = await db.Caption.count();

      const res = await request(app).post('/images/1/captions').send({ text: 'Anonymous' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Authentication required' });
      await expect(db.Caption.count()).resolves.toBe(before);
    });

    it('answers 401 before validating the image id', async () => {
      const res = await request(app).post('/images/abc/captions').send({ text: 'Anonymous' });

      expect(res.status).toBe(401);
    });

    it('rejects a session whose account no longer exists', async () => {
      await db.User.create({
        username: 'vanishing',
        email: 'vanishing@example.com',
        passwordHash: await require('bcrypt').hash('correct-horse', 4),
      });
      const ghostAgent = await loginAs({ email: 'vanishing@example.com', password: 'correct-horse' });
      await db.User.destroy({ where: { username: 'vanishing' } });

      const res = await ghostAgent.post('/images/1/captions').send({ text: 'From beyond' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Authentication required' });
    });

    it('rejects a request after logout', async () => {
      const shortLived = await loginAs();
      await shortLived.post('/auth/logout');

      const res = await shortLived.post('/images/1/captions').send({ text: 'Too late' });

      expect(res.status).toBe(401);
    });
  });

  describe('text validation (400)', () => {
    it.each([
      ['missing text', {}, 'Text must be a string'],
      ['numeric text', { text: 42 }, 'Text must be a string'],
      ['object text', { text: { a: 1 } }, 'Text must be a string'],
      ['empty text', { text: '' }, 'Text must be 1-280 characters'],
      ['whitespace-only text', { text: '    ' }, 'Text must be 1-280 characters'],
      ['text over 280 characters', { text: 'a'.repeat(281) }, 'Text must be 1-280 characters'],
    ])('rejects %s', async (_label, body, error) => {
      const res = await postCaption(1, body);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error });
    });

    it('rejects a request without a body', async () => {
      const res = await agent.post('/images/1/captions');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Text must be a string' });
    });
  });

  it.each(['abc', '0', '-3'])('responds 400 for invalid image id "%s"', async (id) => {
    const res = await postCaption(id, { text: 'Hi' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid image id' });
  });

  it('responds 404 for a non-existent image and creates nothing', async () => {
    const before = await db.Caption.count();

    const res = await postCaption(999, { text: 'Lost' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Image not found' });
    await expect(db.Caption.count()).resolves.toBe(before);
  });
});
