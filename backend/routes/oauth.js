const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const authMiddleware = require('../middleware/auth');
const db = require('../config/database');

router.get('/google/status', authMiddleware, async (req, res) => {
    try {
        const result = await db.query('SELECT gmail_email FROM gmail_connections WHERE user_id = $1', [req.user.userId]);
        res.json({ connected: result.rows.length > 0, email: result.rows[0]?.gmail_email || null });
    } catch (error) {
        console.error('GMAIL STATUS ERROR:', error);
        res.json({ connected: false });
    }
});

router.get('/google', authMiddleware, (req, res) => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
    
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/userinfo.email'],
        state: req.user.userId,
        prompt: 'consent'
    });
    
    res.json({ authUrl });
});

router.get('/google/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        const userId = state;
        
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
        
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        
        await db.query(`
            INSERT INTO gmail_connections (user_id, access_token, refresh_token, token_expires_at, gmail_email)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_id) DO UPDATE SET access_token = $2, refresh_token = $3, token_expires_at = $4, gmail_email = $5
        `, [userId, tokens.access_token, tokens.refresh_token, Date.now() + 3600000, userInfo.data.email]);
        
        res.redirect(process.env.FRONTEND_URL + '/dashboard.html?gmail=connected');
    } catch (error) {
        console.error('OAUTH ERROR:', error);
        res.redirect(process.env.FRONTEND_URL + '/dashboard.html?gmail=error');
    }
});

module.exports = router;
