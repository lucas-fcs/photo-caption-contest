const request = require('supertest');
const app = require('../src/app');
const { db, resetDatabase, closeDatabase } = require('./helpers/db');
const { IMAGES } = require('../src/db/seeders/20261121130000-demo-images');
const { DEMO_USER } = require('../src/db/seeders/20261121130100-demo-user');

beforeAll(resetDatabase);
afterAll(closeDatabase);

describe('GET /images', () => {
  it('lists every image with id, title, url and altText only', async () => {
    const res = await request(app).get('/images');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(IMAGES.length);
    expect(res.body[0]).toEqual({
      id: 1,
      title: IMAGES[0].title,
      url: `/static/images/${IMAGES[0].filename}`,
      altText: IMAGES[0].alt_text,
    });
  });

  it('orders images by id', async () => {
    const res = await request(app).get('/images');

    const ids = res.body.map((image) => image.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });
});

describe('GET /images/:id', () => {
  let demoUser;
  let otherUser;

  beforeAll(async () => {
    demoUser = await db.User.findOne({ where: { username: DEMO_USER.username } });
    otherUser = await db.User.create({
      username: 'other',
      email: 'other@example.com',
      passwordHash: 'not-a-real-hash',
    });

    // Explicit timestamps (Caption.create would set both to "now").
    // Two captions share the same instant to exercise the id tie-breaker.
    await db.sequelize.getQueryInterface().bulkInsert('captions', [
      { text: 'Oldest', user_id: demoUser.id, image_id: 1, created_at: new Date('2026-01-01T10:00:00Z'), updated_at: new Date('2026-01-01T10:00:00Z') },
      { text: 'Newest', user_id: otherUser.id, image_id: 1, created_at: new Date('2026-01-03T10:00:00Z'), updated_at: new Date('2026-01-03T10:00:00Z') },
      { text: 'Middle A', user_id: demoUser.id, image_id: 1, created_at: new Date('2026-01-02T10:00:00Z'), updated_at: new Date('2026-01-02T10:00:00Z') },
      { text: 'Middle B', user_id: demoUser.id, image_id: 1, created_at: new Date('2026-01-02T10:00:00Z'), updated_at: new Date('2026-01-02T10:00:00Z') },
      { text: 'Other image', user_id: demoUser.id, image_id: 2, created_at: new Date('2026-01-05T10:00:00Z'), updated_at: new Date('2026-01-05T10:00:00Z') },
    ]);
  });

  it('returns the image with its description', async () => {
    const res = await request(app).get('/images/1');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 1,
      title: IMAGES[0].title,
      url: `/static/images/${IMAGES[0].filename}`,
      altText: IMAGES[0].alt_text,
      description: IMAGES[0].description,
    });
  });

  it('returns only its own captions, newest first, with id as tie-breaker', async () => {
    const res = await request(app).get('/images/1');

    expect(res.body.captions.map((c) => c.text)).toEqual(['Newest', 'Middle B', 'Middle A', 'Oldest']);
  });

  it('shapes each caption with author id and username only', async () => {
    const res = await request(app).get('/images/1');

    expect(res.body.captions[0]).toEqual({
      id: expect.any(Number),
      text: 'Newest',
      createdAt: '2026-01-03T10:00:00.000Z',
      author: { id: otherUser.id, username: 'other' },
    });
  });

  it('returns an empty captions array for an image without captions', async () => {
    const res = await request(app).get('/images/3');

    expect(res.status).toBe(200);
    expect(res.body.captions).toEqual([]);
  });

  it.each(['abc', '0', '-1', '1.5', '01', '1e3'])('responds 400 for invalid id "%s"', async (id) => {
    const res = await request(app).get(`/images/${id}`);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid image id' });
  });

  it.each(['999', '2147483648'])('responds 404 for non-existent id %s', async (id) => {
    const res = await request(app).get(`/images/${id}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Image not found' });
  });
});

describe('GET /static/images/:filename', () => {
  it('serves a seeded image file', async () => {
    const res = await request(app).get(`/static/images/${IMAGES[0].filename}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('serves every seeded image (no broken urls)', async () => {
    const { body: images } = await request(app).get('/images');

    for (const image of images) {
      const res = await request(app).get(image.url);
      expect(res.status).toBe(200);
    }
  });

  it('responds 404 in JSON for a missing file', async () => {
    const res = await request(app).get('/static/images/missing.jpg');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Route not found' });
  });
});
