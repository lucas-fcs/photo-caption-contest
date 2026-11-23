const request = require('supertest');
const app = require('../../src/app');
const { DEMO_USER } = require('../../src/db/seeders/20261121130100-demo-user');

// Returns a Supertest agent logged in as the given user. An agent keeps
// cookies between requests, like a browser, so the session travels along.
async function loginAs({ email, password } = DEMO_USER) {
  const agent = request.agent(app);
  const res = await agent.post('/auth/login').send({ email, password });

  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return agent;
}

module.exports = { loginAs };
