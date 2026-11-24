const fs = require('fs');
const request = require('supertest');
const app = require('../src/app');
const apiRoutes = require('../src/routes');
const { OPENAPI_PATH } = require('../src/config/swagger');
const { closeDatabase } = require('./helpers/db');

afterAll(closeDatabase);

// Operations ("GET /images/{id}") declared under `paths:` in openapi.yaml.
// A line-based reader is enough for our own consistently indented file,
// and avoids a YAML parser dependency.
function documentedOperations() {
  const lines = fs.readFileSync(OPENAPI_PATH, 'utf8').split(/\r?\n/);
  const operations = new Set();
  let inPaths = false;
  let currentPath = null;

  for (const line of lines) {
    if (/^paths:\s*$/.test(line)) {
      inPaths = true;
      continue;
    }
    if (inPaths && /^\S/.test(line)) inPaths = false;
    if (!inPaths) continue;

    const pathMatch = line.match(/^ {2}(\/\S*):\s*$/);
    if (pathMatch) {
      [, currentPath] = pathMatch;
      continue;
    }
    const methodMatch = line.match(/^ {4}(get|post|put|patch|delete):\s*$/);
    if (methodMatch && currentPath) operations.add(`${methodMatch[1].toUpperCase()} ${currentPath}`);
  }
  return operations;
}

// Operations actually registered in Express, in OpenAPI notation (:id -> {id}).
function expressOperations() {
  const operations = [];
  for (const { path: mountPath, router } of apiRoutes) {
    for (const layer of router.stack) {
      if (!layer.route) continue;
      const routePath = layer.route.path === '/' ? '' : layer.route.path;
      const fullPath = `${mountPath}${routePath}`.replace(/:(\w+)/g, '{$1}');
      for (const method of Object.keys(layer.route.methods)) {
        operations.push(`${method.toUpperCase()} ${fullPath}`);
      }
    }
  }
  return operations;
}

describe('OpenAPI document vs. Express routes', () => {
  it('finds the routes on both sides (guards against a vacuous pass)', () => {
    expect(expressOperations().length).toBeGreaterThanOrEqual(8);
    expect(documentedOperations().size).toBeGreaterThanOrEqual(9);
  });

  it('documents every Express route', () => {
    const documented = documentedOperations();
    const undocumented = expressOperations().filter((op) => !documented.has(op));

    expect(undocumented).toEqual([]);
  });

  it('documents no route that does not exist (static files aside)', () => {
    const registered = new Set(expressOperations());
    const phantom = [...documentedOperations()]
      .filter((op) => !op.includes(' /static/'))
      .filter((op) => !registered.has(op));

    expect(phantom).toEqual([]);
  });
});

describe('GET /api-docs', () => {
  it('serves the Swagger UI page', async () => {
    const res = await request(app).get('/api-docs/');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toMatch(/swagger-ui/i);
  });

  it('points Swagger UI at the served YAML', async () => {
    const res = await request(app).get('/api-docs/swagger-ui-init.js');

    expect(res.status).toBe(200);
    expect(res.text).toContain('/api-docs/openapi.yaml');
  });

  it('serves the OpenAPI document as YAML', async () => {
    const res = await request(app).get('/api-docs/openapi.yaml');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/yaml/);
    expect(res.text).toMatch(/^openapi: 3\.0\.3/);
  });

  it('does not create a session for documentation visitors', async () => {
    const res = await request(app).get('/api-docs/');

    expect(res.headers['set-cookie']).toBeUndefined();
  });
});
