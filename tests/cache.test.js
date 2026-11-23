const request = require('supertest');
const app = require('../src/app');
const { cache, cacheKeys } = require('../src/config/cache');
const { db, resetDatabase, closeDatabase } = require('./helpers/db');
const { loginAs } = require('./helpers/auth');

beforeAll(resetDatabase);
afterAll(closeDatabase);

// Changes the database behind the API's back. If a GET still returns the old
// value afterwards, the response really came from the cache.
const renameImageDirectly = (id, title) => db.Image.update({ title }, { where: { id } });

describe('GET /images cache', () => {
  afterAll(() => renameImageDirectly(1, 'Pier at sunset'));

  it('misses first, then hits with the same body', async () => {
    const first = await request(app).get('/images');
    const second = await request(app).get('/images');

    expect(first.headers['x-cache']).toBe('MISS');
    expect(second.headers['x-cache']).toBe('HIT');
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
  });

  it('serves the stored response, not a fresh query', async () => {
    await request(app).get('/images');
    await renameImageDirectly(1, 'Renamed behind the cache');

    const res = await request(app).get('/images');

    expect(res.headers['x-cache']).toBe('HIT');
    expect(res.body[0].title).toBe('Pier at sunset');
  });

  it('stores entries with a 300-second TTL', async () => {
    const before = Date.now();
    await request(app).get('/images');

    const expiresAt = cache.getTtl(cacheKeys.allImages());

    expect(expiresAt).toBeGreaterThanOrEqual(before + 300 * 1000);
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + 300 * 1000);
  });
});

describe('GET /images/:id cache', () => {
  afterAll(() => renameImageDirectly(1, 'Pier at sunset'));

  it('misses first, then hits, under the key images:<id>', async () => {
    const first = await request(app).get('/images/1');
    const second = await request(app).get('/images/1');

    expect(first.headers['x-cache']).toBe('MISS');
    expect(second.headers['x-cache']).toBe('HIT');
    expect(second.body).toEqual(first.body);
    expect(cache.has(cacheKeys.image(1))).toBe(true);
  });

  it('serves the stored response, not a fresh query', async () => {
    await request(app).get('/images/1');
    await renameImageDirectly(1, 'Renamed behind the cache');

    const res = await request(app).get('/images/1');

    expect(res.body.title).toBe('Pier at sunset');
  });

  it('does not cache a 404', async () => {
    await request(app).get('/images/999');
    const res = await request(app).get('/images/999');

    expect(res.status).toBe(404);
    expect(res.headers['x-cache']).toBe('MISS');
    expect(cache.has(cacheKeys.image(999))).toBe(false);
  });

  it('does not touch the cache for an invalid id (400)', async () => {
    const res = await request(app).get('/images/abc');

    expect(res.status).toBe(400);
    expect(res.headers['x-cache']).toBeUndefined();
    expect(cache.keys()).toEqual([]);
  });
});

describe('invalidation on POST /images/:id/captions', () => {
  let agent;

  beforeAll(async () => {
    agent = await loginAs();
  });

  it('drops images:<id>, so the next GET shows the new caption', async () => {
    await request(app).get('/images/1');
    expect(cache.has(cacheKeys.image(1))).toBe(true);

    const created = await agent.post('/images/1/captions').send({ text: 'Fresh caption' });
    expect(created.status).toBe(201);
    expect(cache.has(cacheKeys.image(1))).toBe(false);

    const res = await request(app).get('/images/1');
    expect(res.headers['x-cache']).toBe('MISS');
    expect(res.body.captions[0]).toMatchObject({ id: created.body.id, text: 'Fresh caption' });
  });

  it('keeps other images and the list cached', async () => {
    await request(app).get('/images');
    await request(app).get('/images/2');

    await agent.post('/images/1/captions').send({ text: 'Only image 1 changes' });

    expect(cache.has(cacheKeys.allImages())).toBe(true);
    expect(cache.has(cacheKeys.image(2))).toBe(true);
  });

  it('keeps the entry when the POST fails', async () => {
    await request(app).get('/images/1');

    const res = await agent.post('/images/1/captions').send({ text: '' });

    expect(res.status).toBe(400);
    expect(cache.has(cacheKeys.image(1))).toBe(true);
  });
});
