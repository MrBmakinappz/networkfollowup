// routes/oauth.js
// Google OAuth authentication routes

const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Google OAuth2 Client
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.FRONTEND_URL}/auth/callback`
);

/**
 * GET /api/oauth/google
 * Initiate Google OAuth flow
 */
router.get('/google', (req, res) => {
    const scopes = [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'openid'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
    });

    res.json({ authUrl });
});

/**
 * POST /api/oauth/google/callback
 * Handle Google OAuth callback
 */
router.post('/google/callback', async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ 
                error: 'Missing authorization code' 
            });
        }

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Get user info
        const oauth2 = google.oauth2({
            auth: oauth2Client,
            version: 'v2'
        });

        const { data } = await oauth2.userinfo.get();

        // Check if user exists
        let user;
        const existingUser = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [data.email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            // User exists - login
            user = existingUser.rows[0];

            // Update google_id if not set
            if (!user.google_id) {
                await db.query(
                    'UPDATE users SET google_id = $1 WHERE id = $2',
                    [data.id, user.id]
                );
            }
        } else {
            // Create new user
            const result = await db.query(
                `INSERT INTO users (email, full_name, google_id, subscription_plan, onboarding_completed) 
                 VALUES ($1, $2, $3, $4, $5) 
                 RETURNING id, email, full_name, subscription_plan, created_at`,
                [
                    data.email.toLowerCase(), 
                    data.name, 
                    data.id, 
                    'free',
                    false
                ]
            );

            user = result.rows[0];

            // Initialize usage tracking
            await db.query(
                `INSERT INTO usage_tracking (user_id) VALUES ($1)
                 ON CONFLICT (user_id) DO NOTHING`,
                [user.id]
            );

            // Initialize user preferences
            await db.query(
                `INSERT INTO user_preferences (user_id) VALUES ($1)
                 ON CONFLICT (user_id) DO NOTHING`,
                [user.id]
            );
        }

        // Generate JWT
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email,
                isAdmin: user.email === process.env.ADMIN_EMAIL
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                subscription_plan: user.subscription_plan,
                is_admin: user.email === process.env.ADMIN_EMAIL
            }
        });

    } catch (error) {
        console.error('Google OAuth error:', error);
        res.status(500).json({ 
            error: 'Authentication failed',
            message: error.message 
        });
    }
});

module.exports = router;
