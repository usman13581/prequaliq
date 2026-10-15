const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { assertSecurityConfig, resolveCorsOrigin, isProduction } = require('./utils/securityConfig');

// Load environment variables
dotenv.config();
assertSecurityConfig();

const app = express();

// Middleware — production CORS must use FRONTEND_URL only (rule 01)
app.use(cors({
  origin: resolveCorsOrigin(),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Strip internal error details from 5xx JSON bodies in production (rule 01)
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (
      isProduction() &&
      body &&
      typeof body === 'object' &&
      !Array.isArray(body) &&
      res.statusCode >= 500
    ) {
      const sanitized = { ...body };
      delete sanitized.error;
      delete sanitized.stack;
      if (typeof sanitized.message === 'string' && /sequelize|password|token|secret|ECONN|ENOENT/i.test(sanitized.message)) {
        sanitized.message = 'Internal Server Error';
      }
      return originalJson(sanitized);
    }
    return originalJson(body);
  };
  next();
});

// Serve uploaded files — authenticated only (rule 01)
const { requireUploadAccess } = require('./middleware/uploadAccess');
app.use('/uploads', requireUploadAccess, express.static(path.join(__dirname, 'uploads')));

// API documentation (Swagger UI)
app.use('/api-docs', require('./routes/docs'));
app.get('/api/docs', (_req, res) => res.redirect(301, '/api-docs'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/procuring-entity', require('./routes/procuringEntity'));
app.use('/api/supplier', require('./routes/supplier'));
app.use('/api/questionnaires', require('./routes/questionnaires'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/cpv', require('./routes/cpv'));
app.use('/api/nuts', require('./routes/nuts'));
app.use('/api/lookups', require('./routes/lookups'));
app.use('/api/entitlements', require('./routes/entitlements'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/org-invites', require('./routes/orgInvites'));
app.use('/api/procedures', require('./routes/procedures'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/ai-extras', require('./routes/aiExtras'));
app.use('/api/saved-searches', require('./routes/savedSearches'));

// Root - so visiting the URL shows something friendly
app.get('/', (req, res) => {
  res.json({
    message: 'PrequaliQ API',
    status: 'running',
    health: '/api/health',
    docs: '/api-docs',
    gpuAiDocs: process.env.AI_SERVICE_URL ? `${process.env.AI_SERVICE_URL.replace(/\/$/, '')}/docs` : null
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'PrequaliQ API is running' });
});

// Error handling middleware — never expose internals in production (rule 01)
app.use((err, req, res, next) => {
  console.error(err.stack || err);
  const status = err.status || 500;
  const safeMessage =
    status < 500
      ? err.message || 'Request failed'
      : isProduction()
        ? 'Internal Server Error'
        : err.message || 'Internal Server Error';
  res.status(status).json({
    message: safeMessage,
    ...(!isProduction() && err.stack ? { stack: err.stack } : {})
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS origin: ${resolveCorsOrigin()}`);
  console.log(`API docs: http://localhost:${PORT}/api-docs`);
  if (process.env.AI_SERVICE_URL) {
    console.log(`GPU AI docs: ${process.env.AI_SERVICE_URL.replace(/\/$/, '')}/docs`);
  }
  try {
    const { startSupplierExpiryScheduler } = require('./services/supplierExpiryScheduler');
    startSupplierExpiryScheduler();
  } catch (err) {
    console.warn('Supplier expiry scheduler not started:', err.message);
  }
});
