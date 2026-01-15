// routes/emails.js
// Email management and Gmail OAuth

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validateEmailSend } = require('../middleware/validation');
const { log, error } = require('../utils/logger');
const {
    getAuthUrl,
    getTokensFromCode,
    getGmailAddress,
    createGmailTransporter,
    sendBatchEmails
} = require('../utils/gmail');

/**
 * POST /api/emails/preview
 * Get email preview for a customer (with fallback logic)
 */
router.post('/preview', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { customerType, language, customerName, countryCode } = req.body;

        if (!customerType || !language) {
            return res.status(400).json({
                success: false,
                error: 'customerType and language are required'
            });
        }

        // Get user info for personalization
        const userInfo = await db.query(
            'SELECT full_name, email, company_name, phone FROM public.users WHERE id = $1',
            [userId]
        );
        const user = userInfo.rows[0] || {};
        
        // Try to find template
        let template = await db.query(
            'SELECT * FROM public.email_templates WHERE user_id = $1 AND customer_type = $2 AND language = $3',
            [userId, customerType.toLowerCase(), language.toLowerCase()]
        );
        
        let is_fallback = false;
        let template_language = language;
        
        // Fallback to default language
        if (template.rows.length === 0) {
            const defaultLang = await db.query('SELECT default_language FROM public.users WHERE id = $1', [userId]);
            const fallbackLang = defaultLang.rows[0]?.default_language || 'en';
            
            template = await db.query(
                'SELECT * FROM public.email_templates WHERE user_id = $1 AND customer_type = $2 AND language = $3',
                [userId, customerType.toLowerCase(), fallbackLang]
            );
            
            is_fallback = true;
            template_language = fallbackLang;
        }
        
        // If still no template, return error
        if (template.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'No template found',
                message: `Missing template for ${customerType}-${language}. Please create one.`
            });
        }
        
        // Replace all variables (BUG 7: Use firstName only for {{name}})
        const firstName = customerName ? customerName.split(' ')[0] : '';
        const replacements = {
            '{{name}}': firstName, // BUG 7: Use firstName only
            '{{firstname}}': firstName,
            '{{fullname}}': customerName || '',
            '{{customer_type}}': customerType || '',
            '{{country}}': countryCode || '',
            '{{your_name}}': user.full_name || '',
            '{{your_email}}': user.email || '',
            '{{your_phone}}': user.phone || '',
            '{{company_name}}': user.company_name || ''
        };
        
        let subject = template.rows[0].subject;
        let body = template.rows[0].body;
        
        for (const [key, value] of Object.entries(replacements)) {
            subject = subject.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
            body = body.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
        }
        
        res.json({ 
            success: true,
            subject, 
            body, 
            is_fallback, 
            template_language 
        });
    } catch (err) {
        error('Email preview error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to generate email preview',
            message: err.message
        });
    }
});

/**
 * GET /api/emails/templates
 * Get email template by type and language (legacy endpoint - use /api/templates instead)
 */
router.get('/templates', async (req, res) => {
    try {
        const { type, language } = req.query;

        if (!type || !language) {
            return res.status(400).json({
                success: false,
                error: 'Type and language required'
            });
        }

        const result = await db.query(
            `SELECT subject, body 
             FROM public.email_templates 
             WHERE customer_type = $1 
               AND language = $2
               AND is_active = true
             LIMIT 1`,
            [type, language]
        );

        if (result.rows.length === 0) {
            // Return default template
            return res.json({
                success: true,
                data: {
                    subject: 'Your doTERRA 25% Discount is Waiting!',
                    body: `Hi {{firstname}},

I'm {{your-name}}, your official doTERRA Wellness Advocate...

Best regards,
{{your-name}}`
                }
            });
        }

        res.json({
            success: true,
            data: {
                subject: result.rows[0].subject,
                body: result.rows[0].body
            }
        });
    } catch (error) {
        error('Get template error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch template'
        });
    }
});

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
        error('Gmail auth error:', error);
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
        error('Gmail callback error:', err);
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
            `INSERT INTO public.gmail_connections (user_id, gmail_email, access_token, refresh_token, token_expires_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id) DO UPDATE SET
                gmail_email = EXCLUDED.gmail_email,
                access_token = EXCLUDED.access_token,
                refresh_token = EXCLUDED.refresh_token,
                token_expires_at = EXCLUDED.token_expires_at,
                updated_at = NOW()`,
            [userId, gmailEmail, tokens.access_token, tokens.refresh_token, tokenExpiry]
        );

        res.json({
            success: true,
            message: 'Gmail connected successfully',
            email: gmailEmail
        });
    } catch (error) {
        error('Connect Gmail error:', err);
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
            'SELECT gmail_email, connected_at FROM public.gmail_connections WHERE user_id = $1',
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
        error('Gmail status error:', err);
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
            'DELETE FROM public.gmail_connections WHERE user_id = $1',
            [userId]
        );

        res.json({
            success: true,
            message: 'Gmail disconnected successfully'
        });
    } catch (error) {
        error('Disconnect Gmail error:', err);
        res.status(500).json({ error: 'Failed to disconnect Gmail' });
    }
});

/**
 * POST /api/emails/send
 * Send emails to selected customers using templates (by type+language)
 */
router.post('/send', validateEmailSend, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { customer_ids, template_type, language, subject, body } = req.body;

        if (!customer_ids || customer_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No customers selected',
                message: 'Please select at least one customer'
            });
        }

        if (!template_type) {
            return res.status(400).json({
                success: false,
                error: 'Template type required',
                message: 'Please specify template type (retail, wholesale, or advocates)'
            });
        }

        // Check Gmail connection
        const gmailResult = await db.query(
            'SELECT * FROM public.gmail_connections WHERE user_id = $1',
            [userId]
        );

        if (gmailResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Gmail not connected',
                message: 'Please connect your Gmail account first'
            });
        }

        const gmailConnection = gmailResult.rows[0];

        // Get customers
        const customersResult = await db.query(
            'SELECT * FROM public.customers WHERE id = ANY($1) AND user_id = $2',
            [customer_ids, userId]
        );

        if (customersResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid customers found',
                message: 'Selected customers not found'
            });
        }

        const customers = customersResult.rows;
        const results = [];
        let successCount = 0;
        let failedCount = 0;

        // Create Gmail transporter (with auto-refresh) - BUG 9: Enhanced error handling
        let transporter, accessToken;
        try {
            const result = await createGmailTransporter(
                gmailConnection.access_token,
                gmailConnection.refresh_token
            );
            transporter = result.transporter;
            accessToken = result.accessToken;

            // Update access token if refreshed
            if (accessToken !== gmailConnection.access_token) {
                await db.query(
                    'UPDATE public.gmail_connections SET access_token = $1, updated_at = NOW() WHERE user_id = $2',
                    [accessToken, userId]
                );
                log(`Access token refreshed for user ${userId}`);
            }
        } catch (gmailError) {
            error('Gmail authentication error:', gmailError);
            return res.status(401).json({
                success: false,
                error: 'Gmail authentication failed',
                message: gmailError.message || 'Gmail token expired. Please reconnect your Gmail account.',
                requiresReconnect: true
            });
        }

        // Get user info for personalization
        const userResult = await db.query(
            'SELECT full_name, email FROM public.users WHERE id = $1',
            [userId]
        );
        const user = userResult.rows[0];

        // Send emails to each customer
        for (const customer of customers) {
            try {
                // Get template by type and language (or use provided subject/body)
                let emailSubject, emailBody;

                if (subject && body) {
                    // Use provided subject and body
                    emailSubject = subject;
                    emailBody = body;
                } else {
                    // Get template from database
                    const customerLanguage = language || customer.language || 'en';
                    const customerType = template_type || customer.customer_type || 'retail';

                    // Map country code to language
                    const languageMap = {
                        'USA': 'en', 'GBR': 'en', 'CAN': 'en', 'AUS': 'en',
                        'ITA': 'it',
                        'DEU': 'de', 'AUT': 'de', 'CHE': 'de',
                        'FRA': 'fr', 'BEL': 'fr',
                        'ESP': 'es', 'MEX': 'es', 'ARG': 'es',
                        'POL': 'pl', 'BGR': 'bg', 'CZE': 'cs', 'ROU': 'ro', 'SVK': 'sk'
                    };
                    const mappedLang = languageMap[customer.country_code] || customerLanguage || 'en';
                    
                    // Get global template (no user_id required)
                    const templateResult = await db.query(
                        `SELECT subject, body 
                         FROM public.email_templates 
                         WHERE customer_type = $1 
                           AND language = $2
                         LIMIT 1`,
                        [customerType, mappedLang]
                    );

                    if (templateResult.rows.length > 0) {
                        emailSubject = templateResult.rows[0].subject;
                        emailBody = templateResult.rows[0].body;
                    } else {
                        // Fallback to default template
                        emailSubject = `Your doTERRA 25% Discount is Waiting!`;
                        emailBody = `Hi {{firstname}},

I'm {{your-name}}, your official doTERRA Wellness Advocate...

Best regards,
{{your-name}}`;
                    }
                }

                // Personalize template with customer data (BUG 7: Use firstName only for {{name}})
                const firstName = customer.full_name ? customer.full_name.split(' ')[0] : '';
                
                // Replace all variable patterns (BUG 7: {{name}} should be firstName only)
                const personalizedSubject = emailSubject
                    .replace(/\{\{name\}\}/g, firstName) // BUG 7: Use firstName only
                    .replace(/\{\{firstname\}\}/g, firstName)
                    .replace(/\{\{fullname\}\}/g, customer.full_name || '')
                    .replace(/\{\{email\}\}/g, customer.email || '')
                    .replace(/\{\{customer_type\}\}/g, customer.customer_type || '')
                    .replace(/\{\{country\}\}/g, customer.country_code || '')
                    .replace(/\{\{your_name\}\}/g, user.full_name || 'Your Advocate')
                    .replace(/\{\{your-name\}\}/g, user.full_name || 'Your Advocate')
                    .replace(/\{\{your_email\}\}/g, user.email || '')
                    .replace(/\{\{your_phone\}\}/g, '')
                    .replace(/\{\{your-phone\}\}/g, '')
                    .replace(/\{\{company_name\}\}/g, ''); // Could be retrieved from user profile

                const personalizedBody = emailBody
                    .replace(/\{\{name\}\}/g, firstName) // BUG 7: Use firstName only
                    .replace(/\{\{firstname\}\}/g, firstName)
                    .replace(/\{\{fullname\}\}/g, customer.full_name || '')
                    .replace(/\{\{email\}\}/g, customer.email || '')
                    .replace(/\{\{customer_type\}\}/g, customer.customer_type || '')
                    .replace(/\{\{country\}\}/g, customer.country_code || '')
                    .replace(/\{\{your_name\}\}/g, user.full_name || 'Your Advocate')
                    .replace(/\{\{your-name\}\}/g, user.full_name || 'Your Advocate')
                    .replace(/\{\{your_email\}\}/g, user.email || '')
                    .replace(/\{\{your_phone\}\}/g, '')
                    .replace(/\{\{your-phone\}\}/g, '')
                    .replace(/\{\{company_name\}\}/g, ''); // Could be retrieved from user profile

                // Send email via Gmail
                const { sendEmail } = require('../utils/gmail');
                const sendResult = await sendEmail(
                    transporter,
                    gmailConnection.gmail_email,
                    customer.email,
                    personalizedSubject,
                    personalizedBody
                );

                const status = sendResult.success ? 'sent' : 'failed';
                const errorMessage = sendResult.error || null;

                // Track in email_sends
                await db.query(
                    `INSERT INTO public.email_sends (user_id, customer_id, message_type, subject_line, email_body, status, sent_at, error_message)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
                    [userId, customer.id, customerType, personalizedSubject, personalizedBody, status, errorMessage]
                );

                // Update customer (BUG 5: Only set last_contacted_at when email is actually sent)
                if (sendResult.success) {
                    await db.query(
                        `UPDATE public.customers 
                         SET last_contacted_at = NOW(), 
                             total_emails_sent = COALESCE(total_emails_sent, 0) + 1
                         WHERE id = $1`,
                        [customer.id]
                    );
                    successCount++;
                } else {
                    // BUG 5: Don't update last_contacted_at if email failed
                    failedCount++;
                }

                results.push({
                    customer_id: customer.id,
                    email: customer.email,
                    success: sendResult.success,
                    error: errorMessage
                });

                // Small delay between emails
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                error(`Error sending email to ${customer.email}:`, error);
                failedCount++;
                results.push({
                    customer_id: customer.id,
                    email: customer.email,
                    success: false,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            message: `Sent ${successCount} emails successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
            data: {
                total: customers.length,
                success: successCount,
                failed: failedCount,
                results
            }
        });
    } catch (error) {
        error('Send emails error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send emails',
            message: error.message
        });
    }
});

/**
 * POST /api/emails/send-batch
 * Send batch emails to selected customers
 */
router.post('/send-batch', validateEmailSend, async (req, res) => {
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
            'SELECT * FROM public.gmail_connections WHERE user_id = $1',
            [userId]
        );

        if (gmailResult.rows.length === 0) {
            return res.status(400).json({ error: 'Gmail not connected' });
        }

        const gmailConnection = gmailResult.rows[0];

        // Check usage limits
        const usageResult = await db.query(
            `SELECT ut.*, u.subscription_tier 
             FROM public.usage_tracking ut
             JOIN public.users u ON u.id = ut.user_id
             WHERE ut.user_id = $1`,
            [userId]
        );

        let emailsSentToday = 0;
        let emailsSentThisHour = 0;
        let subscriptionPlan = 'starter';

        if (usageResult.rows.length > 0) {
            emailsSentToday = usageResult.rows[0].emails_sent_today || 0;
            emailsSentThisHour = usageResult.rows[0].emails_sent_this_hour || 0;
            subscriptionPlan = usageResult.rows[0].subscription_tier || usageResult.rows[0].subscription_plan || 'starter';
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
            'SELECT * FROM public.customers WHERE id = ANY($1) AND user_id = $2',
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
                'UPDATE public.gmail_connections SET access_token = $1, updated_at = NOW() WHERE user_id = $2',
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
                'INSERT INTO public.email_sends (user_id, customer_id, subject, body, status, error_message) VALUES ($1, $2, $3, $4, $5, $6)',
                [userId, result.customer_id, subject, body, status, errorMessage]
            );

            // Update customer email_sent status
            if (result.success) {
                await db.query(
                    'UPDATE public.customers SET last_contacted_at = NOW() WHERE id = $1',
                    [result.customer_id]
                );
            }
        }

        // Update usage tracking
        await db.query(
            `INSERT INTO public.usage_tracking (user_id, emails_sent_today, emails_sent_this_hour, emails_sent_this_month, last_email_sent_at)
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
        error('Send batch error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Failed to send emails', 
            message: error.message 
        });
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
             FROM public.email_sends es
             JOIN public.customers c ON c.id = es.customer_id
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
        error('Email history error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch email history',
            message: error.message
        });
    }
});

/**
 * POST /api/emails/send-bulk
 * Send bulk emails to customers from Follow-Up Machine
 * Accepts array of customer objects (from screenshot extraction)
 */
router.post('/send-bulk', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { customers } = req.body;
        
        if (!customers || customers.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'No customers provided',
                message: 'Please select at least one customer to email'
            });
        }
        
        console.log('[EMAIL] Sending bulk emails to', customers.length, 'customers');
        
        // Check Gmail connection
        const gmailResult = await db.query(
            'SELECT * FROM public.gmail_connections WHERE user_id = $1',
            [userId]
        );
        
        if (gmailResult.rows.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Gmail not connected',
                message: 'Please connect your Gmail account first'
            });
        }
        
        const gmailConnection = gmailResult.rows[0];
        
        // Get user info for personalization
        const userResult = await db.query(
            'SELECT full_name, email FROM public.users WHERE id = $1',
            [userId]
        );
        const user = userResult.rows[0];
        
        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Create Gmail transporter
        let transporter, accessToken;
        try {
            const result = await createGmailTransporter(
                gmailConnection.access_token,
                gmailConnection.refresh_token
            );
            transporter = result.transporter;
            accessToken = result.accessToken;
            
            // Update access token if refreshed
            if (accessToken !== gmailConnection.access_token) {
                await db.query(
                    'UPDATE public.gmail_connections SET access_token = $1, updated_at = NOW() WHERE user_id = $2',
                    [accessToken, userId]
                );
                log(`Access token refreshed for user ${userId}`);
            }
        } catch (gmailError) {
            error('Gmail authentication error:', gmailError);
            return res.status(401).json({
                success: false,
                error: 'Gmail authentication failed',
                message: gmailError.message || 'Gmail token expired. Please reconnect your Gmail account.',
                requiresReconnect: true
            });
        }
        
        let sent = 0;
        let failed = 0;
        const results = [];
        
        // Send emails to each customer
        for (const customer of customers) {
            try {
                // Validate customer has email
                if (!customer.email) {
                    console.log('[EMAIL] Skipping customer without email:', customer.full_name);
                    failed++;
                    results.push({
                        customer: customer.full_name || 'Unknown',
                        email: null,
                        success: false,
                        error: 'No email address'
                    });
                    continue;
                }
                
                // Get or find customer in database
                let dbCustomer;
                const existingCustomer = await db.query(
                    'SELECT id, language FROM public.customers WHERE user_id = $1 AND email = $2',
                    [userId, customer.email.toLowerCase()]
                );
                
                if (existingCustomer.rows.length > 0) {
                    dbCustomer = existingCustomer.rows[0];
                } else {
                    // Create customer record if doesn't exist
                    const newCustomer = await db.query(
                        `INSERT INTO public.customers (user_id, full_name, email, customer_type, country_code, source)
                         VALUES ($1, $2, $3, $4, $5, 'followup_machine')
                         RETURNING id, language`,
                        [
                            userId,
                            customer.full_name,
                            customer.email.toLowerCase(),
                            customer.customer_type || 'retail',
                            customer.country_code || 'USA'
                        ]
                    );
                    dbCustomer = newCustomer.rows[0];
                }
                
                // Get appropriate template
                const customerType = customer.customer_type || 'retail';
                const customerLanguage = dbCustomer.language || customer.language || 'en';
                
                const templateResult = await db.query(
                    `SELECT subject, body FROM public.email_templates 
                     WHERE user_id = $1 AND customer_type = $2 AND language = $3 
                     ORDER BY created_at DESC LIMIT 1`,
                    [userId, customerType.toLowerCase(), customerLanguage.toLowerCase()]
                );
                
                let subject, body;
                
                if (templateResult.rows.length > 0) {
                    subject = templateResult.rows[0].subject;
                    body = templateResult.rows[0].body;
                } else {
                    // Default template
                    const firstName = customer.full_name ? customer.full_name.split(' ')[0] : 'there';
                    subject = `Follow-up from ${user.full_name}`;
                    body = `Hi ${firstName},\n\nI wanted to follow up with you regarding your doTERRA membership.\n\nBest regards,\n${user.full_name}`;
                }
                
                // Replace variables
                const firstName = customer.full_name ? customer.full_name.split(' ')[0] : 'there';
                subject = subject.replace(/\{\{name\}\}/g, firstName)
                                .replace(/\{\{firstname\}\}/g, firstName)
                                .replace(/\{\{fullname\}\}/g, customer.full_name || '')
                                .replace(/\{\{customer_type\}\}/g, customerType)
                                .replace(/\{\{country\}\}/g, customer.country_code || '')
                                .replace(/\{\{your_name\}\}/g, user.full_name || '')
                                .replace(/\{\{your-name\}\}/g, user.full_name || '');
                
                body = body.replace(/\{\{name\}\}/g, firstName)
                           .replace(/\{\{firstname\}\}/g, firstName)
                           .replace(/\{\{fullname\}\}/g, customer.full_name || '')
                           .replace(/\{\{customer_type\}\}/g, customerType)
                           .replace(/\{\{country\}\}/g, customer.country_code || '')
                           .replace(/\{\{your_name\}\}/g, user.full_name || '')
                           .replace(/\{\{your-name\}\}/g, user.full_name || '');
                
                // Send email via Gmail
                const { sendEmail } = require('../utils/gmail');
                const sendResult = await sendEmail(
                    transporter,
                    gmailConnection.gmail_email,
                    customer.email,
                    subject,
                    body
                );
                
                if (sendResult.success) {
                    // Log success
                    await db.query(
                        `INSERT INTO public.email_sends (user_id, customer_id, message_type, subject_line, email_body, status, sent_at)
                         VALUES ($1, $2, $3, $4, $5, 'sent', NOW())`,
                        [userId, dbCustomer.id, customerType, subject, body]
                    );
                    
                    // Update customer
                    await db.query(
                        `UPDATE public.customers 
                         SET last_contacted_at = NOW(), 
                             total_emails_sent = COALESCE(total_emails_sent, 0) + 1
                         WHERE id = $1`,
                        [dbCustomer.id]
                    );
                    
                    sent++;
                    console.log('[EMAIL] Sent to:', customer.email);
                } else {
                    throw new Error(sendResult.error || 'Failed to send email');
                }
                
                results.push({
                    customer: customer.full_name || 'Unknown',
                    email: customer.email,
                    success: true
                });
                
                // Small delay between emails
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (emailError) {
                console.error('[EMAIL] Failed to send to:', customer.email, emailError);
                failed++;
                results.push({
                    customer: customer.full_name || 'Unknown',
                    email: customer.email,
                    success: false,
                    error: emailError.message
                });
            }
        }
        
        console.log('[EMAIL] Bulk send complete. Sent:', sent, 'Failed:', failed);
        
        res.json({
            success: true,
            message: `Sent ${sent} emails successfully${failed > 0 ? `, ${failed} failed` : ''}`,
            sent,
            failed,
            results
        });
        
    } catch (error) {
        console.error('[EMAIL] Bulk send error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to send emails', 
            message: error.message 
        });
    }
});

module.exports = router;
