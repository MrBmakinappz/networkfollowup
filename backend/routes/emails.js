// routes/emails.js
// Email management and Gmail OAuth

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const {
    getAuthUrl,
    getTokensFromCode,
    getGmailAddress,
    createGmailTransporter,
    sendBatchEmails
} = require('../utils/gmail');

/**
 * GET /api/emails/gmail-auth
 * Start Gmail OAuth flow
 */
router.get('/gmail-auth', (req, res) => {
    try {
        const authUrl = getAuthUrl();
        
        res.json({
            success: true,
            authUrl: authUrl
        });
    } catch (error) {
        console.error('Gmail auth error:', error);
        res.status(500).json({ error: 'Failed to generate authorization URL' });
    }
});

/**
 * GET /api/emails/gmail-callback
 * Gmail OAuth callback
 */
router.get('/gmail-callback', async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code) {
            return res.status(400).send('Authorization code missing');
        }

        // Exchange code for tokens
        const tokens = await getTokensFromCode(code);
        
        // Get Gmail address
        const gmailEmail = await getGmailAddress(tokens.access_token);

        // Extract user ID from state (if you passed it in auth URL)
        // For now, we'll need the user to be logged in
        // In production, you'd pass userId in state parameter
        
        // Store in database (simplified - in production handle state properly)
        // This is a placeholder response
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Gmail Connected</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                    }
                    .container {
                        text-align: center;
                        background: white;
                        color: #333;
                        padding: 40px;
                        border-radius: 20px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
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
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        padding: 12px 32px;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="success-icon">✓</div>
                    <h1>Gmail Connected Successfully!</h1>
                    <p>Your Gmail account <strong>${gmailEmail}</strong> has been connected.</p>
                    <p>You can now close this window and return to the app.</p>
                    <button onclick="window.close()">Close Window</button>
                </div>
                <script>
                    // Store tokens in parent window
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'gmail-connected',
                            email: '${gmailEmail}',
                            tokens: ${JSON.stringify(tokens)}
                        }, '*');
                        setTimeout(() => window.close(), 3000);
                    }
                </script>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Gmail callback error:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1 style="color: #EF4444;">Connection Failed</h1>
                <p>${error.message}</p>
                <button onclick="window.close()">Close</button>
            </body>
            </html>
        `);
    }
});

/**
 * POST /api/emails/connect-gmail
 * Save Gmail tokens for user
 */
router.post('/connect-gmail', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { tokens, gmailEmail } = req.body;

        if (!tokens || !tokens.access_token || !tokens.refresh_token) {
            return res.status(400).json({ error: 'Invalid tokens' });
        }

        const tokenExpiry = new Date(Date.now() + (tokens.expiry_date || 3600 * 1000));

        await db.query(
            `INSERT INTO gmail_connections (user_id, gmail_email, access_token, refresh_token, token_expiry)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id) DO UPDATE SET
                gmail_email = EXCLUDED.gmail_email,
                access_token = EXCLUDED.access_token,
                refresh_token = EXCLUDED.refresh_token,
                token_expiry = EXCLUDED.token_expiry,
                updated_at = NOW()`,
            [userId, gmailEmail, tokens.access_token, tokens.refresh_token, tokenExpiry]
        );

        res.json({
            success: true,
            message: 'Gmail connected successfully',
            email: gmailEmail
        });
    } catch (error) {
        console.error('Connect Gmail error:', error);
        res.status(500).json({ error: 'Failed to connect Gmail' });
    }
});

/**
 * GET /api/emails/gmail-status
 * Check if Gmail is connected
 */
router.get('/gmail-status', async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await db.query(
            'SELECT gmail_email, connected_at FROM gmail_connections WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                connected: false
            });
        }

        res.json({
            success: true,
            connected: true,
            email: result.rows[0].gmail_email,
            connectedAt: result.rows[0].connected_at
        });
    } catch (error) {
        console.error('Gmail status error:', error);
        res.status(500).json({ error: 'Failed to check Gmail status' });
    }
});

/**
 * DELETE /api/emails/disconnect-gmail
 * Disconnect Gmail
 */
router.delete('/disconnect-gmail', async (req, res) => {
    try {
        const userId = req.user.userId;

        await db.query(
            'DELETE FROM gmail_connections WHERE user_id = $1',
            [userId]
        );

        res.json({
            success: true,
            message: 'Gmail disconnected successfully'
        });
    } catch (error) {
        console.error('Disconnect Gmail error:', error);
        res.status(500).json({ error: 'Failed to disconnect Gmail' });
    }
});

/**
 * POST /api/emails/send-batch
 * Send batch emails to selected customers
 */
router.post('/send-batch', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { customer_ids, subject, body, template_type } = req.body;

        if (!customer_ids || customer_ids.length === 0) {
            return res.status(400).json({ error: 'No customers selected' });
        }

        if (!subject || !body) {
            return res.status(400).json({ error: 'Subject and body required' });
        }

        // Check Gmail connection
        const gmailResult = await db.query(
            'SELECT * FROM gmail_connections WHERE user_id = $1',
            [userId]
        );

        if (gmailResult.rows.length === 0) {
            return res.status(400).json({ error: 'Gmail not connected' });
        }

        const gmailConnection = gmailResult.rows[0];

        // Check usage limits
        const usageResult = await db.query(
            `SELECT ut.*, u.subscription_plan 
             FROM usage_tracking ut
             JOIN users u ON u.id = ut.user_id
             WHERE ut.user_id = $1`,
            [userId]
        );

        let emailsSentToday = 0;
        let emailsSentThisHour = 0;
        let subscriptionPlan = 'free';

        if (usageResult.rows.length > 0) {
            emailsSentToday = usageResult.rows[0].emails_sent_today || 0;
            emailsSentThisHour = usageResult.rows[0].emails_sent_this_hour || 0;
            subscriptionPlan = usageResult.rows[0].subscription_plan || 'free';
        }

        // Check limits
        const limits = {
            free: { daily: 10, hourly: 5 },
            pro: { daily: 500, hourly: 100 },
            enterprise: { daily: 999999, hourly: 999999 }
        };

        const planLimits = limits[subscriptionPlan];

        if (emailsSentToday + customer_ids.length > planLimits.daily) {
            return res.status(429).json({
                error: 'Daily limit reached',
                message: `You have reached your daily email limit (${planLimits.daily}). Upgrade for more emails.`,
                limit: planLimits.daily,
                used: emailsSentToday
            });
        }

        if (emailsSentThisHour + customer_ids.length > planLimits.hourly) {
            return res.status(429).json({
                error: 'Hourly limit reached',
                message: `Please wait before sending more emails. Hourly limit: ${planLimits.hourly}`,
                limit: planLimits.hourly,
                used: emailsSentThisHour
            });
        }

        // Get customers
        const customersResult = await db.query(
            'SELECT * FROM customers WHERE id = ANY($1) AND user_id = $2',
            [customer_ids, userId]
        );

        if (customersResult.rows.length === 0) {
            return res.status(400).json({ error: 'No valid customers found' });
        }

        // Create Gmail transporter
        const { transporter, accessToken } = await createGmailTransporter(
            gmailConnection.access_token,
            gmailConnection.refresh_token
        );

        // Update access token if refreshed
        if (accessToken !== gmailConnection.access_token) {
            await db.query(
                'UPDATE gmail_connections SET access_token = $1, updated_at = NOW() WHERE user_id = $2',
                [accessToken, userId]
            );
        }

        // Send batch emails
        const sendResults = await sendBatchEmails(
            transporter,
            gmailConnection.gmail_email,
            customersResult.rows,
            subject,
            body,
            {
                hourlyLimit: planLimits.hourly,
                dailyLimit: planLimits.daily,
                delayBetweenEmails: 1000
            }
        );

        // Log each email send
        for (const result of sendResults.results) {
            const status = result.success ? 'sent' : 'failed';
            const errorMessage = result.error || null;

            await db.query(
                'INSERT INTO email_sends (user_id, customer_id, subject, body, status, error_message) VALUES ($1, $2, $3, $4, $5, $6)',
                [userId, result.customer_id, subject, body, status, errorMessage]
            );

            // Update customer email_sent status
            if (result.success) {
                await db.query(
                    'UPDATE customers SET email_sent = TRUE, last_email_sent_at = NOW() WHERE id = $1',
                    [result.customer_id]
                );
            }
        }

        // Update usage tracking
        await db.query(
            `INSERT INTO usage_tracking (user_id, emails_sent_today, emails_sent_this_hour, emails_sent_this_month, last_email_sent_at)
             VALUES ($1, $2, $2, $2, NOW())
             ON CONFLICT (user_id) DO UPDATE SET
                emails_sent_today = usage_tracking.emails_sent_today + $2,
                emails_sent_this_hour = usage_tracking.emails_sent_this_hour + $2,
                emails_sent_this_month = usage_tracking.emails_sent_this_month + $2,
                last_email_sent_at = NOW(),
                updated_at = NOW()`,
            [userId, sendResults.success]
        );

        res.json({
            success: true,
            message: `Sent ${sendResults.success} emails successfully`,
            data: sendResults
        });
    } catch (error) {
        console.error('Send batch error:', error);
        res.status(500).json({ error: 'Failed to send emails', message: error.message });
    }
});

/**
 * GET /api/emails/history
 * Get email sending history
 */
router.get('/history', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { limit = 50, offset = 0 } = req.query;

        const result = await db.query(
            `SELECT es.*, c.full_name, c.email as customer_email
             FROM email_sends es
             JOIN customers c ON c.id = es.customer_id
             WHERE es.user_id = $1
             ORDER BY es.sent_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Email history error:', error);
        res.status(500).json({ error: 'Failed to fetch email history' });
    }
});

module.exports = router;
