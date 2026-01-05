// routes/google-oauth.js
// Standalone Google OAuth routes for Vercel deployment

const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { log, error } = require('../utils/logger');

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * GET /api/oauth/google
 * Redirect to Google OAuth consent page
 */
router.get('/google', (req, res) => {
  try {
    log('🔵 Google OAuth route called');
    log('🔵 Request URL:', req.url);
    log('🔵 Request method:', req.method);
    log('🔵 Environment check:', {
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasRedirectUri: !!process.env.GOOGLE_REDIRECT_URI,
      redirectUri: process.env.GOOGLE_REDIRECT_URI
    });
    
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      error('❌ Missing OAuth credentials:', {
        GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI: !!process.env.GOOGLE_REDIRECT_URI
      });
      throw new Error('Google OAuth credentials not configured');
    }

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
      prompt: 'consent'
    });
    
    log('✅ OAuth URL generated:', authUrl.substring(0, 100) + '...');
    log('✅ Redirecting to Google');
    res.redirect(authUrl);
  } catch (err) {
    error('❌ OAuth URL generation error:', err);
    error('❌ Error stack:', err.stack);
    res.status(500).json({
      error: 'OAuth Error',
      message: err.message || 'Failed to generate authorization URL',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

/**
 * GET /api/oauth/google/callback
 * Handle Google OAuth callback - create/login user and redirect to dashboard
 */
router.get('/google/callback', async (req, res) => {
  try {
    log('🔵 OAuth callback received');
    const { code } = req.query;

    if (!code) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Authorization Failed</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                .error { background: white; padding: 40px; border-radius: 10px; display: inline-block; }
                h1 { color: #EF4444; }
            </style>
        </head>
        <body>
            <div class="error">
                <h1>❌ Authorization Failed</h1>
                <p>Authorization code missing. Please try again.</p>
                <button onclick="window.location.href='https://networkfollowup.netlify.app/login.html'">Return to Login</button>
            </div>
        </body>
        </html>
      `);
    }

    // Exchange code for tokens
    log('🔵 Exchanging code for tokens');
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      throw new Error('Failed to get tokens from Google');
    }

    // Get user info from Google
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: googleUser } = await oauth2.userinfo.get();
    
    const gmailEmail = googleUser.email;
    const fullName = googleUser.name || googleUser.email.split('@')[0];

    // Calculate token expiry
    const tokenExpiry = tokens.expiry_date 
      ? new Date(tokens.expiry_date) 
      : new Date(Date.now() + 3600 * 1000);

    // Check if user exists
    log('🔵 Checking if user exists:', gmailEmail.toLowerCase());
    const existingUser = await db.query(
      'SELECT * FROM public.users WHERE email = $1',
      [gmailEmail.toLowerCase()]
    );

    let user;
    let isNewUser = false;

    if (existingUser.rows.length > 0) {
      // User exists - login
      user = existingUser.rows[0];
      log('✅ Existing user found:', user.id);
    } else {
      // Create new user
      const crypto = require('crypto');
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      log('🔵 Creating new user:', gmailEmail.toLowerCase());
      const result = await db.query(
        `INSERT INTO public.users (email, password_hash, full_name, subscription_tier, onboarding_completed) 
         VALUES ($1, $2, $3, $4, FALSE) 
         RETURNING id, email, full_name, subscription_tier, onboarding_completed, created_at`,
        [gmailEmail.toLowerCase(), hashedPassword, fullName, 'starter']
      );
      
      user = result.rows[0];
      isNewUser = true;
      log('✅ User created:', user.id);

      // Initialize user preferences
      try {
        await db.query(
          `INSERT INTO public.user_preferences (user_id) VALUES ($1)
           ON CONFLICT (user_id) DO NOTHING`,
          [user.id]
        );
      } catch (prefError) {
        log('⚠️ Could not create user preferences (non-critical):', prefError.message);
      }
    }

    // Save Gmail tokens
    log('🔵 Saving Gmail connection for user:', user.id);
    await db.query(
      `INSERT INTO public.gmail_connections (user_id, gmail_email, access_token, refresh_token, token_expires_at, is_connected)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       ON CONFLICT (user_id) DO UPDATE SET
          gmail_email = EXCLUDED.gmail_email,
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          token_expires_at = EXCLUDED.token_expires_at,
          is_connected = TRUE,
          updated_at = NOW()`,
      [user.id, gmailEmail, tokens.access_token, tokens.refresh_token, tokenExpiry]
    );
    log('✅ Gmail connection saved');

    // Generate JWT token
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Return success page that sets JWT in localStorage and redirects
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Gmail Connected</title>
          <style>
              body {
                  font-family: 'Inter', sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
                  color: white;
              }
              .container {
                  text-align: center;
                  background: white;
                  color: #333;
                  padding: 40px;
                  border-radius: 20px;
                  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                  max-width: 500px;
              }
              .success-icon {
                  font-size: 64px;
                  margin-bottom: 20px;
              }
              h1 {
                  color: #10B981;
                  margin-bottom: 10px;
              }
              p {
                  color: #64748B;
                  margin-bottom: 20px;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="success-icon">✓</div>
              <h1>${isNewUser ? 'Account Created!' : 'Welcome Back!'}</h1>
              <p>${isNewUser ? 'Your account has been created' : 'You have been logged in'} with <strong>${gmailEmail}</strong></p>
              <p>Redirecting to dashboard...</p>
          </div>
          <script>
              const token = ${JSON.stringify(jwtToken)};
              const user = ${JSON.stringify({
                  id: user.id,
                  email: user.email,
                  full_name: user.full_name,
                  subscription_tier: user.subscription_tier || 'starter',
                  onboarding_completed: user.onboarding_completed || false
              })};
              
              localStorage.setItem('authToken', token);
              localStorage.setItem('userName', user.full_name);
              localStorage.setItem('userEmail', user.email);
              localStorage.setItem('userId', user.id);
              localStorage.setItem('onboardingCompleted', user.onboarding_completed ? 'true' : 'false');
              
              setTimeout(() => {
                  // Redirect to onboarding if not completed, otherwise dashboard
                  if (!user.onboarding_completed) {
                      window.location.href = 'https://networkfollowup.netlify.app/onboarding.html';
                  } else {
                      window.location.href = 'https://networkfollowup.netlify.app/dashboard.html';
                  }
              }, 1500);
          </script>
      </body>
      </html>
    `);
  } catch (err) {
    error('❌ OAuth callback error:', err);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Connection Failed</title>
          <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
              .error { background: white; padding: 40px; border-radius: 10px; display: inline-block; }
              h1 { color: #EF4444; }
          </style>
      </head>
      <body>
          <div class="error">
              <h1>❌ Connection Failed</h1>
              <p>${err.message}</p>
              <button onclick="window.location.href='https://networkfollowup.netlify.app/login.html'">Return to Login</button>
          </div>
      </body>
      </html>
    `);
  }
});

module.exports = router;

