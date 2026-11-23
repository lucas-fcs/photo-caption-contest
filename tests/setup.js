// Runs in every test file (setupFilesAfterEnv): each test starts with an
// empty cache, so no test can pass or fail because of another one's GETs.
const { cache } = require('../src/config/cache');

beforeEach(() => {
  cache.flushAll();
});

afterAll(() => {
  cache.close(); // stops node-cache's expiry timer
});
