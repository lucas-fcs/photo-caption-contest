const bcrypt = require('bcrypt');
const { db, resetDatabase, closeDatabase } = require('./helpers/db');
const { IMAGES } = require('../src/db/seeders/20261121130000-demo-images');
const { DEMO_USER } = require('../src/db/seeders/20261121130100-demo-user');

const { User, Image, Caption } = db;

beforeAll(resetDatabase);
afterAll(closeDatabase);

const validUser = (overrides = {}) => ({
  username: 'alice',
  email: 'alice@example.com',
  passwordHash: 'not-a-real-hash',
  ...overrides,
});

describe('seed data', () => {
  it('seeds every demo image', async () => {
    const images = await Image.findAll({ order: [['id', 'ASC']] });

    expect(images.map((i) => i.filename)).toEqual(IMAGES.map((i) => i.filename));
    images.forEach((image) => {
      expect(image.title).toBeTruthy();
      expect(image.altText).toBeTruthy();
    });
  });

  it('seeds the demo user with a bcrypt hash of the documented password', async () => {
    const user = await User.scope('withPassword').findOne({ where: { username: DEMO_USER.username } });

    expect(user).not.toBeNull();
    expect(user.passwordHash).not.toBe(DEMO_USER.password);
    await expect(bcrypt.compare(DEMO_USER.password, user.passwordHash)).resolves.toBe(true);
  });
});

describe('User', () => {
  it('leaves passwordHash out of default queries', async () => {
    const user = await User.findOne({ where: { username: DEMO_USER.username } });

    expect(user.passwordHash).toBeUndefined();
  });

  it('never serializes passwordHash, even when loaded explicitly', async () => {
    const user = await User.scope('withPassword').findOne({ where: { username: DEMO_USER.username } });

    expect(user.passwordHash).toBeDefined();
    expect(user.toJSON()).not.toHaveProperty('passwordHash');
    expect(JSON.parse(JSON.stringify(user))).not.toHaveProperty('passwordHash');
  });

  it('normalizes email to trimmed lowercase', async () => {
    const user = await User.create(validUser({ username: 'normalize', email: '  Mixed@Example.COM ' }));

    expect(user.email).toBe('mixed@example.com');
  });

  it.each([
    ['username too short', { username: 'ab' }, 'Username must be 3-30 characters'],
    ['username too long', { username: 'a'.repeat(31) }, 'Username must be 3-30 characters'],
    ['missing username', { username: null }, 'Username is required'],
    ['invalid email', { email: 'not-an-email' }, 'Email must be valid'],
    ['missing email', { email: null }, 'Email is required'],
  ])('rejects %s', async (_label, overrides, message) => {
    await expect(User.create(validUser(overrides))).rejects.toMatchObject({
      name: 'SequelizeValidationError',
      errors: [expect.objectContaining({ message })],
    });
  });

  it('rejects a duplicate username', async () => {
    await expect(
      User.create(validUser({ username: DEMO_USER.username, email: 'other@example.com' })),
    ).rejects.toMatchObject({ name: 'SequelizeUniqueConstraintError' });
  });

  it('rejects a duplicate email, regardless of case', async () => {
    await expect(
      User.create(validUser({ username: 'someone', email: DEMO_USER.email.toUpperCase() })),
    ).rejects.toMatchObject({ name: 'SequelizeUniqueConstraintError' });
  });
});

describe('Caption', () => {
  let user;
  let image;

  beforeAll(async () => {
    user = await User.findOne({ where: { username: DEMO_USER.username } });
    image = await Image.findOne({ where: { filename: IMAGES[0].filename } });
  });

  it('trims text before saving', async () => {
    const caption = await Caption.create({ text: '  Hello pier  ', userId: user.id, imageId: image.id });

    expect(caption.text).toBe('Hello pier');
  });

  it('accepts exactly 280 characters', async () => {
    const caption = await Caption.create({ text: 'a'.repeat(280), userId: user.id, imageId: image.id });

    expect(caption.text).toHaveLength(280);
  });

  it.each([
    ['empty text', ''],
    ['whitespace-only text', '    '],
    ['text over 280 characters', 'a'.repeat(281)],
  ])('rejects %s', async (_label, text) => {
    await expect(
      Caption.create({ text, userId: user.id, imageId: image.id }),
    ).rejects.toMatchObject({
      name: 'SequelizeValidationError',
      errors: [expect.objectContaining({ message: 'Text must be 1-280 characters' })],
    });
  });

  it('rejects a caption pointing to a non-existent image', async () => {
    await expect(
      Caption.create({ text: 'Orphan', userId: user.id, imageId: 9999 }),
    ).rejects.toMatchObject({ name: 'SequelizeForeignKeyConstraintError' });
  });

  it('loads the author through the "author" alias, without the password hash', async () => {
    const created = await Caption.create({ text: 'With author', userId: user.id, imageId: image.id });

    const caption = await Caption.findByPk(created.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'username'] }],
    });

    expect(caption.author.toJSON()).toEqual({ id: user.id, username: DEMO_USER.username });
  });

  it('loads an image with its captions through the "captions" alias', async () => {
    const found = await Image.findByPk(image.id, { include: [{ model: Caption, as: 'captions' }] });

    expect(found.captions.length).toBeGreaterThan(0);
    found.captions.forEach((c) => expect(c.imageId).toBe(image.id));
  });
});

describe('ON DELETE CASCADE', () => {
  it('deletes captions when their image is deleted', async () => {
    const user = await User.findOne({ where: { username: DEMO_USER.username } });
    const image = await Image.create({ title: 'Temp', filename: 'temp.jpg', altText: 'Temporary image' });
    await Caption.create({ text: 'Goes away', userId: user.id, imageId: image.id });

    await image.destroy();

    await expect(Caption.count({ where: { imageId: image.id } })).resolves.toBe(0);
  });

  it('deletes captions when their author is deleted', async () => {
    const user = await User.create(validUser({ username: 'shortlived', email: 'shortlived@example.com' }));
    const image = await Image.findOne();
    await Caption.create({ text: 'Also goes away', userId: user.id, imageId: image.id });

    await user.destroy();

    await expect(Caption.count({ where: { userId: user.id } })).resolves.toBe(0);
  });
});
