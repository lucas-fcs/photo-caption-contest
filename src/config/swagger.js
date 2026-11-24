const path = require('path');
const { Router } = require('express');
const swaggerUi = require('swagger-ui-express');

const OPENAPI_PATH = path.join(__dirname, '..', '..', 'docs', 'openapi.yaml');
const SPEC_URL = '/api-docs/openapi.yaml';

const docsRouter = Router();

// The YAML is served as-is and parsed by Swagger UI in the browser,
// so the server needs no YAML parser dependency.
// Registered before swaggerUi.serve, which would otherwise claim this path.
docsRouter.get('/openapi.yaml', (req, res) => {
  res.sendFile(OPENAPI_PATH);
});

docsRouter.use(
  '/',
  swaggerUi.serve,
  swaggerUi.setup(null, {
    customSiteTitle: 'Photo Caption Contest API',
    swaggerOptions: {
      url: SPEC_URL,
      // Keeps the session cookie on "Try it out" calls (same origin).
      withCredentials: true,
    },
  }),
);

module.exports = { docsRouter, OPENAPI_PATH };
