// routes/gmail-oauth.js
// Separate Gmail OAuth routes for onboarding (Step 6)
// This is DIFFERENT from login OAuth - this only connects Gmail

const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { log, error } = require('../utils/logger');

// Initialize OAuth2 client for Gmail connection
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI || `${process.env.BACKEND_URL || 'https://networkfollowup-backend-hm12cqp9v-brondors-projects.vercel.app'}/api/oauth/gmail/callback`
);

/**
 * GET /api/oauth/gmail/connect
 * Start Gmail OAuth flow for connecting Gmail (onboarding step 6)
 * Requires authentication (user must be logged in)
 */
router.get('/connect', authMiddleware, (req, res) => {
  try {
    log('🔵 Gmail OAuth connect route called for user:', req.user.userId);
    
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth credentials not configured');
    }

    // Include user ID in state for callback
    const state = Buffer.from(JSON.stringify({ userId: req.user.userId })).toString('base64');

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      prompt: 'consent',
      state: state
    });
    
    log('✅ Gmail OAuth URL generated, redirecting to Google');
    res.redirect(authUrl);
  } catch (err) {
    error('❌ Gmail OAuth URL generation error:', err);
    res.status(500).json({
      error: 'OAuth Error',
      message: err.message || 'Failed to generate authorization URL'
    });
  }
});

/**
 * GET /api/oauth/gmail/callback
 * Handle Gmail OAuth callback - save tokens to gmail_connections
 */
router.get('/callback', async (req, res) => {
  try {
    log('🔵 Gmail OAuth callback received');
    const { code, state } = req.query;

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
                <button onclick="window.location.href='${process.env.FRONTEND_URL || 'https://networkfollowup.netlify.app'}/onboarding.html'">Return to Onboarding</button>
            </div>
        </body>
        </html>
      `);
    }

    // Decode state to get userId
    let userId;
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      userId = stateData.userId;
    } catch (stateError) {
      error('Failed to decode state:', stateError);
      // Fallback: try to get from session or require re-auth
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1 style="color: #EF4444;">Authorization Failed</h1>
            <p>Invalid state parameter. Please try connecting Gmail again.</p>
            <button onclick="window.location.href='${process.env.FRONTEND_URL || 'https://networkfollowup.netlify.app'}/onboarding.html'">Return to Onboarding</button>
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

    // Get Gmail email address
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: googleUser } = await oauth2.userinfo.get();
    const gmailEmail = googleUser.email;

    // Calculate token expiry
    const tokenExpiry = tokens.expiry_date 
      ? new Date(tokens.expiry_date) 
      : new Date(Date.now() + 3600 * 1000);

    // Save Gmail tokens to database
    log('🔵 Saving Gmail connection for user:', userId);
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
      [userId, gmailEmail, tokens.access_token, tokens.refresh_token, tokenExpiry]
    );
    log('✅ Gmail connection saved');

    // Return success page
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
              <h1>Gmail Connected!</h1>
              <p>Your Gmail account <strong>${gmailEmail}</strong> has been connected successfully.</p>
              <p>You can now close this window and continue with onboarding.</p>
          </div>
          <script>
              // Notify parent window if opened in popup
              if (window.opener) {
                  window.opener.postMessage({
                      type: 'gmail-connected',
                      email: '${gmailEmail}'
                  }, '*');
                  setTimeout(() => window.close(), 2000);
              } else {
                  // If not popup, redirect after 2 seconds
                  setTimeout(() => {
                      window.location.href = '${process.env.FRONTEND_URL || 'https://networkfollowup.netlify.app'}/onboarding.html';
                  }, 2000);
              }
          </script>
      </body>
      </html>
    `);
  } catch (err) {
    error('❌ Gmail OAuth callback error:', err);
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
              <button onclick="window.location.href='${process.env.FRONTEND_URL || 'https://networkfollowup.netlify.app'}/onboarding.html'">Return to Onboarding</button>
          </div>
      </body>
      </html>
    `);
  }
});

module.exports = router;








