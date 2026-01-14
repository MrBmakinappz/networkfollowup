// routes/oauth.js
// Gmail OAuth routes

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { authenticateToken } = require('../middleware/auth');
const { log, error, warn } = require('../utils/logger');
const {
    getAuthUrl,
    getTokensFromCode,
    getGmailAddress,
    getGoogleUserInfo,
    refreshAccessToken
} = require('../utils/gmail');

/**
 * GET /api/oauth/google
 * Generate Google auth URL and redirect user directly to Google consent page
 */
router.get('/google', (req, res) => {
    log('🔵 OAuth route /google called');
    
    try {
        log('🔵 Generating Google OAuth URL...');
        // Generate Google OAuth URL
        const authUrl = getAuthUrl();
        log('✅ OAuth URL generated');
        
        // Redirect directly to Google consent page
        log('🔵 Redirecting to Google...');
        res.redirect(authUrl);
    } catch (err) {
        error('❌ OAuth URL generation error:', err);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>OAuth Error</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                    .error { background: white; padding: 40px; border-radius: 10px; display: inline-block; }
                    h1 { color: #EF4444; }
                </style>
            </head>
            <body>
                <div class="error">
                    <h1>❌ OAuth Error</h1>
                    <p>Failed to generate authorization URL: ${err.message}</p>
                    <button onclick="window.location.href='https://networkfollowup.netlify.app/login.html'">Return to Login</button>
                </div>
            </body>
            </html>
        `);
    }
});

/**
 * GET /api/oauth/google/callback
 * Exchange code for tokens, save to DB, create JWT session, redirect to dashboard
 */
router.get('/google/callback', async (req, res) => {
    try {
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
                        <button onclick="window.close()">Close</button>
                    </div>
                </body>
                </html>
            `);
        }

        // Exchange code for tokens
        const tokens = await getTokensFromCode(code);
        
        if (!tokens.access_token || !tokens.refresh_token) {
            throw new Error('Failed to get tokens from Google');
        }

        // Get full user info from Google
        const googleUser = await getGoogleUserInfo(tokens.access_token);
        const gmailEmail = googleUser.email;
        const fullName = googleUser.name;

        // Calculate token expiry
        const tokenExpiry = tokens.expiry_date 
            ? new Date(tokens.expiry_date) 
            : new Date(Date.now() + 3600 * 1000); // Default 1 hour

        // Check if user exists by email
        // Simple query - no tenant logic, uses public schema
        log('🔵 Checking if user exists:', gmailEmail.toLowerCase());
        let existingUser;
        try {
            existingUser = await db.query(
                'SELECT * FROM public.users WHERE email = $1',
                [gmailEmail.toLowerCase()]
            );
            log('🔵 User lookup result:', existingUser.rows.length > 0 ? 'Found' : 'Not found');
        } catch (dbError) {
            error('❌ Database error checking user:', dbError.message);
            error('❌ Error code:', dbError.code);
            throw new Error(`Database error: ${dbError.message}`);
        }

        let user;
        let isNewUser = false;

        if (existingUser.rows.length > 0) {
            // User exists - login
            user = existingUser.rows[0];
            log('✅ Existing user found:', user.id);
        } else {
            // User doesn't exist - create account
            // Generate a random password (user can reset later if needed)
            const crypto = require('crypto');
            const randomPassword = crypto.randomBytes(16).toString('hex');
            const hashedPassword = await bcrypt.hash(randomPassword, 10);

            // Create new user - simple query, no tenant logic
            log('🔵 Creating new user:', gmailEmail.toLowerCase());
            let result;
            try {
                result = await db.query(
                    `INSERT INTO public.users (email, password_hash, full_name, subscription_tier) 
                     VALUES ($1, $2, $3, $4) 
                     RETURNING id, email, full_name, subscription_tier, created_at`,
                    [gmailEmail.toLowerCase(), hashedPassword, fullName, 'starter']
                );
                log('✅ User created:', result.rows[0].id);
            } catch (dbError) {
                error('❌ Database error creating user:', dbError.message);
                error('❌ Error code:', dbError.code);
                throw new Error(`Failed to create user: ${dbError.message}`);
            }

            user = result.rows[0];
            isNewUser = true;

            // Initialize user preferences - simple query
            try {
                await db.query(
                    `INSERT INTO public.user_preferences (user_id) VALUES ($1)
                     ON CONFLICT (user_id) DO NOTHING`,
                    [user.id]
                );
            } catch (prefError) {
                warn('⚠️ Could not create user preferences (non-critical):', prefError.message);
                // Non-critical, continue
            }
        }

        // Save Gmail tokens to gmail_connections - simple query
        log('🔵 Saving Gmail connection for user:', user.id);
        try {
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
        } catch (dbError) {
            error('❌ Database error saving Gmail connection:', dbError.message);
            error('❌ Error code:', dbError.code);
            throw new Error(`Failed to save Gmail connection: ${dbError.message}`);
        }

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
                        font-family: 'Manrope', sans-serif;
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
                    button {
                        background: linear-gradient(135deg, #10B981 0%, #059669 100%);
                        color: white;
                        border: none;
                        padding: 12px 32px;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        margin: 8px;
                    }
                    button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
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
                    // Save JWT token and user info to localStorage
                    const token = ${JSON.stringify(jwtToken)};
                    const user = ${JSON.stringify({
                        id: user.id,
                        email: user.email,
                        full_name: user.full_name,
                        subscription_tier: user.subscription_tier || user.subscription_plan || 'starter'
                    })};
                    
                    localStorage.setItem('authToken', token);
                    localStorage.setItem('userName', user.full_name);
                    localStorage.setItem('userEmail', user.email);
                    localStorage.setItem('userId', user.id);
                    
                    // Redirect to dashboard
                    setTimeout(() => {
                        // Detect production vs development
                        const isProduction = window.location.hostname.includes('vercel.app') || 
                                            window.location.hostname.includes('netlify.app');
                        
                        if (isProduction) {
                            // Production: redirect to Netlify frontend
                            window.location.href = 'https://networkfollowup.netlify.app/dashboard.html';
                        } else {
                            // Development: redirect to localhost
                            window.location.href = 'http://localhost:3000/dashboard.html';
                        }
                    }, 1500);
                    
                    // If opened in popup, close after redirect
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'google-signin-success',
                            token: token,
                            user: user
                        }, '*');
                        setTimeout(() => window.close(), 2000);
                    }
                </script>
            </body>
            </html>
        `);
    } catch (err) {
        error('OAuth callback error:', err);
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
                    <button onclick="window.location.href='https://networkfollowup.netlify.app/dashboard.html'">Return to Dashboard</button>
                </div>
            </body>
            </html>
        `);
    }
});

/**
 * Helper: Auto-refresh expired tokens
 * This is called automatically by createGmailTransporter in gmail.js
 * But we can also expose it as an endpoint if needed
 */
router.post('/google/refresh', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token required'
            });
        }

        const newTokens = await refreshAccessToken(refresh_token);

        // Update in database
        await db.query(
            `UPDATE gmail_connections 
             SET access_token = $1, 
                 token_expires_at = $2,
                 updated_at = NOW()
             WHERE user_id = $3`,
            [
                newTokens.access_token,
                newTokens.expiry_date ? new Date(newTokens.expiry_date) : new Date(Date.now() + 3600 * 1000),
                userId
            ]
        );

        res.json({
            success: true,
            data: {
                access_token: newTokens.access_token,
                expiry_date: newTokens.expiry_date
            }
        });
    } catch (err) {
        error('Token refresh error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to refresh token',
            message: err.message
        });
    }
});

/**
 * BUG 4: Gmail connection status
 *
 * GET /api/oauth/google/status
 * Return whether the current authenticated user has a Gmail connection.
 *
 * Response shape matches frontend expectations:
 * { connected: boolean, email?: string }
 */
router.get('/google/status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await db.query(
            'SELECT gmail_email FROM public.gmail_connections WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                connected: false
            });
        }

        return res.json({
            success: true,
            connected: true,
            email: result.rows[0].gmail_email
        });
    } catch (err) {
        error('Google status error:', err);
        return res.status(500).json({
            success: false,
            connected: false,
            error: 'Failed to check Gmail connection status',
            message: err.message
        });
    }
});

module.exports = router;

