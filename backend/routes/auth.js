// routes/auth.js
// Authentication routes (signup/login)

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { validateSignup, validateLogin } = require('../middleware/validation');
const { log, error } = require('../utils/logger');

/**
 * POST /api/auth/signup
 * Create new user account
 */
router.post('/signup', validateSignup, async (req, res) => {
    try {
        const { email, password, full_name } = req.body;

        // Check if user exists
        const existingUser = await db.query(
            'SELECT * FROM public.users WHERE email = $1',
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
            `INSERT INTO public.users (email, password_hash, full_name, subscription_tier) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, email, full_name, subscription_tier, created_at`,
            [email.toLowerCase(), hashedPassword, full_name, 'starter']
        );

        const user = result.rows[0];

        // Initialize usage tracking - use public schema
        await db.query(
            `INSERT INTO public.usage_tracking (user_id) VALUES ($1)
             ON CONFLICT (user_id) DO NOTHING`,
            [user.id]
        );

        // Initialize user preferences - use public schema
        await db.query(
            `INSERT INTO public.user_preferences (user_id) VALUES ($1)
             ON CONFLICT (user_id) DO NOTHING`,
            [user.id]
        );

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                subscription_tier: user.subscription_tier || user.subscription_plan || 'starter'
            }
        });
    } catch (err) {
        error('Signup error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Signup failed',
            message: err.message
        });
    }
});

/**
 * POST /api/auth/login
 * Login existing user
 */
router.post('/login', validateLogin, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing credentials',
                message: 'Email and password are required'
            });
        }

        // Find user - use public schema
        const result = await db.query(
            'SELECT * FROM public.users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        const user = result.rows[0];

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                subscription_tier: user.subscription_tier || user.subscription_plan || 'starter'
            }
        });
    } catch (err) {
        error('Login error:', err);
        res.status(500).json({
            success: false,
            error: 'Login failed',
            message: err.message
        });
    }
});

module.exports = router;
