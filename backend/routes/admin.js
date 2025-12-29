const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
router.get('/stats', authenticateToken, requireAdmin, (req, res) => res.json({ users: 100, revenue: 5000 }));
module.exports = router;
