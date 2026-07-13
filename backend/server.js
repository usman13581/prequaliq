const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
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
