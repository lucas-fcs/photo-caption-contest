const request = require('supertest');
const app = require('../src/app');
const { db, resetDatabase, closeDatabase } = require('./helpers/db');
const { DEMO_USER } = require('../src/db/seeders/20261121130100-demo-user');

let demoUser;

beforeAll(async () => {
  await resetDatabase();
  demoUser = await db.User.findOne({ where: { username: DEMO_USER.username } });
});
afterAll(closeDatabase);

// TODO(fase 4): userId leaves the body once the author comes from the session.
const postCaption = (imageId, body) => request(app).post(`/images/${imageId}/captions`).send(body);

describe('POST /images/:id/captions', () => {
  it('creates a caption and responds 201 with author and imageId', async () => {
    const res = await postCaption(1, { text: 'My caption', userId: demoUser.id });

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

  it('persists the caption, visible first in GET /images/:id', async () => {
    const created = await postCaption(2, { text: 'Latest on image 2', userId: demoUser.id });

    const res = await request(app).get('/images/2');

    expect(res.body.captions[0]).toMatchObject({ id: created.body.id, text: 'Latest on image 2' });
  });

  it('trims the text before saving', async () => {
    const res = await postCaption(1, { text: '   spaced out   ', userId: demoUser.id });

    expect(res.status).toBe(201);
    expect(res.body.text).toBe('spaced out');
  });

  it('accepts exactly 280 characters', async () => {
    const res = await postCaption(1, { text: 'a'.repeat(280), userId: demoUser.id });

    expect(res.status).toBe(201);
  });

  describe('text validation (400)', () => {
    it.each([
      ['missing text', { userId: 1 }, 'Text must be a string'],
      ['numeric text', { text: 42, userId: 1 }, 'Text must be a string'],
      ['object text', { text: { a: 1 }, userId: 1 }, 'Text must be a string'],
      ['empty text', { text: '', userId: 1 }, 'Text must be 1-280 characters'],
      ['whitespace-only text', { text: '    ', userId: 1 }, 'Text must be 1-280 characters'],
      ['text over 280 characters', { text: 'a'.repeat(281), userId: 1 }, 'Text must be 1-280 characters'],
    ])('rejects %s', async (_label, body, error) => {
      const res = await postCaption(1, body);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error });
    });

    it('rejects a request without a body', async () => {
      const res = await request(app).post('/images/1/captions');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Text must be a string' });
    });
  });

  describe('userId validation (400, provisional until phase 4)', () => {
    it.each([
      ['missing userId', { text: 'Hi' }],
      ['string userId', { text: 'Hi', userId: '1' }],
      ['zero userId', { text: 'Hi', userId: 0 }],
      ['decimal userId', { text: 'Hi', userId: 1.5 }],
      ['userId above the integer range', { text: 'Hi', userId: 2147483648 }],
      ['non-existent userId', { text: 'Hi', userId: 9999 }],
    ])('rejects %s', async (_label, body) => {
      const res = await postCaption(1, body);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid userId' });
    });
  });

  it.each(['abc', '0', '-3'])('responds 400 for invalid image id "%s"', async (id) => {
    const res = await postCaption(id, { text: 'Hi', userId: demoUser.id });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid image id' });
  });

  it('responds 404 for a non-existent image and creates nothing', async () => {
    const before = await db.Caption.count();

    const res = await postCaption(999, { text: 'Lost', userId: demoUser.id });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Image not found' });
    await expect(db.Caption.count()).resolves.toBe(before);
  });

  it('creates nothing when the userId does not exist', async () => {
    const before = await db.Caption.count();

    await postCaption(1, { text: 'Nobody', userId: 9999 });

    await expect(db.Caption.count()).resolves.toBe(before);
  });
});
