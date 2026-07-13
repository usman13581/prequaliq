const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { buildOpenApiSpec, GPU_DOCS_URL } = require('../openapi/spec');

const router = express.Router();

function resolveServerUrl(req) {
  if (process.env.API_PUBLIC_URL) {
    return process.env.API_PUBLIC_URL.replace(/\/$/, '');
  }
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('x-forwarded-host') || req.get('host');
  return `${proto}://${host}`;
}

router.get('/openapi.json', (req, res) => {
  res.json(buildOpenApiSpec(resolveServerUrl(req)));
});

const swaggerOptions = {
  customSiteTitle: 'PrequaliQ API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
  },
};

router.use('/', swaggerUi.serve);
router.get('/', (req, res, next) => {
  const spec = buildOpenApiSpec(resolveServerUrl(req));
  swaggerUi.setup(spec, swaggerOptions)(req, res, next);
});

router.get('/info', (_req, res) => {
  res.json({
    title: 'PrequaliQ API Documentation',
    swaggerUi: '/api-docs',
    openApiJson: '/api-docs/openapi.json',
    gpuAiDocs: GPU_DOCS_URL,
    gpuAiRedoc: GPU_DOCS_URL ? GPU_DOCS_URL.replace(/\/docs$/, '/redoc') : null,
  });
});

module.exports = router;
