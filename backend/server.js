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

// Wrap entire server startup in try-catch to prevent crashes
try {
  require('dotenv').config();
  console.log('✅ dotenv loaded');
} catch (err) {
  console.error('⚠️ dotenv load error (non-fatal):', err.message);
}

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

const PORT = process.env.PORT || 8080;
console.log(`✅ PORT set to: ${PORT}`);

// ============================================
// HEALTH CHECK ROUTES (MUST BE FIRST - BEFORE ANY MIDDLEWARE)
// ============================================
// Railway health checks hit /health - must respond INSTANTLY (< 1 second)
// NO middleware, NO database, NO logging - just return JSON

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'NetworkFollowUp API',
    status: 'running',
    version: '1.0.0'
  });
});

console.log('✅ Health endpoints registered (before middleware)');

// Trust proxy (important for Railway/Vercel)
app.set('trust proxy', 1);

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
let authMiddleware;
try {
  authMiddleware = require('./middleware/auth');
  console.log('✅ Auth middleware loaded');
} catch (err) {
  console.error('❌ Failed to load auth middleware:', err.message);
  // Create a dummy middleware that rejects all requests
  authMiddleware = (req, res, next) => {
    res.status(500).json({ error: 'Auth middleware not available' });
  };
}

// Public routes (no auth required)
console.log('🔵 Loading auth routes...');
let authRoutes;
try {
  authRoutes = require('./routes/auth');
  console.log('✅ Auth routes loaded');
  app.use('/api/auth', authRoutes);
  console.log('✅ /api/auth registered');
} catch (err) {
  console.error('❌ Failed to load auth routes:', err.message);
}

// OAuth routes (MUST be registered FIRST for Vercel routing)
console.log('🔵 Loading OAuth routes...');
let googleOAuthRoutes, gmailOAuthRoutes;
try {
  googleOAuthRoutes = require('./routes/google-oauth');
  console.log('✅ Google OAuth routes loaded');
  app.use('/api/oauth', googleOAuthRoutes);
  console.log('✅ /api/oauth registered');
} catch (err) {
  console.error('⚠️ Google OAuth routes not available:', err.message);
}

try {
  gmailOAuthRoutes = require('./routes/gmail-oauth');
  console.log('✅ Gmail OAuth routes loaded');
  app.use('/api/oauth/gmail', gmailOAuthRoutes);
  console.log('✅ /api/oauth/gmail registered');
} catch (err) {
  console.error('⚠️ Gmail OAuth routes not available:', err.message);
}

// Onboarding middleware
console.log('🔵 Loading onboarding middleware...');
let checkOnboarding;
try {
  checkOnboarding = require('./middleware/onboarding');
  console.log('✅ Onboarding middleware loaded');
} catch (err) {
  console.error('❌ Failed to load onboarding middleware:', err.message);
  // Create a dummy middleware that allows all requests
  checkOnboarding = (req, res, next) => next();
}

// Protected routes (auth + onboarding required)
console.log('🔵 Loading protected routes...');

let uploadsRoutes, customersRoutes, emailsRoutes, statsRoutes, billingRoutes, templateRoutes;

try {
  uploadsRoutes = require('./routes/uploads');
  console.log('✅ Uploads routes loaded');
  app.use('/api/uploads', authMiddleware, checkOnboarding, uploadsRoutes);
  console.log('✅ /api/uploads registered');
} catch (err) {
  console.error('❌ Failed to load uploads routes:', err.message);
}

try {
  customersRoutes = require('./routes/customers');
  console.log('✅ Customers routes loaded');
  app.use('/api/customers', authMiddleware, checkOnboarding, customersRoutes);
  console.log('✅ /api/customers registered');
} catch (err) {
  console.error('❌ Failed to load customers routes:', err.message);
}

try {
  emailsRoutes = require('./routes/emails');
  console.log('✅ Emails routes loaded');
  app.use('/api/emails', authMiddleware, checkOnboarding, emailsRoutes);
  console.log('✅ /api/emails registered');
} catch (err) {
  console.error('❌ Failed to load emails routes:', err.message);
}

try {
  statsRoutes = require('./routes/stats');
  console.log('✅ Stats routes loaded');
  app.use('/api/users', authMiddleware, checkOnboarding, statsRoutes);
  console.log('✅ /api/users registered');
} catch (err) {
  console.error('❌ Failed to load stats routes:', err.message);
}

try {
  billingRoutes = require('./routes/billing');
  console.log('✅ Billing routes loaded');
  
  // BUG 4: Register webhook routes WITHOUT auth (Stripe webhooks don't use auth)
  // Create a separate router for webhook that doesn't require auth
  const webhookRouter = express.Router();
  webhookRouter.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    // Import webhook handler directly
    const { verifyWebhookSignature } = require('./utils/stripe');
    const db = require('./config/database');
    const { log, error } = require('./utils/logger');
    const { getSubscription } = require('./utils/stripe');
    
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }
    
    try {
      const event = verifyWebhookSignature(req.body, signature);
      log('Stripe webhook event:', event.type);
      
      // Handle events (same logic as in billing.js)
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const userId = session.client_reference_id || session.metadata.userId;
          const customerId = session.customer;
          const subscriptionId = session.subscription;
          
          if (subscriptionId) {
            const subscription = await getSubscription(subscriptionId);
            const priceId = subscription.items?.data?.[0]?.price?.id;
            let plan = 'free';
            if (priceId === process.env.STRIPE_STARTER_PRICE_ID) plan = 'starter';
            else if (priceId === process.env.STRIPE_PRO_PRICE_ID) plan = 'pro';
            else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) plan = 'enterprise';
            
            await db.query(
              `INSERT INTO public.stripe_customers (user_id, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_start, current_period_end)
               VALUES ($1, $2, $3, $4, to_timestamp($5), to_timestamp($6))
               ON CONFLICT (user_id) DO UPDATE SET
                 stripe_subscription_id = EXCLUDED.stripe_subscription_id,
                 subscription_status = EXCLUDED.subscription_status,
                 current_period_start = EXCLUDED.current_period_start,
                 current_period_end = EXCLUDED.current_period_end,
                 updated_at = NOW()`,
              [userId, customerId, subscriptionId, subscription.status, subscription.current_period_start, subscription.current_period_end]
            );
            
            await db.query(
              `UPDATE public.users 
               SET subscription_tier = $1,
                   subscription_expires_at = to_timestamp($2),
                   updated_at = NOW()
               WHERE id = $3`,
              [plan, subscription.current_period_end, userId]
            );
            
            log(`User ${userId} upgraded to ${plan}`);
          }
          break;
        }
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object;
          const subscriptionId = invoice.subscription;
          if (subscriptionId) {
            const subscription = await getSubscription(subscriptionId);
            const customerId = subscription.customer;
            const result = await db.query(
              'SELECT user_id FROM public.stripe_customers WHERE stripe_customer_id = $1',
              [customerId]
            );
            if (result.rows.length > 0) {
              const userId = result.rows[0].user_id;
              const priceId = subscription.items?.data?.[0]?.price?.id;
              let plan = 'free';
              if (priceId === process.env.STRIPE_STARTER_PRICE_ID) plan = 'starter';
              else if (priceId === process.env.STRIPE_PRO_PRICE_ID) plan = 'pro';
              else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) plan = 'enterprise';
              
              await db.query(
                `UPDATE public.users 
                 SET subscription_tier = $1,
                     subscription_expires_at = to_timestamp($2)
                 WHERE id = $3`,
                [plan, subscription.current_period_end, userId]
              );
              log(`Payment succeeded for user ${userId}, plan: ${plan}`);
            }
          }
          break;
        }
      }
      
      res.json({ received: true });
    } catch (err) {
      error('Webhook error:', err);
      res.status(400).json({ error: 'Webhook error', message: err.message });
    }
  });
  
  app.use('/api/stripe', webhookRouter);
  app.use('/api/billing', webhookRouter);
  console.log('✅ Stripe webhook routes registered (no auth)');
  
  // Other billing routes require auth
  app.use('/api/billing', authMiddleware, checkOnboarding, billingRoutes);
  app.use('/api/stripe', authMiddleware, checkOnboarding, billingRoutes);
  console.log('✅ /api/billing and /api/stripe registered');
} catch (err) {
  console.error('❌ Failed to load billing routes:', err.message);
}

try {
  templateRoutes = require('./routes/templates');
  console.log('✅ Templates routes loaded');
  app.use('/api/templates', authMiddleware, templateRoutes);
  console.log('✅ /api/templates registered');
} catch (err) {
  console.error('❌ Failed to load templates routes:', err.message);
  console.error('   Error details:', err.stack);
}

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
  // CRITICAL: Bind to '0.0.0.0' for Railway (not localhost)
  // Railway needs the server to listen on all interfaces
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅✅✅ SERVER READY ON PORT ${PORT} ✅✅✅`);
    console.log(`✅ Server bound to 0.0.0.0:${PORT} (accessible from Railway)`);
    console.log(`✅ Health check: http://0.0.0.0:${PORT}/health`);
    console.log(`✅ Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log('✅ Server is ready to accept connections');
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
