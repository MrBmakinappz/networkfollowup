// api/emails/send.js
// Vercel serverless function for sending emails

const { requireAuth } = require('../_helpers/auth');
const db = require('../../backend/config/database');
const { createGmailTransporter, sendEmail } = require('../../backend/utils/gmail');

async function handler(req, res) {
    try {
        const userId = req.user.userId;
        const { customer_ids, template_type, language, subject, body } = req.body;

        if (!customer_ids || !Array.isArray(customer_ids) || customer_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                message: 'customer_ids array is required'
            });
        }

        // Get user info
        const userResult = await db.query(
            'SELECT id, email, full_name FROM public.users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const user = userResult.rows[0];

        // Get Gmail connection
        const gmailResult = await db.query(
            'SELECT gmail_email, access_token, refresh_token, token_expires_at FROM public.gmail_connections WHERE user_id = $1 AND is_connected = TRUE',
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

        // Create Gmail transporter
        const { transporter } = await createGmailTransporter(
            gmailConnection.access_token,
            gmailConnection.refresh_token
        );

        // Get customers
        const customerResult = await db.query(
            `SELECT id, full_name, email, customer_type, country_code, member_type 
             FROM public.customers 
             WHERE user_id = $1 AND id = ANY($2::uuid[])`,
            [userId, customer_ids]
        );

        if (customerResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Customers not found'
            });
        }

        const customers = customerResult.rows;
        const results = [];
        let successCount = 0;
        let failedCount = 0;

        // Language mapping
        const languageMap = {
            'USA': 'en', 'GBR': 'en', 'CAN': 'en', 'AUS': 'en',
            'ITA': 'it',
            'DEU': 'de', 'AUT': 'de', 'CHE': 'de',
            'FRA': 'fr', 'BEL': 'fr',
            'ESP': 'es', 'MEX': 'es', 'ARG': 'es',
            'POL': 'pl', 'BGR': 'bg', 'CZE': 'cs', 'ROU': 'ro', 'SVK': 'sk'
        };

        for (const customer of customers) {
            try {
                let emailSubject, emailBody;
                let customerType = 'retail'; // Default, will be set below

                if (subject && body) {
                    emailSubject = subject;
                    emailBody = body;
                    customerType = template_type || customer.customer_type || customer.member_type || 'retail';
                } else {
                    const customerLanguage = language || customer.language || 'en';
                    customerType = template_type || customer.customer_type || customer.member_type || 'retail';
                    const mappedLang = languageMap[customer.country_code] || customerLanguage || 'en';

                    // Get template from database
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
                        // Default template
                        emailSubject = `Your doTERRA 25% Discount is Waiting!`;
                        emailBody = `Hi {{firstname}},\n\nI'm {{your-name}}, your official doTERRA Wellness Advocate...\n\nBest regards,\n{{your-name}}`;
                    }
                }

                // Replace placeholders
                const firstName = customer.full_name.split(' ')[0];
                const personalizedSubject = emailSubject
                    .replace(/\{\{firstname\}\}/g, firstName)
                    .replace(/\{\{fullname\}\}/g, customer.full_name)
                    .replace(/\{\{email\}\}/g, customer.email)
                    .replace(/\{\{country\}\}/g, customer.country_code || '')
                    .replace(/\{\{your-name\}\}/g, user.full_name || 'Your Advocate')
                    .replace(/\{\{your-phone\}\}/g, '');

                const personalizedBody = emailBody
                    .replace(/\{\{firstname\}\}/g, firstName)
                    .replace(/\{\{fullname\}\}/g, customer.full_name)
                    .replace(/\{\{email\}\}/g, customer.email)
                    .replace(/\{\{country\}\}/g, customer.country_code || '')
                    .replace(/\{\{your-name\}\}/g, user.full_name || 'Your Advocate')
                    .replace(/\{\{your-phone\}\}/g, '');

                // Send email via Gmail
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

                // Update customer
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
                    failedCount++;
                }

                results.push({
                    customer_id: customer.id,
                    email: customer.email,
                    success: sendResult.success,
                    error: sendResult.error || null
                });
            } catch (error) {
                console.error(`Error sending email to ${customer.email}:`, error);
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
            message: `Sent ${successCount} emails successfully, ${failedCount} failed`,
            data: {
                total: customers.length,
                success: successCount,
                failed: failedCount,
                results: results
            }
        });
    } catch (error) {
        console.error('Send email error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send emails',
            message: error.message
        });
    }
}

module.exports = requireAuth(handler);

