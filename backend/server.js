// server.js
// NetworkFollowUp Backend - Complete Server

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Trust proxy (important for Vercel)
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

// CORS configuration
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Auth middleware
const authMiddleware = require('./middleware/auth');

// Public routes (no auth required)
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Protected routes (auth required)
const uploadsRoutes = require('./routes/uploads');
const customersRoutes = require('./routes/customers');
const emailsRoutes = require('./routes/emails');
const statsRoutes = require('./routes/stats');
const billingRoutes = require('./routes/billing');

app.use('/api/uploads', authMiddleware, uploadsRoutes);
app.use('/api/customers', authMiddleware, customersRoutes);
app.use('/api/emails', authMiddleware, emailsRoutes);
app.use('/api/users', authMiddleware, statsRoutes);
app.use('/api/billing', authMiddleware, billingRoutes);

// ============================================
// API INFO ENDPOINT
// ============================================

app.get('/api', (req, res) => {
  res.json({
    message: 'NetworkFollowUp API',
    version: '1.0.0',
    endpoints: {
      public: [
        'POST /api/auth/signup',
        'POST /api/auth/login',
        'GET /health'
      ],
      protected: [
        'POST /api/uploads/extract',
        'GET /api/uploads/history',
        'GET /api/customers',
        'GET /api/customers/stats',
        'POST /api/customers',
        'PUT /api/customers/:id',
        'DELETE /api/customers/:id',
        'GET /api/emails/gmail-auth',
        'POST /api/emails/connect-gmail',
        'GET /api/emails/gmail-status',
        'POST /api/emails/send-batch',
        'GET /api/emails/history',
        'GET /api/users/stats',
        'GET /api/users/billing',
        'POST /api/billing/create-checkout',
        'POST /api/billing/portal'
      ]
    },
    documentation: 'https://networkfollowup.netlify.app/docs'
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: '/api'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large',
      message: 'Maximum file size is 10MB'
    });
  }

  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({
      error: 'Invalid file type',
      message: 'Only JPEG, PNG, and WebP images are allowed'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Authentication failed'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      message: 'Please log in again'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║      🌿 NetworkFollowUp API Server                      ║
║                                                          ║
║      Status: Running ✓                                   ║
║      Port: ${PORT}                                       ║
║      Environment: ${process.env.NODE_ENV || 'development'}                            ║
║                                                          ║
║      Endpoints: http://localhost:${PORT}/api             ║
║      Health: http://localhost:${PORT}/health             ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
