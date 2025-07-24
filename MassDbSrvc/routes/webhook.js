const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

router.put('/webhook', webhookController.setWebhook);

module.exports = router;
