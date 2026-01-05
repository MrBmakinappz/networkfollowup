// server.js
// NetworkFollowUp Backend - Complete Server

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { log, error } = require('./utils/logger');

const app = express();

// Trust proxy (important for Vercel)
app.set('trust proxy', 1);

const PORT = process.env.PORT || 5000;

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet for security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false // Allow external resources
}));

// Trust proxy (important for Vercel)
app.set('trust proxy', 1);

// CORS configuration
app.use(cors({
  origin: [
    'https://networkfollowup.netlify.app',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ============================================
// RATE LIMITING
// ============================================

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: 'Too many requests',
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        success: false,
        error: 'Too many login attempts',
        message: 'Too many login attempts, please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Don't count successful requests
});

// Strict rate limiter for email sending
const emailLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Limit each IP to 50 email sends per hour
    message: {
        success: false,
        error: 'Email rate limit exceeded',
        message: 'Too many emails sent, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/emails/send', emailLimiter);
app.use('/api/emails/send-batch', emailLimiter);

// ============================================
// BODY PARSING & VALIDATION
// ============================================

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize all inputs (XSS prevention)
const { sanitizeBody } = require('./middleware/validation');
app.use(sanitizeBody);

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
log('✅ Auth routes loaded');

// OAuth routes (MUST be registered FIRST for Vercel routing)
const googleOAuthRoutes = require('./routes/google-oauth');
const gmailOAuthRoutes = require('./routes/gmail-oauth');
log('✅ OAuth routes loaded');

// Register OAuth routes FIRST (before other routes)
app.use('/api/oauth', googleOAuthRoutes);
app.use('/api/oauth/gmail', gmailOAuthRoutes);
app.use('/api/auth', authRoutes);
log('✅ Routes registered: /api/auth, /api/oauth');

// Onboarding middleware
const checkOnboarding = require('./middleware/onboarding');

// Protected routes (auth + onboarding required)
const uploadsRoutes = require('./routes/uploads');
const customersRoutes = require('./routes/customers');
const emailsRoutes = require('./routes/emails');
const statsRoutes = require('./routes/stats');
const billingRoutes = require('./routes/billing');

app.use('/api/uploads', authMiddleware, checkOnboarding, uploadsRoutes);
app.use('/api/customers', authMiddleware, checkOnboarding, customersRoutes);
app.use('/api/emails', authMiddleware, checkOnboarding, emailsRoutes);
app.use('/api/users', authMiddleware, checkOnboarding, statsRoutes);
app.use('/api/billing', authMiddleware, checkOnboarding, billingRoutes);

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
  error('Error:', err);

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

// Seed email templates on startup
const { seedTemplates } = require('./utils/seed-templates');

app.listen(PORT, async () => {
  log(`
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
  
  // Seed email templates after server starts (non-critical)
  try {
    await seedTemplates();
    log('✅ Email templates seeded successfully');
  } catch (err) {
    error('Template seeding failed (non-critical):', err.message);
    // Continue anyway - app still works without templates
    // Templates can be seeded manually later if needed
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
