// api/oauth/google.js
// Vercel serverless function for Google OAuth redirect

const { google } = require('googleapis');

module.exports = async (req, res) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed',
      message: 'Only GET requests are allowed'
    });
  }

  try {
    console.log('🔵 Google OAuth route called');
    console.log('🔵 Environment check:', {
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasRedirectUri: !!process.env.GOOGLE_REDIRECT_URI
    });

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      console.error('❌ Missing OAuth credentials');
      return res.status(500).json({
        success: false,
        error: 'OAuth Error',
        message: 'Google OAuth credentials not configured'
      });
    }

    // Initialize OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Generate OAuth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
      prompt: 'consent'
    });

    console.log('✅ OAuth URL generated, redirecting to Google');
    res.redirect(authUrl);
  } catch (error) {
    console.error('❌ OAuth URL generation error:', error);
    res.status(500).json({
      success: false,
      error: 'OAuth Error',
      message: error.message || 'Failed to generate authorization URL'
    });
  }
};







