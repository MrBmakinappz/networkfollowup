// api/auth/signup.js
// Vercel serverless function for user signup

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../backend/config/database');

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed',
      message: 'Only POST requests are allowed'
    });
  }

  try {
    const { email, password, full_name } = req.body;

    // Validate input
    if (!email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing fields',
        message: 'Email, password, and full name are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Weak password',
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check if user exists
    const existingUser = await db.query(
      'SELECT id FROM public.users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.query(
      `INSERT INTO public.users (email, password_hash, full_name, subscription_tier, onboarding_completed) 
       VALUES ($1, $2, $3, $4, FALSE) 
       RETURNING id, email, full_name, subscription_tier, onboarding_completed, created_at`,
      [email.toLowerCase(), hashedPassword, full_name, 'starter']
    );

    const user = result.rows[0];

    // Initialize usage tracking
    await db.query(
      `INSERT INTO public.usage_tracking (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [user.id]
    );

    // Initialize user preferences
    await db.query(
      `INSERT INTO public.user_preferences (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Return success
    res.json({
      success: true,
      message: 'Account created successfully',
      token: token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        subscription_tier: user.subscription_tier || 'starter',
        onboarding_completed: user.onboarding_completed || false
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Signup failed',
      message: error.message || 'An error occurred during signup'
    });
  }
};











