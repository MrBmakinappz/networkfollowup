const express = require('express');
const router = express.Router();
router.post('/send', (req, res) => res.json({ message: 'Gmail API coming soon' }));
module.exports = router;
