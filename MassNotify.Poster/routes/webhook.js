const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// PUT /api/v1/notifications/webhook
router.put('/webhook', webhookController.setWebhook);

module.exports = router;
