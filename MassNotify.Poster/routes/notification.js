const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.put('/webhook', notificationController.updateWebhookUrl);

module.exports = router;
