// utils/gmail.js
// Gmail OAuth and email sending utilities

const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const { log, error } = require('./logger');

// Validate environment variables
if (!process.env.GOOGLE_CLIENT_ID) {
    error('❌ GOOGLE_CLIENT_ID is not set in environment variables');
}
if (!process.env.GOOGLE_CLIENT_SECRET) {
    error('❌ GOOGLE_CLIENT_SECRET is not set in environment variables');
}
if (!process.env.GOOGLE_REDIRECT_URI) {
    error('❌ GOOGLE_REDIRECT_URI is not set in environment variables');
}

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

log('✅ OAuth2 client initialized');
log('   Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Set ✓' : 'Missing ✗');
log('   Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'Set ✓' : 'Missing ✗');
log('   Redirect URI:', process.env.GOOGLE_REDIRECT_URI || 'Not set ✗');

/**
 * Generate Gmail OAuth URL
 */
function getAuthUrl() {
    try {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
            throw new Error('Google OAuth credentials are not configured. Please check your .env file.');
        }

        const scopes = [
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ];

        log('🔵 Generating OAuth URL with scopes:', scopes);
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent' // Force consent to get refresh token
        });
        
        log('✅ OAuth URL generated successfully');
        return authUrl;
    } catch (err) {
        error('❌ Error generating OAuth URL:', err);
        throw err;
    }
}

/**
 * Exchange authorization code for tokens
 */
async function getTokensFromCode(code) {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        return tokens;
    } catch (err) {
        error('Error getting tokens:', err);
        throw new Error('Failed to exchange authorization code');
    }
}

/**
 * Get user's Gmail address from tokens
 */
async function getGmailAddress(accessToken) {
    try {
        oauth2Client.setCredentials({ access_token: accessToken });
        
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data } = await oauth2.userinfo.get();
        
        return data.email;
    } catch (err) {
        error('Error getting Gmail address:', err);
        throw new Error('Failed to get Gmail address');
    }
}

/**
 * Get full user info from Google OAuth
 */
async function getGoogleUserInfo(accessToken) {
    try {
        oauth2Client.setCredentials({ access_token: accessToken });
        
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data } = await oauth2.userinfo.get();
        
        return {
            email: data.email,
            name: data.name || data.email.split('@')[0],
            picture: data.picture
        };
    } catch (err) {
        error('Error getting Google user info:', err);
        throw new Error('Failed to get user info from Google');
    }
}

/**
 * Refresh access token if expired
 */
async function refreshAccessToken(refreshToken) {
    try {
        oauth2Client.setCredentials({
            refresh_token: refreshToken
        });

        const { credentials } = await oauth2Client.refreshAccessToken();
        return credentials;
    } catch (err) {
        error('Error refreshing token:', err);
        throw new Error('Failed to refresh access token');
    }
}

/**
 * Create Gmail transporter for nodemailer
 */
async function createGmailTransporter(accessToken, refreshToken) {
    try {
        // BUG 9: Enhanced token refresh with proper error handling
        oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken
        });

        let newAccessToken = accessToken;
        
        try {
            // Try to get fresh token (will auto-refresh if expired)
            const tokenInfo = await oauth2Client.getAccessToken();
            newAccessToken = tokenInfo.token || accessToken;
        } catch (tokenError) {
            error('Token refresh error:', tokenError);
            
            // If token refresh fails, try manual refresh
            try {
                const { OAuth2Client } = require('google-auth-library');
                const oauth2ClientManual = new OAuth2Client(
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET,
                    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/emails/gmail-callback'
                );
                
                oauth2ClientManual.setCredentials({
                    refresh_token: refreshToken
                });
                
                const { credentials } = await oauth2ClientManual.refreshAccessToken();
                newAccessToken = credentials.access_token;
                
                log('Token manually refreshed');
            } catch (manualRefreshError) {
                error('Manual token refresh failed:', manualRefreshError);
                throw new Error('Gmail token expired and refresh failed. Please reconnect Gmail.');
            }
        }
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: 'me',
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                refreshToken: refreshToken,
                accessToken: newAccessToken
            }
        });

        // Test connection
        await transporter.verify().catch(err => {
            error('Gmail transporter verification failed:', err);
            throw new Error('Gmail authentication failed. Please reconnect your Gmail account.');
        });

        return {
            transporter,
            accessToken: newAccessToken
        };
    } catch (err) {
        error('Error creating transporter:', err);
        throw new Error(`Failed to create email transporter: ${err.message}`);
    }
}

/**
 * Send email via Gmail
 */
async function sendEmail(transporter, fromEmail, toEmail, subject, body) {
    try {
        const mailOptions = {
            from: fromEmail,
            to: toEmail,
            subject: subject,
            html: body,
            text: body.replace(/<[^>]*>/g, '') // Strip HTML for text version
        };

        const result = await transporter.sendMail(mailOptions);
        
        log(`Email sent to ${toEmail}:`, result.messageId);
        
        return {
            success: true,
            messageId: result.messageId
        };
    } catch (err) {
        error(`Failed to send email to ${toEmail}:`, err);
        
        // BUG 9: Provide specific error messages
        let errorMessage = err.message;
        if (err.response) {
            errorMessage = err.response.body?.error || err.response.text || err.message;
            error('Gmail API error details:', {
                status: err.response.status,
                body: err.response.body,
                text: err.response.text
            });
        }
        
        return {
            success: false,
            error: errorMessage,
            requiresReconnect: err.code === 'EAUTH' || err.message?.includes('token') || err.message?.includes('expired')
        };
    }
}

/**
 * Send batch emails with rate limiting
 */
async function sendBatchEmails(transporter, fromEmail, recipients, subject, bodyTemplate, options = {}) {
    const {
        hourlyLimit = 100,
        dailyLimit = 500,
        delayBetweenEmails = 1000 // 1 second delay
    } = options;

    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        
        // Replace variables in body
        let personalizedBody = bodyTemplate
            .replace(/\{\{firstname\}\}/g, recipient.full_name.split(' ')[0])
            .replace(/\{\{fullname\}\}/g, recipient.full_name)
            .replace(/\{\{email\}\}/g, recipient.email)
            .replace(/\{\{country\}\}/g, recipient.country_code);

        const result = await sendEmail(
            transporter,
            fromEmail,
            recipient.email,
            subject,
            personalizedBody
        );

        results.push({
            customer_id: recipient.id,
            email: recipient.email,
            ...result
        });

        if (result.success) {
            successCount++;
        } else {
            failedCount++;
        }

        // Delay between emails to avoid rate limits
        if (i < recipients.length - 1) {
            await delay(delayBetweenEmails);
        }
    }

    return {
        total: recipients.length,
        success: successCount,
        failed: failedCount,
        results
    };
}

/**
 * Helper: Delay function
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    getAuthUrl,
    getTokensFromCode,
    getGmailAddress,
    getGoogleUserInfo,
    refreshAccessToken,
    createGmailTransporter,
    sendEmail,
    sendBatchEmails
};
