// routes/oauth.js
// Gmail OAuth routes for NetworkFollowUp

const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { log, error } = require('../utils/logger');

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * GET /api/oauth/google/status
 * Check if user has Gmail connected
 */
router.get('/google/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    log('Checking Gmail status for user:', userId);

    // Check both token_expiry and token_expires_at for compatibility
    const result = await db.query(
      `SELECT gmail_email, token_expires_at, token_expiry 
       FROM public.gmail_connections 
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ connected: false, email: null });
    }

    const row = result.rows[0];
    const tokenExpiry = row.token_expires_at || row.token_expiry;
    let expired = false;
    
    if (tokenExpiry) {
      const expiresAt = new Date(tokenExpiry).getTime();
      expired = Number.isFinite(expiresAt) && expiresAt < Date.now();
    }

    return res.json({
      connected: true,
      email: row.gmail_email,
      expired
    });
  } catch (err) {
    error('Gmail status error:', err);
    return res.json({ connected: false, email: null });
  }
});

/**
 * GET /api/oauth/google
 * Initiate OAuth flow with Google
 */
router.get('/google', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    log('Initiating Gmail OAuth for user:', userId);

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      throw new Error('Google OAuth credentials not configured');
    }

    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId.toString(), // Pass userId as state
      prompt: 'consent'
    });

    log('OAuth URL generated, redirecting user');
    res.json({ authUrl });
  } catch (err) {
    error('OAuth initiation error:', err);
    res.status(500).json({
      error: 'OAuth Error',
      message: err.message || 'Failed to generate authorization URL'
    });
  }
});

/**
 * GET /api/oauth/google/callback
 * Handle OAuth callback and save tokens to database
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard.html?gmail=error`);
    }

    const userId = state; // Get userId from state parameter

    log('OAuth callback received for user:', userId);

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      throw new Error('Failed to get tokens from Google');
    }

    // Get user info from Google
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: googleUser } = await oauth2.userinfo.get();
    
    const gmailEmail = googleUser.email;

    // Calculate token expiry
    const tokenExpiresAt = tokens.expiry_date 
      ? new Date(tokens.expiry_date) 
      : new Date(Date.now() + 3600 * 1000);

    // Save Gmail connection to database
    log('Saving Gmail connection for user:', userId);
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
      [userId, gmailEmail, tokens.access_token, tokens.refresh_token, tokenExpiresAt]
    );

    log('Gmail connection saved successfully');
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard.html?gmail=connected`);
  } catch (err) {
    error('OAuth callback error:', err);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard.html?gmail=error`);
  }
});

module.exports = router;




