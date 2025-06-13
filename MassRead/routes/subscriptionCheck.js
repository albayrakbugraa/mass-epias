const express = require('express');
const router = express.Router();
const authenticateApiKey = require('../middlewares/apiKeyAuth');
const { handleSubscriptionCheck } = require('../controllers/subscriptionController');

router.post('/check', authenticateApiKey, handleSubscriptionCheck);

module.exports = router;