// server.js
// NetworkFollowUp Backend - Complete Server

// Global error handlers - MUST be at the very top
// These catch errors but DON'T exit - Railway needs the process to stay alive
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise);
  console.error('Reason:', reason);
  console.error('Stack:', reason?.stack || 'No stack trace');
  // DON'T exit - let server continue running
  // Railway will restart if needed, but we want to stay alive
});

process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
  console.error('Stack:', err.stack);
  // DON'T exit - let server continue running
  // Log the error but keep the process alive for Railway
});

console.log('🔵 Starting server...');
console.log('🔵 NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('🔵 PORT:', process.env.PORT || 'not set');

require('dotenv').config();
console.log('✅ dotenv loaded');

const express = require('express');
console.log('✅ express loaded');
const cors = require('cors');
console.log('✅ cors loaded');
const helmet = require('helmet');
console.log('✅ helmet loaded');
const rateLimit = require('express-rate-limit');
console.log('✅ express-rate-limit loaded');
const { log, error } = require('./utils/logger');
console.log('✅ logger loaded');

const app = express();
console.log('✅ Express app created');

// Trust proxy (important for Vercel)
app.set('trust proxy', 1);

const PORT = process.env.PORT || 5000;

// ============================================
// HEALTH CHECK ROUTES (MUST BE FIRST)
// ============================================
// These routes must be BEFORE any middleware for Railway health checks

// Health check for Railway - MUST respond quickly (no logging to reduce noise)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Root route for Railway - MUST respond quickly (no logging to reduce noise)
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'NetworkFollowUp API',
    status: 'running',
    version: '1.0.0'
  });
});

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

// Health check moved to top of file (before middleware)
// See health check routes above (lines 43-65)

// Auth middleware
console.log('🔵 Loading auth middleware...');
const authMiddleware = require('./middleware/auth');
console.log('✅ Auth middleware loaded');

// Public routes (no auth required)
console.log('🔵 Loading auth routes...');
const authRoutes = require('./routes/auth');
console.log('✅ Auth routes loaded');

// OAuth routes (MUST be registered FIRST for Vercel routing)
console.log('🔵 Loading OAuth routes...');
const googleOAuthRoutes = require('./routes/google-oauth');
console.log('✅ Google OAuth routes loaded');
const gmailOAuthRoutes = require('./routes/gmail-oauth');
console.log('✅ Gmail OAuth routes loaded');

// Register OAuth routes FIRST (before other routes)
console.log('🔵 Registering OAuth routes...');
app.use('/api/oauth', googleOAuthRoutes);
console.log('✅ /api/oauth registered');
app.use('/api/oauth/gmail', gmailOAuthRoutes);
console.log('✅ /api/oauth/gmail registered');
app.use('/api/auth', authRoutes);
console.log('✅ /api/auth registered');

// Onboarding middleware
console.log('🔵 Loading onboarding middleware...');
const checkOnboarding = require('./middleware/onboarding');
console.log('✅ Onboarding middleware loaded');

// Protected routes (auth + onboarding required)
console.log('🔵 Loading protected routes...');
const uploadsRoutes = require('./routes/uploads');
console.log('✅ Uploads routes loaded');
const customersRoutes = require('./routes/customers');
console.log('✅ Customers routes loaded');
const emailsRoutes = require('./routes/emails');
console.log('✅ Emails routes loaded');
const statsRoutes = require('./routes/stats');
console.log('✅ Stats routes loaded');
const billingRoutes = require('./routes/billing');
console.log('✅ Billing routes loaded');
const templateRoutes = require('./routes/templates');
console.log('✅ Templates routes loaded');

console.log('🔵 Registering protected routes...');
app.use('/api/uploads', authMiddleware, checkOnboarding, uploadsRoutes);
console.log('✅ /api/uploads registered');
app.use('/api/customers', authMiddleware, checkOnboarding, customersRoutes);
console.log('✅ /api/customers registered');
app.use('/api/emails', authMiddleware, checkOnboarding, emailsRoutes);
console.log('✅ /api/emails registered');
app.use('/api/users', authMiddleware, checkOnboarding, statsRoutes);
console.log('✅ /api/users registered');
app.use('/api/billing', authMiddleware, checkOnboarding, billingRoutes);
console.log('✅ /api/billing registered');
app.use('/api/templates', authMiddleware, templateRoutes);
console.log('✅ /api/templates registered');

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

// Seed email templates on startup - DISABLED
// Templates can be added manually via SQL if needed
// const { seedTemplates } = require('./utils/seed-templates');

console.log('🔵 Starting server on port', PORT);
console.log('🔵 About to call app.listen()...');

let server;

try {
  server = app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ Health check available at: http://localhost:${PORT}/health`);
    console.log(`✅ Root endpoint available at: http://localhost:${PORT}/`);
    console.log(`✅ Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log('✅ Server is ready to accept connections');
    console.log('✅ Server will stay running - Railway health checks will keep it alive');
  });
  
  // Handle server errors - don't exit on server errors
  server.on('error', (err) => {
    console.error('❌ Server error:', err);
    console.error('Stack:', err.stack);
    // Don't exit - let Railway handle restarts if needed
  });
  
  console.log('🔵 app.listen() called, waiting for callback...');
} catch (err) {
  console.error('❌ Failed to start server:', err);
  console.error('Stack:', err.stack);
  // Only exit if server fails to start
  process.exit(1);
}

// Graceful shutdown handlers
// Railway sends SIGTERM when stopping containers - this is normal
process.on('SIGTERM', () => {
  console.log('🔵 SIGTERM received, shutting down gracefully...');
  console.log('This is normal when Railway stops the container');
  if (server) {
    server.close(() => {
      console.log('✅ Server closed gracefully');
      process.exit(0);
    });
    // Force exit after 10 seconds if server doesn't close
    setTimeout(() => {
      console.log('⚠️ Forcing exit after timeout');
      process.exit(0);
    }, 10000);
  } else {
    console.log('⚠️ Server not initialized, exiting immediately');
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('🔵 SIGINT received, shutting down gracefully...');
  if (server) {
    server.close(() => {
      console.log('✅ Server closed gracefully');
      process.exit(0);
    });
    // Force exit after 10 seconds if server doesn't close
    setTimeout(() => {
      console.log('⚠️ Forcing exit after timeout');
      process.exit(0);
    }, 10000);
  } else {
    console.log('⚠️ Server not initialized, exiting immediately');
    process.exit(0);
  }
});

module.exports = app;
