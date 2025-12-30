// utils/gmail.js
// Gmail OAuth and email sending utilities

const { google } = require('googleapis');
const nodemailer = require('nodemailer');

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

/**
 * Generate Gmail OAuth URL
 */
function getAuthUrl() {
    const scopes = [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email'
    ];

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent' // Force consent to get refresh token
    });
}

/**
 * Exchange authorization code for tokens
 */
async function getTokensFromCode(code) {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        return tokens;
    } catch (error) {
        console.error('Error getting tokens:', error);
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
    } catch (error) {
        console.error('Error getting Gmail address:', error);
        throw new Error('Failed to get Gmail address');
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
    } catch (error) {
        console.error('Error refreshing token:', error);
        throw new Error('Failed to refresh access token');
    }
}

/**
 * Create Gmail transporter for nodemailer
 */
async function createGmailTransporter(accessToken, refreshToken) {
    try {
        // Check if token is expired and refresh if needed
        oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken
        });

        // Check expiry
        const tokenInfo = await oauth2Client.getAccessToken();
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: 'me',
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                refreshToken: refreshToken,
                accessToken: tokenInfo.token
            }
        });

        return {
            transporter,
            accessToken: tokenInfo.token
        };
    } catch (error) {
        console.error('Error creating transporter:', error);
        throw new Error('Failed to create email transporter');
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
        
        console.log(`Email sent to ${toEmail}:`, result.messageId);
        
        return {
            success: true,
            messageId: result.messageId
        };
    } catch (error) {
        console.error(`Failed to send email to ${toEmail}:`, error);
        
        return {
            success: false,
            error: error.message
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
    refreshAccessToken,
    createGmailTransporter,
    sendEmail,
    sendBatchEmails
};
