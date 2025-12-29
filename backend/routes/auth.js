const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const generateToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await db.query(
        'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email',
        [email.toLowerCase(), hashedPassword, name]
    );
    const token = generateToken(result.rows[0].id);
    res.json({ success: true, token, user: result.rows[0] });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!result.rows[0] || !await bcrypt.compare(password, result.rows[0].password_hash)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = generateToken(result.rows[0].id);
    res.json({ success: true, token, user: { id: result.rows[0].id, email: result.rows[0].email, isAdmin: result.rows[0].is_admin }});
});

module.exports = router;
